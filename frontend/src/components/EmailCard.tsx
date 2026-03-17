import React, { useState } from 'react';
import { Email } from '../types';
import { Avatar } from './Avatar';
import { PriorityBadge, ActionTagBadge } from './PriorityBadge';
import { formatEmailDate, formatDueDate } from '../utils/emailUtils';
import { Lightbulb, Clock, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { EmailDetailModal } from './EmailDetailModal';

interface EmailCardProps {
  email: Email;
  onMove: (emailId: string, category: string, dueDate?: string | null) => void;
}

export function EmailCard({ email, onMove }: EmailCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [followUpLaterPending, setFollowUpLaterPending] = useState(false);
  const [followUpLaterDate, setFollowUpLaterDate] = useState('');

  const analysis = email.analysis;
  const dueDate = analysis?.dueDate ? formatDueDate(analysis.dueDate) : null;
  const timeReceived = formatEmailDate(email.date);

  const categories = [
    'Inbox',
    'Follow Up Today',
    'Follow Up Tomorrow',
    'Follow Up Later',
    'FYI',
    'Waiting for Follow-up',
  ];

  function dueDateForCategory(cat: string): string | null {
    if (cat === 'Follow Up Today') {
      const d = new Date();
      d.setHours(23, 59, 0, 0);
      return d.toISOString();
    }
    if (cat === 'Follow Up Tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 0, 0);
      return d.toISOString();
    }
    return null;
  }

  function handleMoveClick(cat: string) {
    if (cat === 'Follow Up Later') {
      setFollowUpLaterPending(true);
      return;
    }
    onMove(email.id, cat, dueDateForCategory(cat));
    setShowMoveMenu(false);
  }

  function confirmFollowUpLater() {
    const iso = followUpLaterDate ? new Date(followUpLaterDate + 'T23:59:00').toISOString() : null;
    onMove(email.id, 'Follow Up Later', iso);
    setFollowUpLaterPending(false);
    setFollowUpLaterDate('');
    setShowMoveMenu(false);
  }

  return (
    <>
      <div
        className={`bg-white rounded-lg border ${
          analysis?.priority === 'High' ? 'border-orange-300' : 'border-gray-200'
        } shadow-sm hover:shadow-md transition-shadow cursor-pointer relative`}
        onClick={() => setShowDetail(true)}
      >
        {/* Card header */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Avatar name={email.fromName || email.fromEmail} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-gray-800 truncate">
                  {email.fromName || email.fromEmail}
                </div>
                <div className="text-xs text-brand-600 font-medium truncate mt-0.5">
                  {email.subject}
                </div>
              </div>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5 rounded hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Move menu */}
          {showMoveMenu && (
            <div
              className="absolute right-2 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Move to
              </div>
              {!followUpLaterPending ? (
                categories.map((cat) => (
                  <button
                    key={cat}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    onClick={(e) => { e.stopPropagation(); handleMoveClick(cat); }}
                  >
                    {cat}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <div className="text-xs text-gray-600 font-medium">Set due date for Follow Up Later</div>
                  <input
                    type="date"
                    value={followUpLaterDate}
                    onChange={(e) => setFollowUpLaterDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={confirmFollowUpLater}
                      className="flex-1 px-2 py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
                    >
                      Move
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFollowUpLaterPending(false); setFollowUpLaterDate(''); }}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Suggestion */}
          {analysis?.suggestion && (
            <div className="mt-2 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Suggestion: </span>
                {analysis.suggestion}
              </p>
            </div>
          )}

          {/* Email preview */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {email.snippet}
            </p>
            {email.snippet && email.snippet.length > 100 && (
              <button
                className="text-xs text-brand-500 hover:text-brand-700 mt-1 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <span className="flex items-center gap-0.5">
                    Show Less <ChevronUp className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5">
                    Show More... <ChevronDown className="w-3 h-3" />
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Due date */}
          {dueDate && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Due: {dueDate}</span>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="px-3 pb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {analysis?.priority && <PriorityBadge priority={analysis.priority} />}
            {analysis?.actionTag && <ActionTagBadge tag={analysis.actionTag} />}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeReceived}</span>
        </div>
      </div>

      {showDetail && (
        <EmailDetailModal
          email={email}
          onClose={() => setShowDetail(false)}
          onMove={onMove}
        />
      )}
    </>
  );
}
