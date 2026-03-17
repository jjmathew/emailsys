import { Email, EmailCategory, BoardColumn } from '../types';

export const BOARD_COLUMNS: { id: EmailCategory; title: string }[] = [
  { id: 'Inbox', title: 'Inbox' },
  { id: 'Follow Up Today', title: 'Follow Up Today' },
  { id: 'Follow Up Tomorrow', title: 'Follow Up Tomorrow' },
  { id: 'Follow Up Later', title: 'Follow Up Later' },
  { id: 'FYI', title: 'FYI' },
  { id: 'Waiting for Follow-up', title: 'Waiting for Follow-up' },
];

export function organizeEmailsIntoColumns(emails: Email[]): BoardColumn[] {
  const columns: BoardColumn[] = BOARD_COLUMNS.map((col) => ({
    ...col,
    emails: [],
  }));

  for (const email of emails) {
    const rawCategory = email.analysis?.category || 'Inbox';
    const category = email.analysis?.actionTag === 'FYI' ? 'FYI' : rawCategory;
    const column = columns.find((c) => c.id === category);
    if (column) {
      column.emails.push(email);
    } else {
      columns[0].emails.push(email);
    }
  }

  return columns;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function formatEmailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
