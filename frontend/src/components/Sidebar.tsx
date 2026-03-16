import React from 'react';
import { User } from '../types';
import {
  Inbox,
  Send,
  Clock,
  Archive,
  Trash2,
  AlertOctagon,
  Mail,
  RefreshCw,
  ChevronLeft,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  user: User | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onRefresh: () => void;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCompose: () => void;
}

const navItems = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'waiting', label: 'Waiting for Follow-up', icon: Clock },
  { id: 'archived', label: 'Archived', icon: Archive },
  { id: 'deleted', label: 'Deleted', icon: Trash2 },
  { id: 'spam', label: 'Spam', icon: AlertOctagon },
];

export function Sidebar({
  user,
  activeSection,
  onSectionChange,
  onRefresh,
  loading,
  collapsed,
  onToggleCollapse,
  onCompose,
}: SidebarProps) {
  return (
    <div
      className={`${
        collapsed ? 'w-14' : 'w-[200px]'
      } flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
    >
      {/* Compose button */}
      <div className="p-3">
        <button
          onClick={onCompose}
          className={`${
            collapsed ? 'w-9 h-9 justify-center' : 'w-full px-4 py-2'
          } bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors`}
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Compose'}
        </button>
      </div>

      {/* Refresh */}
      <div className="px-3 pb-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`${
            collapsed ? 'w-9 h-9 justify-center' : 'w-full px-3 py-1.5'
          } flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50`}
        >
          <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
          {!collapsed && 'Refresh Inbox'}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSectionChange(id)}
            className={`${
              collapsed ? 'w-10 h-9 justify-center mx-auto' : 'w-full px-3 py-2'
            } flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
              activeSection === id
                ? 'bg-brand-50 text-brand-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* User profile */}
      {user && !collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">
                {user.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-800 truncate">{user.name}</div>
              <div className="text-xs text-gray-400 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Settings + collapse */}
      <div className={`p-2 border-t border-gray-100 flex ${collapsed ? 'justify-center' : 'justify-between'} items-center`}>
        {!collapsed && (
          <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
