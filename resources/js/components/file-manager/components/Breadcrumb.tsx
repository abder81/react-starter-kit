// src/components/Breadcrumb.tsx
import React from 'react';
import { ChevronRight, Home, User } from 'lucide-react';
import { Node } from '../types';
import { UserDropdown } from '../UserDropdown';

interface BreadcrumbProps {
  selectedPath: string | null;
  onNavigate: (path: string | null) => void;
}

export function Breadcrumb({ selectedPath, onNavigate }: BreadcrumbProps) {

  const pathParts = (selectedPath ?? '').split('/');
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
      >
        <Home className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Documents</span>
      </button>
      {pathParts.map((part, i) => {
        const isLast = i === pathParts.length - 1;
        const partial = pathParts.slice(0, i + 1).join('/');
        return (
          <div key={i} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => !isLast && onNavigate(partial)}
              className={`px-2 py-1 rounded text-sm transition-colors ${
                isLast
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              disabled={isLast}
            >
              {part}
            </button>
          </div>
        );
      })}
      <div className='fixed right-0 top-0 flex items-center gap-2 flex-wrap p-4'>
        <UserDropdown />  
      </div>
    </div>
  );
}