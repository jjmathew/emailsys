export type EmailCategory =
  | 'Inbox'
  | 'Follow Up Today'
  | 'Follow Up Tomorrow'
  | 'Follow Up Later'
  | 'FYI'
  | 'Waiting for Follow-up';

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

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  fromName: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  isRead: boolean;
  labels: string[];
  analysis: EmailAnalysis | null;
}

export interface BoardColumn {
  id: EmailCategory;
  title: string;
  emails: Email[];
}

export interface User {
  email: string;
  name: string;
  picture: string;
}

export interface ComposeData {
  to: string;
  subject: string;
  body: string;
  replyTo?: Email;
}
