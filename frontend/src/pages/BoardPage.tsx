import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { useEmails } from '../hooks/useEmails';
import { BoardColumn } from '../components/BoardColumn';
import { EmailListView } from '../components/EmailListView';
import { Sidebar } from '../components/Sidebar';
import { ComposeModal } from '../components/ComposeModal';
import { Mail, Filter, Loader2, AlertCircle, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface BoardPageProps {
  user: User;
  onLogout: () => void;
}

export function BoardPage({ user, onLogout }: BoardPageProps) {
  const { emails, columns, loading, error, loadEmails, moveEmail, removeEmail, addEmail } = useEmails();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [followUpLaterPending, setFollowUpLaterPending] = useState<string | null>(null);
  const [followUpLaterDate, setFollowUpLaterDate] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  function handleMoveEmail(emailId: string, category: string, dueDate?: string | null) {
    // dueDate explicitly provided — move directly (from card menu or detail modal)
    if (dueDate !== undefined) {
      moveEmail(emailId, category, dueDate);
      return;
    }
    // Auto-set dates for Today/Tomorrow when coming from drag-drop (no dueDate arg)
    if (category === 'Follow Up Today') {
      const d = new Date(); d.setHours(23, 59, 0, 0);
      moveEmail(emailId, category, d.toISOString());
      return;
    }
    if (category === 'Follow Up Tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0);
      moveEmail(emailId, category, d.toISOString());
      return;
    }
    if (category === 'Follow Up Later') {
      setFollowUpLaterPending(emailId);
      return;
    }
    moveEmail(emailId, category, null);
  }

  useEffect(() => {
    loadEmails(30);
  }, [loadEmails]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filterFn = (e: { subject: string; fromName: string; fromEmail: string; snippet: string }) =>
    !filterText ||
    e.subject.toLowerCase().includes(filterText.toLowerCase()) ||
    e.fromName.toLowerCase().includes(filterText.toLowerCase()) ||
    e.fromEmail.toLowerCase().includes(filterText.toLowerCase()) ||
    e.snippet.toLowerCase().includes(filterText.toLowerCase());

  const filteredColumns = columns.map((col) => ({
    ...col,
    emails: col.emails.filter(filterFn),
  }));

  const filteredEmails = emails.filter(filterFn);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        user={user}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onRefresh={() => loadEmails(30)}
        loading={loading}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCompose={() => setShowCompose(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-500" />
            <h1 className="text-base font-bold text-gray-900">Email Assistant</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search/filter */}
            <div className="relative">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter emails..."
                className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>

            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('board')}
                title="Board view"
                className={`flex items-center px-2.5 py-1.5 transition-colors ${
                  viewMode === 'board'
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={`flex items-center px-2.5 py-1.5 transition-colors border-l border-gray-200 ${
                  viewMode === 'list'
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* User menu */}
            <div className="relative group">
              <button className="flex items-center gap-2">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-semibold flex items-center justify-center">
                    {user.name.charAt(0)}
                  </div>
                )}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40 hidden group-hover:block z-10">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-800 truncate">{user.name}</div>
                  <div className="text-xs text-gray-400 truncate">{user.email}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-4 bg-brand-50 border-b border-brand-100 text-brand-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading and analyzing your emails with AI... This may take a moment.
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Board / List */}
        {viewMode === 'board' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-4 h-full" style={{ minWidth: 'max-content' }}>
              {filteredColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onMoveEmail={handleMoveEmail}
                  onRemoveEmail={removeEmail}
                  onAddEmail={addEmail}
                  fromEmail={user.email}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmailListView
            emails={filteredEmails}
            onMove={handleMoveEmail}
            onRemove={removeEmail}
            onAddEmail={addEmail}
            fromEmail={user.email}
          />
        )}
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}

      {/* Follow Up Later date picker modal */}
      {followUpLaterPending && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => { setFollowUpLaterPending(null); setFollowUpLaterDate(''); }}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Set due date</h3>
            <p className="text-xs text-gray-500 mb-3">When should you follow up on this email?</p>
            <input
              type="date"
              value={followUpLaterDate}
              onChange={(e) => setFollowUpLaterDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setFollowUpLaterPending(null); setFollowUpLaterDate(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const iso = followUpLaterDate ? new Date(followUpLaterDate + 'T23:59:00').toISOString() : null;
                  moveEmail(followUpLaterPending!, 'Follow Up Later', iso);
                  setFollowUpLaterPending(null);
                  setFollowUpLaterDate('');
                }}
                className="px-4 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
