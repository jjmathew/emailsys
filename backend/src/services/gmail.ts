import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback'
  );
}

export function getAuthUrl(oauth2Client: OAuth2Client): string {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export interface EmailMessage {
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
}

function decodeBase64(encoded: string): string {
  const decoded = Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  return decoded;
}

function extractBody(payload: any): string {
  if (!payload) return '';

  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64(part.body.data);
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  }
  return { name: from, email: from };
}

export async function fetchEmails(
  oauth2Client: OAuth2Client,
  maxResults = 50
): Promise<EmailMessage[]> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
  });

  const messages = listResponse.data.messages || [];

  const emailPromises = messages.map(async (msg) => {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const payload = detail.data.payload;
      const headers = payload?.headers || [];
      const from = getHeader(headers, 'From');
      const { name: fromName, email: fromEmail } = parseFromHeader(from);
      const body = extractBody(payload);

      return {
        id: detail.data.id!,
        threadId: detail.data.threadId!,
        subject: getHeader(headers, 'Subject') || '(No Subject)',
        from,
        fromEmail,
        fromName,
        to: getHeader(headers, 'To'),
        date: getHeader(headers, 'Date'),
        snippet: detail.data.snippet || '',
        body: body.substring(0, 2000),
        isRead: !(detail.data.labelIds || []).includes('UNREAD'),
        labels: detail.data.labelIds || [],
      } as EmailMessage;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(emailPromises);
  return results.filter(Boolean) as EmailMessage[];
}

export async function sendEmail(
  oauth2Client: OAuth2Client,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\n');

  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      ...(threadId ? { threadId } : {}),
    },
  });
}

export async function markAsRead(oauth2Client: OAuth2Client, messageId: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
}

export async function archiveEmail(oauth2Client: OAuth2Client, messageId: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['INBOX'] },
  });
}

export async function trashEmail(oauth2Client: OAuth2Client, messageId: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.trash({ userId: 'me', id: messageId });
}

export async function reportSpam(oauth2Client: OAuth2Client, messageId: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] },
  });
}

export async function getUserProfile(oauth2Client: OAuth2Client): Promise<{ email: string; name: string; picture: string }> {
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const response = await oauth2.userinfo.get();
  return {
    email: response.data.email || '',
    name: response.data.name || '',
    picture: response.data.picture || '',
  };
}
