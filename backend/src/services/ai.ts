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

Categorization guidelines:
- "Follow Up Today": Urgent emails requiring same-day action
- "Follow Up Tomorrow": Important emails that can wait until tomorrow
- "Follow Up Later": Non-urgent emails needing future follow-up
- "FYI": Informational emails requiring no action
- "Waiting for Follow-up": Emails where you're waiting for someone else's response
- "Inbox": Emails that need initial review/triage

Priority guidelines:
- High: Urgent deadlines, important clients, critical issues
- Medium: Regular work items, moderate importance
- Low: FYI updates, newsletters, low-stakes communications

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
      priority: 'Medium',
      actionTag: 'Needs Response',
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
      priority: 'Medium' as Priority,
      actionTag: 'Needs Response' as ActionTag,
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
