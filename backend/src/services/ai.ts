import Anthropic from '@anthropic-ai/sdk';
import { EmailMessage } from './gmail';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function analyzeEmail(email: EmailMessage, currentDate: string = new Date().toISOString()): Promise<EmailAnalysis> {
  const prompt = `You are an intelligent email assistant. Analyze the following email and provide structured categorization and action recommendations.

Today's date: ${currentDate}

Email Details:
From: ${email.fromName} <${email.fromEmail}>
Subject: ${email.subject}
Date: ${email.date}
Body:
${email.body || email.snippet}

Please analyze this email and respond with a JSON object containing exactly these fields:
{
  "category": one of ["Follow Up Today", "Follow Up Tomorrow", "Follow Up Later", "FYI", "Waiting for Follow-up", "Inbox"],
  "priority": one of ["High", "Medium", "Low"],
  "actionTag": one of ["Needs Response", "FYI", "Delegate", "Schedule", "Archive"],
  "suggestion": "A concise, actionable suggestion (1-2 sentences) for how to handle this email",
  "dueDate": "ISO date string if there's a deadline, or null",
  "reasoning": "Brief explanation of why you categorized it this way"
}

## RULE 1 — PERSONAL EMAIL (highest priority, check first)
If the email is from a real person (personal name, non-system address) and is directly addressed to you (uses your name or "you", conversational tone, one-to-one or small-group), then:
- Priority: NEVER "Low" — must be at least "Medium"
- ActionTag: "Needs Response" unless purely informational with no expectation of reply
- Category: "Follow Up Today", "Follow Up Tomorrow", "Follow Up Later", or "Inbox" — NEVER "FYI"
- Applies even if the subject contains words like "update", "notification", "announcement"

## RULE 2 — TRANSACTIONAL EMAIL (second priority, check before applying FYI)
Transactional emails are automated but personally relevant — they relate to YOUR specific actions or account. These must NEVER be categorized as "FYI". Treat them as "Inbox" with actionTag "Archive" (unless they require action, in which case use "Needs Response" or "Follow Up Today").
Transactional email types:
- Order confirmations, shipping notifications, delivery updates, tracking emails
- Purchase receipts or invoices
- Account security alerts (password changes, new sign-ins, 2FA)
- Appointment confirmations or reminders
- Flight/hotel/travel booking confirmations
- Subscription renewals or billing notifications
- Any email triggered by something YOU specifically did

## Categorization guidelines:
- "Follow Up Today": Urgent emails requiring same-day action
- "Follow Up Tomorrow": Important emails that can wait until tomorrow
- "Follow Up Later": Non-urgent emails needing future follow-up
- "FYI": ONLY for mass/bulk emails with NO personal relevance — newsletters sent to thousands, promotional blasts, generic announcements. NOT for transactional or personal emails.
- "Waiting for Follow-up": Emails where you're waiting for someone else's response
- "Inbox": Emails that need initial review/triage (including transactional emails)

## Priority guidelines:
- High: Urgent deadlines, important people, critical issues, direct questions or requests
- Medium: Regular emails from real people, moderate importance, personal updates from known contacts, transactional emails requiring action
- Low: ONLY for clearly mass-marketing/bulk emails — newsletters, promotional blasts with no personal relevance

## Action tag guidelines:
- "Needs Response": Emails from real people directly addressed to you expecting a reply
- "FYI": ONLY mass newsletters, promotional blasts, generic announcements sent to many people — NOT transactional emails
- "Delegate": Tasks better handled by someone else
- "Schedule": Meeting requests or time-sensitive scheduling
- "Archive": Transactional confirmations/receipts, completed threads — reviewed but no reply needed

## Newsletter / Marketing / Bulk email → ALWAYS classify as "FYI" (unless it's a transactional email from Rule 2)
Any of the following signals is SUFFICIENT on its own to classify as "FYI":
- Subject or body mentions "newsletter", "digest", "weekly update", "monthly update", "unsubscribe", "view in browser", "manage preferences", "opt out"
- Promotional content: sales, discounts, coupons, offers, deals, promo codes, "% off", "limited time"
- Sent by a company/brand to a mailing list (not addressed to you personally by name)
- Library newsletters, community newsletters, school newsletters
- Marketing emails from any brand, app, service, or retailer
- "Curated for you", "picked for you", "recommended for you", "based on your interests" — these are algorithmic marketing, NOT personal
- Course recommendations, product recommendations, feature announcements from a service
- Re-engagement emails ("We miss you", "You haven't visited", "Come back")
- Any email where the sender is a no-reply address or a marketing/newsletter alias

NEVER classify as FYI: order confirmations, shipping updates, security alerts, billing receipts, appointment reminders, password resets (these are Rule 2 transactional).

Respond ONLY with the JSON object, no additional text.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  try {
    const analysis = JSON.parse(content.text);
    return {
      emailId: email.id,
      category: analysis.category,
      priority: analysis.priority,
      actionTag: analysis.actionTag,
      suggestion: analysis.suggestion,
      dueDate: analysis.dueDate,
      reasoning: analysis.reasoning,
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      emailId: email.id,
      category: 'Inbox',
      priority: 'Low',
      actionTag: 'FYI',
      suggestion: 'Review this email and determine the appropriate action.',
      dueDate: null,
      reasoning: 'Default categorization due to parsing error.',
    };
  }
}

/** Local, zero-cost categorizer using Gmail labels + subject/sender heuristics. */
export function categorizeEmailLocally(email: EmailMessage): EmailAnalysis {
  const subject = (email.subject || '').toLowerCase();
  const fromEmail = (email.fromEmail || '').toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const labels: string[] = email.labels || [];

  // Gmail's own tab categorization — most reliable signal
  const isPromotion = labels.includes('CATEGORY_PROMOTIONS');
  const isUpdate    = labels.includes('CATEGORY_UPDATES');
  const isSocial    = labels.includes('CATEGORY_SOCIAL');
  const isForums    = labels.includes('CATEGORY_FORUMS');

  // Bulk/no-reply sender address patterns
  const isNoReply = /no.?reply|noreply|donotreply|do.not.reply|newsletter|marketing|news@|updates@|alerts@|notifications@|info@|digest@|promo@|announce@/i.test(fromEmail);

  // Subject keywords indicating bulk mail
  const isMarketingSubject = /newsletter|digest|unsubscribe|weekly update|monthly update|round.?up|sale|% off|\boff\b|deal|promo|coupon|limited.time|flash.sale|curated|picked.for.you|based.on.your|recommended.for.you|don.t miss|last.chance|today only|new arrivals|shop now|spring|summer|fall|winter|season/i.test(subject);

  // Body/snippet signals
  const isMarketingSnippet = /unsubscribe|manage.*preferences|view.*browser|opt.out|manage.*subscription|update.*preferences/i.test(snippet);

  const reasons: string[] = [];
  if (isPromotion)         reasons.push('Gmail: Promotions tab');
  if (isUpdate)            reasons.push('Gmail: Updates tab');
  if (isSocial)            reasons.push('Gmail: Social tab');
  if (isForums)            reasons.push('Gmail: Forums tab');
  if (isNoReply)           reasons.push('bulk/no-reply sender');
  if (isMarketingSubject)  reasons.push('marketing subject keywords');
  if (isMarketingSnippet)  reasons.push('contains unsubscribe/preference link');

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

export async function analyzeEmailBatch(emails: EmailMessage[]): Promise<EmailAnalysis[]> {
  const currentDate = new Date().toISOString();
  const analyses = await Promise.all(
    emails.map(async (email) => {
      // Always run local heuristics first — free and instant
      const local = categorizeEmailLocally(email);

      // If already identified as FYI locally, skip the AI call entirely
      if (local.category === 'FYI') {
        return local;
      }

      // For non-FYI emails, try AI for richer categorization and suggestions
      try {
        return await analyzeEmail(email, currentDate);
      } catch (err: any) {
        const msg: string = err?.message || String(err);
        // On billing/credit errors log once; other errors log the full message
        if (msg.includes('credit balance') || msg.includes('billing')) {
          console.error(`[ai] API billing error — falling back to heuristics for all remaining emails`);
        } else {
          console.error(`[ai] Failed to analyze email ${email.id} ("${email.subject}"): ${msg}`);
        }
        return local; // heuristic result is still useful
      }
    })
  );
  return analyses;
}

export async function generateReply(
  email: EmailMessage,
  instructions: string
): Promise<string> {
  const prompt = `You are an intelligent email assistant. Generate a professional email reply based on the original email and the user's instructions.

Original Email:
From: ${email.fromName} <${email.fromEmail}>
Subject: ${email.subject}
Body:
${email.body || email.snippet}

User's instructions for the reply: ${instructions}

Write a professional, concise email reply. Start directly with the greeting, do not include subject line or headers. Keep it natural and human-sounding.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  return content.text;
}

export async function summarizeEmail(email: EmailMessage): Promise<string> {
  const prompt = `Summarize this email in 2-3 sentences, focusing on the key information and any required actions:

From: ${email.fromName}
Subject: ${email.subject}
Body: ${email.body || email.snippet}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') return email.snippet;
  return content.text;
}
