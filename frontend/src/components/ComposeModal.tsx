import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
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

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields');
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
      className="fixed inset-0 bg-black/40 z-50 flex items-end justify-end p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 rounded-t-xl">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col divide-y divide-gray-100">
          <div className="flex items-center px-4 py-2">
            <label className="text-sm text-gray-500 w-14">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 text-sm focus:outline-none"
              placeholder="recipient@example.com"
            />
          </div>
          <div className="flex items-center px-4 py-2">
            <label className="text-sm text-gray-500 w-14">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm focus:outline-none"
              placeholder="Email subject"
            />
          </div>
        </div>

        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 px-4 py-3 text-sm focus:outline-none resize-none min-h-[200px]"
          placeholder="Write your message here..."
          autoFocus
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Discard
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
