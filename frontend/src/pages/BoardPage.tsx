import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { useEmails } from '../hooks/useEmails';
import { BoardColumn } from '../components/BoardColumn';
import { Sidebar } from '../components/Sidebar';
import { ComposeModal } from '../components/ComposeModal';
import { Mail, Filter, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BoardPageProps {
  user: User;
  onLogout: () => void;
}

export function BoardPage({ user, onLogout }: BoardPageProps) {
  const { columns, loading, error, loadEmails, moveEmail } = useEmails();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    loadEmails(30);
  }, [loadEmails]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredColumns = columns.map((col) => ({
    ...col,
    emails: filterText
      ? col.emails.filter(
          (e) =>
            e.subject.toLowerCase().includes(filterText.toLowerCase()) ||
            e.fromName.toLowerCase().includes(filterText.toLowerCase()) ||
            e.fromEmail.toLowerCase().includes(filterText.toLowerCase()) ||
            e.snippet.toLowerCase().includes(filterText.toLowerCase())
        )
      : col.emails,
  }));

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

        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {filteredColumns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                onMoveEmail={moveEmail}
              />
            ))}
          </div>
        </div>
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </div>
  );
}
