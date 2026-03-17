import React, { useState } from 'react';
import { Email } from '../types';
import { formatEmailDate, formatDueDate, getInitials, getAvatarColor } from '../utils/emailUtils';
import { PriorityBadge } from './PriorityBadge';
import { EmailDetailModal } from './EmailDetailModal';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortKey = 'from' | 'subject' | 'category' | 'dueDate' | 'priority' | 'complexity' | 'date';
type SortDir = 'asc' | 'desc';

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const COMPLEXITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function getComplexity(email: Email): 'High' | 'Medium' | 'Low' {
  const len = (email.body?.length ?? 0);
  if (len > 1500) return 'High';
  if (len > 400) return 'Medium';
  return 'Low';
}

function ComplexityBadge({ complexity }: { complexity: 'High' | 'Medium' | 'Low' }) {
  const styles = {
    High: 'bg-red-50 text-red-600 border-red-200',
    Medium: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    Low: 'bg-green-50 text-green-600 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[complexity]}`}>
      {complexity}
    </span>
  );
}

function CategoryChip({ category }: { category: string }) {
  const styles: Record<string, string> = {
    'Follow Up Today':    'bg-red-50 text-red-600 border-red-200',
    'Follow Up Tomorrow': 'bg-orange-50 text-orange-600 border-orange-200',
    'Follow Up Later':    'bg-yellow-50 text-yellow-700 border-yellow-200',
    'FYI':                'bg-gray-100 text-gray-500 border-gray-200',
    'Waiting for Follow-up': 'bg-blue-50 text-blue-600 border-blue-200',
    'Inbox':              'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  const cls = styles[category] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cls}`}>
      {category}
    </span>
  );
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-brand-500 ml-1 inline" />
    : <ChevronDown className="w-3 h-3 text-brand-500 ml-1 inline" />;
}

interface EmailListViewProps {
  emails: Email[];
  onMove: (emailId: string, category: string, dueDate?: string | null) => void;
  onRemove: (emailId: string) => void;
  onAddEmail: (email: Email) => void;
  fromEmail: string;
}

export function EmailListView({ emails, onMove, onRemove, onAddEmail, fromEmail }: EmailListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'dueDate' ? 'desc' : 'asc');
    }
  }

  const sorted = [...emails].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'from':
        cmp = (a.fromName || a.fromEmail).localeCompare(b.fromName || b.fromEmail);
        break;
      case 'subject':
        cmp = a.subject.localeCompare(b.subject);
        break;
      case 'category': {
        const ac = a.analysis?.category ?? 'Inbox';
        const bc = b.analysis?.category ?? 'Inbox';
        cmp = ac.localeCompare(bc);
        break;
      }
      case 'dueDate': {
        const ad = a.analysis?.dueDate ?? '';
        const bd = b.analysis?.dueDate ?? '';
        if (!ad && !bd) cmp = 0;
        else if (!ad) cmp = 1;
        else if (!bd) cmp = -1;
        else cmp = ad.localeCompare(bd);
        break;
      }
      case 'priority':
        cmp = (PRIORITY_RANK[a.analysis?.priority ?? 'Medium'] ?? 1) -
              (PRIORITY_RANK[b.analysis?.priority ?? 'Medium'] ?? 1);
        break;
      case 'complexity':
        cmp = (COMPLEXITY_RANK[getComplexity(a)] ?? 1) - (COMPLEXITY_RANK[getComplexity(b)] ?? 1);
        break;
      case 'date':
      default:
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function Th({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-800 hover:bg-gray-100 transition-colors ${className}`}
        onClick={() => handleSort(col)}
      >
        {label}
        <SortIcon column={col} sortKey={sortKey} sortDir={sortDir} />
      </th>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <tr>
              {/* Avatar column — not sortable */}
              <th className="w-10 px-3 py-2.5" />
              <Th label="From"       col="from"       className="w-44" />
              <Th label="Category"   col="category"   className="w-44" />
              <Th label="Subject"    col="subject"    className="w-64" />
              <Th label="Due Date"   col="dueDate"    className="w-28" />
              <Th label="Priority"   col="priority"   className="w-24" />
              <Th label="Complexity" col="complexity" className="w-28" />
              <Th label="Date"       col="date"       className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">
                  No emails
                </td>
              </tr>
            )}
            {sorted.map((email) => {
              const category = email.analysis?.category ?? 'Inbox';
              const priority = email.analysis?.priority;
              const dueDate = formatDueDate(email.analysis?.dueDate ?? null);
              const complexity = getComplexity(email);
              const isUnread = !email.isRead;
              const initials = getInitials(email.fromName || email.fromEmail);
              const avatarColor = getAvatarColor(email.fromName || email.fromEmail);

              return (
                <tr
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`group cursor-pointer transition-colors hover:bg-gray-50 hover:shadow-[inset_3px_0_0_0] hover:shadow-brand-400 ${
                    isUnread ? 'bg-white' : 'bg-white'
                  }`}
                >
                  {/* Avatar */}
                  <td className="pl-4 pr-2 py-3">
                    <div className={`w-8 h-8 rounded-full ${avatarColor} text-white text-xs font-semibold flex items-center justify-center flex-shrink-0`}>
                      {initials}
                    </div>
                  </td>

                  {/* From */}
                  <td className="px-3 py-3 max-w-[176px]">
                    <div className={`truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {email.fromName || email.fromEmail}
                    </div>
                    <div className="truncate text-xs text-gray-400">{email.fromEmail}</div>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3">
                    <CategoryChip category={category} />
                  </td>

                  {/* Subject + snippet */}
                  <td className="px-3 py-3 max-w-[256px]">
                    <div className="flex items-baseline gap-2 overflow-hidden">
                      <span className={`truncate shrink-0 max-w-[10rem] ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                        {email.subject}
                      </span>
                      <span className="truncate text-xs text-gray-400 min-w-0">
                        — {email.snippet}
                      </span>
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {dueDate ? (
                      <span className="text-xs text-gray-600">{dueDate}</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-3">
                    {priority ? (
                      <PriorityBadge priority={priority} />
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Complexity */}
                  <td className="px-3 py-3">
                    <ComplexityBadge complexity={complexity} />
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                    {formatEmailDate(email.date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onMove={(emailId, category, dueDate) => {
            onMove(emailId, category, dueDate);
            // Keep modal open but reflect updated data
            setSelectedEmail((prev) =>
              prev?.id === emailId
                ? {
                    ...prev,
                    analysis: prev.analysis
                      ? { ...prev.analysis, category: category as any, dueDate: dueDate !== undefined ? dueDate : prev.analysis.dueDate }
                      : null,
                  }
                : prev
            );
          }}
          onAddEmail={onAddEmail}
          onRemove={(emailId) => {
            onRemove(emailId);
            setSelectedEmail(null);
          }}
          fromEmail={fromEmail}
        />
      )}
    </>
  );
}
