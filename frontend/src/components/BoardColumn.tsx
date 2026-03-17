import React from 'react';
import { BoardColumn as BoardColumnType, Email } from '../types';
import { EmailCard } from './EmailCard';

interface BoardColumnProps {
  column: BoardColumnType;
  onMoveEmail: (emailId: string, category: string, dueDate?: string | null) => void;
}

export function BoardColumn({ column, onMoveEmail }: BoardColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-gray-100 rounded-xl">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 sticky top-0 bg-gray-100 rounded-t-xl z-10">
        <h3 className="text-sm font-semibold text-gray-700">{column.title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {column.emails.length}
        </span>
      </div>

      {/* Email cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[200px] max-h-[calc(100vh-160px)]">
        {column.emails.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400 italic">
            No emails
          </div>
        ) : (
          column.emails.map((email: Email) => (
            <EmailCard
              key={email.id}
              email={email}
              onMove={onMoveEmail}
            />
          ))
        )}
      </div>
    </div>
  );
}
