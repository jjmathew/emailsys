import React, { useState } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import { sendEmail } from '../utils/api';
import toast from 'react-hot-toast';

interface ComposeModalProps {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  threadId?: string;
  title?: string;
}

export function ComposeModal({ onClose, defaultTo = '', defaultSubject = '', defaultBody = '', threadId, title = 'New Message' }: ComposeModalProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [trackFollowUp, setTrackFollowUp] = useState(false);

  const isReplyOrForward = title === 'Reply' || title === 'Reply All' || title === 'Forward';

  async function handleSend() {
    if (!to.trim() || !body.trim()) {
      toast.error('Please fill in the required fields');
      return;
    }
    setSending(true);
    try {
      await sendEmail({ to, subject, body, threadId });
      toast.success('Email sent!');
      onClose();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              {isReplyOrForward && to && (
                <p className="text-sm text-gray-500 mt-0.5">To: {to}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* To / Subject fields for new messages */}
        {!isReplyOrForward && (
          <div className="px-6 py-3 space-y-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16 flex-shrink-0">To</span>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
                placeholder="recipient@example.com"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16 flex-shrink-0">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
                placeholder="Email subject"
              />
            </div>
          </div>
        )}

        {/* Body - dark themed textarea */}
        <div className="px-6 pt-5 pb-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-gray-800 text-gray-300 placeholder-gray-500 rounded-xl px-4 py-4 text-sm focus:outline-none resize-none min-h-[200px]"
            placeholder="Write your message here..."
            autoFocus
          />
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center pb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trackFollowUp}
              onChange={(e) => setTrackFollowUp(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Flag className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Track for Follow-up</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
