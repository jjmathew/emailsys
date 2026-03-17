import React, { useState } from 'react';
import { Email } from '../types';
import { Avatar } from './Avatar';
import { PriorityBadge, ActionTagBadge } from './PriorityBadge';
import { formatEmailDate } from '../utils/emailUtils';
import { X, Send, Lightbulb, Loader2, Reply } from 'lucide-react';
import { generateReply, sendEmail } from '../utils/api';
import toast from 'react-hot-toast';

interface EmailDetailModalProps {
  email: Email;
  onClose: () => void;
  onMove: (emailId: string, category: string, dueDate?: string | null) => void;
}

export function EmailDetailModal({ email, onClose, onMove }: EmailDetailModalProps) {
  const [replyMode, setReplyMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [followUpLaterDate, setFollowUpLaterDate] = useState('');
  const [replyInstructions, setReplyInstructions] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const analysis = email.analysis;

  async function handleGenerateReply() {
    if (!replyInstructions.trim()) return;
    setGenerating(true);
    try {
      const reply = await generateReply(email, replyInstructions);
      setGeneratedReply(reply);
      setReplyBody(reply);
    } catch {
      toast.error('Failed to generate reply');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendReply() {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await sendEmail({
        to: email.fromEmail,
        subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: replyBody,
        threadId: email.threadId,
      });
      toast.success('Reply sent!');
      setReplyMode(false);
      setReplyBody('');
      setGeneratedReply('');
      setReplyInstructions('');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar name={email.fromName || email.fromEmail} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900">
                {email.fromName || email.fromEmail}
              </div>
              <div className="text-sm text-gray-500">{email.fromEmail}</div>
              <div className="text-xs text-gray-400 mt-0.5">{formatEmailDate(email.date)}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject */}
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{email.subject}</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {analysis?.priority && <PriorityBadge priority={analysis.priority} />}
            {analysis?.actionTag && <ActionTagBadge tag={analysis.actionTag} />}
          </div>
        </div>

        {/* AI Suggestion */}
        {analysis?.suggestion && (
          <div className="px-5 py-3 bg-brand-50 border-b border-brand-100">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-brand-700">AI Suggestion: </span>
                <span className="text-sm text-brand-600">{analysis.suggestion}</span>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {email.body || email.snippet}
          </p>
        </div>

        {/* Reply section */}
        {replyMode && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                What would you like to say? (AI will help draft it)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyInstructions}
                  onChange={(e) => setReplyInstructions(e.target.value)}
                  placeholder="e.g., 'Confirm I'll attend' or 'Ask for more details about pricing'"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateReply(); }}
                />
                <button
                  onClick={handleGenerateReply}
                  disabled={generating || !replyInstructions.trim()}
                  className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  Draft
                </button>
              </div>
            </div>

            {(generatedReply || replyBody) && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Reply (edit as needed)
                </label>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setReplyMode(false); setReplyBody(''); setGeneratedReply(''); }}
                    className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyBody.trim()}
                    className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex gap-2">
            <button
              onClick={() => setReplyMode(!replyMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
          </div>

          <div className="flex flex-col items-end gap-2">
            {showDatePicker && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Due date:</span>
                <input
                  type="date"
                  value={followUpLaterDate}
                  onChange={(e) => setFollowUpLaterDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const iso = followUpLaterDate ? new Date(followUpLaterDate + 'T23:59:00').toISOString() : null;
                    onMove(email.id, 'Follow Up Later', iso);
                    onClose();
                  }}
                  className="px-3 py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
                >
                  Move
                </button>
                <button
                  onClick={() => { setShowDatePicker(false); setFollowUpLaterDate(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
            {!showDatePicker && (
              <select
                value={analysis?.category || 'Inbox'}
                onChange={(e) => {
                  const cat = e.target.value;
                  if (cat === 'Follow Up Later') {
                    setShowDatePicker(true);
                    return;
                  }
                  let dueDate: string | null = null;
                  if (cat === 'Follow Up Today') {
                    const d = new Date(); d.setHours(23, 59, 0, 0); dueDate = d.toISOString();
                  } else if (cat === 'Follow Up Tomorrow') {
                    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); dueDate = d.toISOString();
                  }
                  onMove(email.id, cat, dueDate);
                  onClose();
                }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {['Inbox', 'Follow Up Today', 'Follow Up Tomorrow', 'Follow Up Later', 'FYI', 'Waiting for Follow-up'].map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
