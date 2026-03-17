import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'emailsys.db');

// Ensure the data directory exists
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create the metadata table once on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS email_metadata (
    user_id   TEXT NOT NULL,
    email_id  TEXT NOT NULL,
    category  TEXT NOT NULL DEFAULT 'Inbox',
    priority  TEXT,
    due_date  TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, email_id)
  )
`);

// Stores synthetic "sent" emails created when tracking a reply for follow-up.
// These never exist in Gmail so we persist the full content here.
db.exec(`
  CREATE TABLE IF NOT EXISTS synthetic_emails (
    user_id    TEXT NOT NULL,
    email_id   TEXT NOT NULL,
    thread_id  TEXT NOT NULL,
    subject    TEXT NOT NULL,
    to_addr    TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name  TEXT NOT NULL,
    date       TEXT NOT NULL,
    snippet    TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, email_id)
  )
`);

export interface EmailMetadata {
  category: string;
  priority: string | null;
  dueDate: string | null;
}

const getStmt = db.prepare<[string, string]>(
  'SELECT category, priority, due_date FROM email_metadata WHERE user_id = ? AND email_id = ?'
);

const getBulkStmt = db.prepare<[string]>(
  'SELECT email_id, category, priority, due_date FROM email_metadata WHERE user_id = ?'
);

const upsertStmt = db.prepare<[string, string, string, string | null, string | null]>(`
  INSERT INTO email_metadata (user_id, email_id, category, priority, due_date, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT (user_id, email_id) DO UPDATE SET
    category   = excluded.category,
    priority   = excluded.priority,
    due_date   = excluded.due_date,
    updated_at = excluded.updated_at
`);

const deleteStmt = db.prepare<[string, string]>(
  'DELETE FROM email_metadata WHERE user_id = ? AND email_id = ?'
);

export function getEmailMetadata(userId: string, emailId: string): EmailMetadata | null {
  const row = getStmt.get(userId, emailId) as any;
  if (!row) return null;
  return { category: row.category, priority: row.priority, dueDate: row.due_date };
}

/** Returns a map of emailId → metadata for all emails belonging to this user. */
export function getBulkEmailMetadata(userId: string): Map<string, EmailMetadata> {
  const rows = getBulkStmt.all(userId) as any[];
  const map = new Map<string, EmailMetadata>();
  for (const row of rows) {
    map.set(row.email_id, { category: row.category, priority: row.priority, dueDate: row.due_date });
  }
  return map;
}

export function upsertEmailMetadata(
  userId: string,
  emailId: string,
  data: Partial<EmailMetadata>
): void {
  const existing = getEmailMetadata(userId, emailId);
  upsertStmt.run(
    userId,
    emailId,
    data.category ?? existing?.category ?? 'Inbox',
    data.priority !== undefined ? data.priority : (existing?.priority ?? null),
    data.dueDate !== undefined ? data.dueDate : (existing?.dueDate ?? null)
  );
}

export function deleteEmailMetadata(userId: string, emailId: string): void {
  deleteStmt.run(userId, emailId);
}

export interface SyntheticEmailRecord {
  emailId: string;
  threadId: string;
  subject: string;
  toAddr: string;
  fromEmail: string;
  fromName: string;
  date: string;
  snippet: string;
  body: string;
}

const upsertSyntheticStmt = db.prepare<[string, string, string, string, string, string, string, string, string, string]>(`
  INSERT INTO synthetic_emails (user_id, email_id, thread_id, subject, to_addr, from_email, from_name, date, snippet, body, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT (user_id, email_id) DO UPDATE SET
    thread_id  = excluded.thread_id,
    subject    = excluded.subject,
    to_addr    = excluded.to_addr,
    from_email = excluded.from_email,
    from_name  = excluded.from_name,
    date       = excluded.date,
    snippet    = excluded.snippet,
    body       = excluded.body,
    updated_at = excluded.updated_at
`);

const getSyntheticsStmt = db.prepare<[string]>(
  'SELECT email_id, thread_id, subject, to_addr, from_email, from_name, date, snippet, body FROM synthetic_emails WHERE user_id = ?'
);

const deleteSyntheticStmt = db.prepare<[string, string]>(
  'DELETE FROM synthetic_emails WHERE user_id = ? AND email_id = ?'
);

export function upsertSyntheticEmail(userId: string, data: SyntheticEmailRecord): void {
  upsertSyntheticStmt.run(
    userId, data.emailId, data.threadId, data.subject,
    data.toAddr, data.fromEmail, data.fromName, data.date, data.snippet, data.body
  );
}

export function getSyntheticEmails(userId: string): SyntheticEmailRecord[] {
  const rows = getSyntheticsStmt.all(userId) as any[];
  return rows.map((r) => ({
    emailId: r.email_id,
    threadId: r.thread_id,
    subject: r.subject,
    toAddr: r.to_addr,
    fromEmail: r.from_email,
    fromName: r.from_name,
    date: r.date,
    snippet: r.snippet,
    body: r.body,
  }));
}

export function deleteSyntheticEmail(userId: string, emailId: string): void {
  deleteSyntheticStmt.run(userId, emailId);
}
