import React, { useState, useEffect } from 'react';
import { Email } from '../types';
import { PriorityBadge, ActionTagBadge } from './PriorityBadge';
import { formatEmailDate } from '../utils/emailUtils';
import { X, Lightbulb, AlignJustify, Reply, ReplyAll, Forward } from 'lucide-react';
import { ComposeModal } from './ComposeModal';
import { archiveEmail, saveSyntheticEmail } from '../utils/api';
import toast from 'react-hot-toast';

function isHtmlBody(body: string): boolean {
  return /<(html|body|div|span|p|table|br|img|a)\b/i.test(body);
}

function wrapHtmlBody(html: string): string {
  const script = `<script>
    function rh(){
      var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
      window.parent.postMessage({type:'emailResize',height:h},'*');
    }
    function openLinksInNewTab(){
      document.querySelectorAll('a[href]').forEach(function(a){
        a.setAttribute('target','_blank');
        a.setAttribute('rel','noopener noreferrer');
      });
    }
    document.addEventListener('DOMContentLoaded',function(){rh();openLinksInNewTab();});
    window.addEventListener('load',function(){rh();openLinksInNewTab();});
  <\/script>`;
  if (/^<!DOCTYPE|^<html/i.test(html.trim())) {
    if (html.includes('</head>')) return html.replace('</head>', script + '</head>');
    if (html.includes('<body')) return html.replace('<body', script + '\n<body');
    return script + html;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${script}<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#374151;line-height:1.6;padding:16px;margin:0;word-break:break-word;}img{max-width:100%;height:auto;}a{color:#6366f1;}</style></head><body>${html}</body></html>`;
}

type ComposeMode = 'reply' | 'replyAll' | 'forward';

interface EmailDetailModalProps {
  email: Email;
  onClose: () => void;
  onMove: (emailId: string, category: string, dueDate?: string | null) => void;
  onAddEmail: (email: Email) => void;
  onRemove: (emailId: string) => void;
  fromEmail: string;
}

export function EmailDetailModal({ email, onClose, onMove: _onMove, onAddEmail, onRemove, fromEmail }: EmailDetailModalProps) {
  const [iframeHeight, setIframeHeight] = useState(300);
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);

  const analysis = email.analysis;

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'emailResize' && typeof e.data.height === 'number' && e.data.height > 0) {
        setIframeHeight(e.data.height + 32);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function composeProps() {
    const reSubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    const fwdSubject = email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    const forwardBody = `\n\n-------- Forwarded Message --------\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body || email.snippet}`;

    if (composeMode === 'reply') {
      return { title: 'Reply', defaultTo: email.fromEmail, defaultSubject: reSubject, threadId: email.threadId };
    }
    if (composeMode === 'replyAll') {
      const allTo = [email.fromEmail, ...email.to.split(',').map((s) => s.trim())].filter(Boolean).join(', ');
      return { title: 'Reply All', defaultTo: allTo, defaultSubject: reSubject, threadId: email.threadId };
    }
    return { title: 'Forward', defaultTo: '', defaultSubject: fwdSubject, defaultBody: forwardBody };
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{email.subject}</h2>
                {(analysis?.actionTag || analysis?.priority) && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {analysis?.actionTag && <ActionTagBadge tag={analysis.actionTag} />}
                    {analysis?.priority && <PriorityBadge priority={analysis.priority} />}
                  </div>
                )}
                <div className="mt-2 space-y-0.5">
                  <p className="text-sm text-gray-500">From: {email.fromEmail}</p>
                  <p className="text-sm text-gray-500">Date: {formatEmailDate(email.date)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Summary (reasoning used as summary when available) */}
            {analysis?.reasoning && (
              <div className="mx-6 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
                <AlignJustify className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Summary: </span>
                  {analysis.reasoning}
                </p>
              </div>
            )}

            {/* Suggestion */}
            {analysis?.suggestion && (
              <div className="mx-6 mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  <span className="font-bold text-indigo-700">Suggestion: </span>
                  <span className="text-indigo-600">{analysis.suggestion}</span>
                </p>
              </div>
            )}

            {/* Email body */}
            <div className={analysis?.reasoning || analysis?.suggestion ? 'mt-4' : 'mt-0'}>
              {isHtmlBody(email.body) ? (
                <iframe
                  srcDoc={wrapHtmlBody(email.body)}
                  sandbox="allow-same-origin allow-scripts allow-popups"
                  className="w-full border-0 block"
                  style={{ height: `${iframeHeight}px`, minHeight: '200px' }}
                  onLoad={(e) => {
                    try {
                      const doc = e.currentTarget.contentDocument;
                      const h = doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight || 0;
                      if (h > 0) setIframeHeight(h + 32);
                    } catch { /* cross-origin guard */ }
                  }}
                  title="Email content"
                />
              ) : (
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {email.body || email.snippet}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComposeMode('reply')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
              <button
                onClick={() => setComposeMode('replyAll')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ReplyAll className="w-4 h-4" />
                Reply All
              </button>
              <button
                onClick={() => setComposeMode('forward')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Forward className="w-4 h-4" />
                Forward
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {composeMode && (
        <ComposeModal
          onClose={() => setComposeMode(null)}
          onTrackFollowUp={(sent, dueDate) => {
            const id = `sent-${Date.now()}`;
            const sentEmail: Email = {
              id,
              threadId: email.threadId,
              subject: sent.subject,
              from: fromEmail,
              fromEmail,
              fromName: 'Me',
              to: sent.to,
              date: new Date().toISOString(),
              snippet: sent.body.slice(0, 120),
              body: sent.body,
              isRead: true,
              labels: ['SENT'],
              analysis: {
                emailId: id,
                category: 'Waiting for Follow-up',
                priority: 'Medium',
                actionTag: 'Needs Response',
                suggestion: '',
                dueDate: dueDate,
                reasoning: '',
              },
            };
            onAddEmail(sentEmail);
            // Persist the synthetic email so it survives page reloads
            saveSyntheticEmail({
              emailId: id,
              threadId: email.threadId,
              subject: sent.subject,
              toAddr: sent.to,
              fromEmail: fromEmail,
              fromName: 'Me',
              date: sentEmail.date,
              snippet: sentEmail.snippet,
              body: sent.body,
              category: 'Waiting for Follow-up',
              dueDate: dueDate,
            }).catch(() => toast.error('Could not save follow-up tracking'));
            // Archive the original — it's been replied to and tracked
            archiveEmail(email.id)
              .then(() => onRemove(email.id))
              .catch(() => toast.error('Could not archive original email'));
            onClose();
          }}
          {...composeProps()}
        />
      )}
    </>
  );
}
