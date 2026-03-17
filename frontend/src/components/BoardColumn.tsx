import React, { useState } from 'react';
import { BoardColumn as BoardColumnType, Email } from '../types';
import { EmailCard } from './EmailCard';

interface BoardColumnProps {
  column: BoardColumnType;
  onMoveEmail: (emailId: string, category: string, dueDate?: string | null) => void;
  onRemoveEmail: (emailId: string) => void;
}

export function BoardColumn({ column, onMoveEmail, onRemoveEmail }: BoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the column entirely (not a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const emailId = e.dataTransfer.getData('emailId');
    if (emailId) {
      onMoveEmail(emailId, column.id);
    }
  }

  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${
        isDragOver ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-gray-100'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 sticky top-0 rounded-t-xl z-10 transition-colors ${
        isDragOver ? 'bg-brand-100' : 'bg-gray-100'
      }`}>
        <h3 className="text-sm font-semibold text-gray-700">{column.title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {column.emails.length}
        </span>
      </div>

      {/* Email cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[200px] max-h-[calc(100vh-160px)]">
        {column.emails.length === 0 ? (
          <div className={`flex items-center justify-center h-24 text-xs italic ${
            isDragOver ? 'text-brand-500' : 'text-gray-400'
          }`}>
            {isDragOver ? 'Drop here' : 'No emails'}
          </div>
        ) : (
          column.emails.map((email: Email) => (
            <EmailCard
              key={email.id}
              email={email}
              onMove={onMoveEmail}
              onRemove={onRemoveEmail}
            />
          ))
        )}
      </div>
    </div>
  );
}
