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

## Marketing/bulk signals (ALL required to classify as FYI — transactional emails are exempt even if they share some signals):
- Clearly promotional content (sales, discounts, offers) with no personal message
- Generic or missing greeting with mass-mailing indicators
- Sent to a large undifferentiated audience (newsletter, marketing blast)
- NOT triggered by any specific action you took

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

export async function analyzeEmailBatch(emails: EmailMessage[]): Promise<EmailAnalysis[]> {
  const currentDate = new Date().toISOString();
  const analyses = await Promise.all(
    emails.map((email) => analyzeEmail(email, currentDate).catch(() => ({
      emailId: email.id,
      category: 'Inbox' as EmailCategory,
      priority: 'Low' as Priority,
      actionTag: 'FYI' as ActionTag,
      suggestion: 'Review this email and determine the appropriate action.',
      dueDate: null,
      reasoning: 'Default categorization.',
    })))
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
