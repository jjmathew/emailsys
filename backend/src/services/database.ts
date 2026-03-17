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
