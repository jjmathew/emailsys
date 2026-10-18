import Anthropic from '@anthropic-ai/sdk';
import { EmailMessage } from './gmail';

export type EmailCategory = 'Follow Up Today' | 'Follow Up Tomorrow' | 'Follow Up Later' | 'FYI' | 'Waiting for Follow-up' | 'Inbox';
export type Priority = 'High' | 'Medium' | 'Low';
export type ActionTag = 'Needs Response' | 'FYI' | 'Delegate' | 'Schedule' | 'Archive';

export interface EmailAnalysis {
  emailId: string;
  category: EmailCategory;
  priority: Priority;
  actionTag: ActionTag;
  suggestion: string;
  dueDate: string | null;
  reasoning: string;
}

const ANALYSIS_PROMPT = (email: EmailMessage, currentDate: string) => `You are an intelligent email assistant. Analyze the following email and provide structured categorization.

Today's date: ${currentDate}

From: ${email.fromName} <${email.fromEmail}>
Subject: ${email.subject}
Date: ${email.date}
Body:
${(email.body || email.snippet || '').substring(0, 3000)}

Respond with ONLY a JSON object — no extra text, no markdown fences:
{
  "category": one of ["Follow Up Today", "Follow Up Tomorrow", "Follow Up Later", "FYI", "Waiting for Follow-up", "Inbox"],
  "priority": one of ["High", "Medium", "Low"],
  "actionTag": one of ["Needs Response", "FYI", "Delegate", "Schedule", "Archive"],
  "suggestion": "1-2 sentence actionable suggestion",
  "dueDate": "ISO date string or null",
  "reasoning": "Brief explanation"
}

Rules:
- Personal email from a real person → never FYI, at least Medium priority, actionTag Needs Response
- Transactional email (order/shipping/security/billing) → Inbox, actionTag Archive
- Newsletter / bulk / marketing / promotional → FYI, Low priority
- FYI signals (any one is enough): Gmail Promotions tab, no-reply sender, "unsubscribe" in body, mass mailing, sale/deal/offer subject, "newsletter"/"digest" in subject`;

// ── Ollama ──────────────────────────────────────────────────────────────────

async function analyzeWithOllama(email: EmailMessage, currentDate: string): Promise<EmailAnalysis> {
  const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2';

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: ANALYSIS_PROMPT(email, currentDate) }],
      stream: false,
      format: 'json',
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  const data = await res.json() as any;
  const text: string = data.message?.content || '';
  const parsed = JSON.parse(text);
  return {
    emailId: email.id,
    category: parsed.category,
    priority: parsed.priority,
    actionTag: parsed.actionTag,
    suggestion: parsed.suggestion,
    dueDate: parsed.dueDate ?? null,
    reasoning: parsed.reasoning,
  };
}

// ── Anthropic ───────────────────────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

async function analyzeWithAnthropic(email: EmailMessage, currentDate: string): Promise<EmailAnalysis> {
  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: ANALYSIS_PROMPT(email, currentDate) }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Anthropic response type');

  const parsed = JSON.parse(content.text);
  return {
    emailId: email.id,
    category: parsed.category,
    priority: parsed.priority,
    actionTag: parsed.actionTag,
    suggestion: parsed.suggestion,
    dueDate: parsed.dueDate ?? null,
    reasoning: parsed.reasoning,
  };
}

// ── Local heuristics (zero cost, zero latency) ──────────────────────────────

export function categorizeEmailLocally(email: EmailMessage, contactEmails?: Set<string>): EmailAnalysis {
  const subject   = (email.subject   || '').toLowerCase();
  const fromEmail = (email.fromEmail || '').toLowerCase();
  const snippet   = (email.snippet   || '').toLowerCase();
  // Check first 15KB of body — enough to find unsubscribe links without full parse
  const bodyHead  = (email.body || '').toLowerCase().substring(0, 15000);
  const labels: string[] = email.labels || [];

  // ── 1. Contacts override ────────────────────────────────────────────────────
  if (contactEmails && contactEmails.size > 0 && contactEmails.has(fromEmail)) {
    return {
      emailId: email.id,
      category: 'Inbox',
      priority: 'Medium',
      actionTag: 'Needs Response',
      suggestion: 'Email from one of your contacts — review and respond if needed.',
      dueDate: null,
      reasoning: 'Sender is in your Google Contacts.',
    };
  }

  // ── 2. Important subject override — always Inbox even if bulk signals present ──
  // Catches job offers, interviews, security alerts sent by bulk platforms
  const isImportantSubject = /\bjob offer\b|\bjob opportunity\b|\binterview\b|\boffer letter\b|\bwe.d like to\b|\byou.ve been selected\b|\bsecurity alert\b|\bsign.in\b|\bnew sign.?in\b|\bpassword\b|\binvoice\b|\breceipt\b|\bpayment\b|\bappointment\b|\bconfirmation\b/i.test(subject);
  if (isImportantSubject) {
    return {
      emailId: email.id,
      category: 'Inbox',
      priority: 'Medium',
      actionTag: 'Needs Response',
      suggestion: 'Review this email and determine the appropriate action.',
      dueDate: null,
      reasoning: 'Important subject keyword — kept in Inbox.',
    };
  }

  // ── 3. FYI signals ──────────────────────────────────────────────────────────

  // Gmail label signals
  const isPromotion = labels.includes('CATEGORY_PROMOTIONS');
  const isSocial    = labels.includes('CATEGORY_SOCIAL');
  const isForums    = labels.includes('CATEGORY_FORUMS');

  // Bulk/no-reply sender prefix (before the @)
  const isNoReply = /^(no.?reply|noreply|donotreply|do.not.reply|newsletter|marketing|digest|promo|promotions|announce|news|weekly|daily)@/i.test(fromEmail);

  // Subject patterns — "Weekly" and "Daily" are strong newsletter signals
  const isMarketingSubject = /\bnewsletter\b|\bdigest\b|\bweekly\b|\bdaily\b|monthly (update|digest|roundup)|flash sale|\bpromo code\b|\bcoupon\b|picked just for you|curated for you|recommended for you|\bunsubscribe\b/i.test(subject);

  // Unsubscribe/opt-out links in body — the most reliable newsletter signal.
  // Every newsletter has them; transactional and personal emails don't.
  const hasUnsubscribeInBody    = /unsubscribe|opt.out|manage (your )?preferences|manage (your )?subscription|update (your )?preferences|view (this |in )?(your )?browser/i.test(bodyHead);
  const hasUnsubscribeInSnippet = /unsubscribe|manage.*preferences|view.*browser|opt out of/i.test(snippet);
  const isUnsubscribable = hasUnsubscribeInBody || hasUnsubscribeInSnippet;

  // Google Calendar "no events" notifications — not worth inbox space
  const isCalendarNoise = /google calendar|you have no events/i.test(snippet + ' ' + subject);

  const reasons: string[] = [];
  if (isPromotion)        reasons.push('Gmail: Promotions tab');
  if (isSocial)           reasons.push('Gmail: Social tab');
  if (isForums)           reasons.push('Gmail: Forums tab');
  if (isNoReply)          reasons.push('bulk/no-reply sender');
  if (isMarketingSubject) reasons.push('newsletter/marketing subject');
  if (isUnsubscribable)   reasons.push('contains unsubscribe link');
  if (isCalendarNoise)    reasons.push('Google Calendar noise notification');

  if (reasons.length > 0) {
    return {
      emailId: email.id,
      category: 'FYI',
      priority: 'Low',
      actionTag: 'FYI',
      suggestion: 'Newsletter or marketing email — no action needed.',
      dueDate: null,
      reasoning: `Auto-categorized as FYI (${reasons.join('; ')}).`,
    };
  }

  return {
    emailId: email.id,
    category: 'Inbox',
    priority: 'Medium',
    actionTag: 'Needs Response',
    suggestion: 'Review this email and determine the appropriate action.',
    dueDate: null,
    reasoning: 'No bulk/marketing signals detected — placed in Inbox for review.',
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

const useOllama  = () => Boolean(process.env.OLLAMA_MODEL || process.env.OLLAMA_BASE_URL);
const useAnthropic = () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key');

export async function analyzeEmail(email: EmailMessage, currentDate: string = new Date().toISOString()): Promise<EmailAnalysis> {
  if (useOllama()) {
    return analyzeWithOllama(email, currentDate);
  }
  if (useAnthropic()) {
    return analyzeWithAnthropic(email, currentDate);
  }
  throw new Error('No LLM configured (set OLLAMA_MODEL or ANTHROPIC_API_KEY)');
}

export async function analyzeEmailBatch(emails: EmailMessage[], contactEmails?: Set<string>): Promise<EmailAnalysis[]> {
  const currentDate = new Date().toISOString();
  const provider = useOllama() ? 'ollama' : useAnthropic() ? 'anthropic' : 'heuristics';
  console.log(`[ai] Using provider: ${provider}`);

  let billingErrorLogged = false;

  const analyses = await Promise.all(
    emails.map(async (email) => {
      // Heuristics first — free and catches most newsletters before touching any LLM
      // Contacts are checked here too: contact emails always land in Inbox
      const local = categorizeEmailLocally(email, contactEmails);
      if (local.category === 'FYI') return local;

      // Non-FYI: try LLM for richer analysis
      if (provider === 'heuristics') return local;

      try {
        return await analyzeEmail(email, currentDate);
      } catch (err: any) {
        const msg: string = err?.message || String(err);
        if (msg.includes('credit balance') || msg.includes('billing')) {
          if (!billingErrorLogged) {
            console.error('[ai] Anthropic billing error — falling back to heuristics. Top up credits at console.anthropic.com');
            billingErrorLogged = true;
          }
        } else {
          console.error(`[ai] Failed on "${email.subject}": ${msg}`);
        }
        return local;
      }
    })
  );
  return analyses;
}

export async function generateReply(email: EmailMessage, instructions: string): Promise<string> {
  const prompt = `Generate a professional email reply.

Original email:
From: ${email.fromName} <${email.fromEmail}>
Subject: ${email.subject}
Body: ${email.body || email.snippet}

Instructions: ${instructions}

Write only the reply body, starting with the greeting. No subject line or headers.`;

  if (useOllama()) {
    const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json() as any;
    return data.message?.content || '';
  }

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

export async function summarizeEmail(email: EmailMessage): Promise<string> {
  const prompt = `Summarize this email in 2-3 sentences, focusing on key info and required actions:

From: ${email.fromName}
Subject: ${email.subject}
Body: ${email.body || email.snippet}`;

  if (useOllama()) {
    const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return email.snippet;
    const data = await res.json() as any;
    return data.message?.content || email.snippet;
  }

  const response = await getAnthropicClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });
  const content = response.content[0];
  if (content.type !== 'text') return email.snippet;
  return content.text;
}
