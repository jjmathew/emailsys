import React from 'react';
import { Priority, ActionTag } from '../types';
import { AlertTriangle, Info, BarChart2 } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = {
    High: {
      className: 'bg-red-50 text-red-600 border border-red-200',
      label: 'High Priority',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    Medium: {
      className: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
      label: 'Medium',
      icon: <BarChart2 className="w-3 h-3" />,
    },
    Low: {
      className: 'bg-green-50 text-green-600 border border-green-200',
      label: 'Low',
      icon: <BarChart2 className="w-3 h-3" />,
    },
  };

  const { className, label, icon } = config[priority];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}

interface ActionTagBadgeProps {
  tag: ActionTag;
}

export function ActionTagBadge({ tag }: ActionTagBadgeProps) {
  const config: Record<ActionTag, { className: string }> = {
    'Needs Response': { className: 'bg-purple-50 text-purple-600 border border-purple-200' },
    FYI: { className: 'bg-gray-100 text-gray-500 border border-gray-200' },
    Delegate: { className: 'bg-blue-50 text-blue-600 border border-blue-200' },
    Schedule: { className: 'bg-indigo-50 text-indigo-600 border border-indigo-200' },
    Archive: { className: 'bg-gray-50 text-gray-400 border border-gray-200' },
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config[tag].className}`}>
      {tag === 'FYI' && <Info className="w-3 h-3" />}
      {tag}
    </span>
  );
}
