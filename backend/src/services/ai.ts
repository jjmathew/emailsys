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

## PERSONAL EMAIL RULE (highest priority — check this first)
If the email is from a real person (has a personal name, non-system address) and is directly addressed to you personally (uses your name or "you", is conversational in tone, appears one-to-one or small-group), then:
- Priority must be at LEAST "Medium" — never "Low" for personal emails
- ActionTag should be "Needs Response" unless the content is purely informational with no expectation of reply
- Category should be "Follow Up Today", "Follow Up Tomorrow", "Follow Up Later", or "Inbox" — NOT "FYI"
- This rule applies even if the subject line contains words like "update", "announcement", etc.

## Categorization guidelines:
- "Follow Up Today": Urgent emails requiring same-day action
- "Follow Up Tomorrow": Important emails that can wait until tomorrow
- "Follow Up Later": Non-urgent emails needing future follow-up
- "FYI": Automated/bulk emails requiring no action — newsletters, system notifications, marketing, announcements sent to many people
- "Waiting for Follow-up": Emails where you're waiting for someone else's response
- "Inbox": Emails that need initial review/triage

## Priority guidelines:
- High: Urgent deadlines, important people you have relationships with, critical issues, direct questions or requests
- Medium: Regular emails from real people, moderate importance, personal updates from known contacts
- Low: ONLY for clearly automated/bulk emails — newsletters, system alerts, promotional content

## Action tag guidelines:
- "Needs Response": Emails from real people that are directly addressed to you and expect a reply
- "FYI": Automated notifications, newsletters, mass mailings, promotional content, system alerts
- "Delegate": Tasks better handled by someone else
- "Schedule": Meeting requests or time-sensitive scheduling
- "Archive": Completed threads, receipts, confirmations needing no action

## Marketing/automated email signals (MUST have MULTIPLE of these to classify as FYI/Low):
- Sender is a no-reply address (noreply@, no-reply@, donotreply@) — this alone is sufficient
- Contains "unsubscribe" link AND impersonal/generic greeting
- Bulk sender headers (List-Unsubscribe, Precedence: bulk/list) AND no personal address
- Generic greeting ("Dear Customer", "Hi there") AND mass-mailing indicators
- Clearly promotional content (discounts, sales, offers) with no personal message

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
