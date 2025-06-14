// src/components/Breadcrumb.tsx
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
    selectedPath: string | null;
    onNavigate: (path: string | null) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ selectedPath, onNavigate }) => {
    const pathParts = selectedPath ? selectedPath.split('/') : [];

    return (
        <nav className="flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <button
                onClick={() => onNavigate(null)}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
                <Home className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Documents</span>
            </button>
            {pathParts.map((part, i) => {
                const isLast = i === pathParts.length - 1;
                const partialPath = pathParts.slice(0, i + 1).join('/');
                return (
                    <div key={i} className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <button
                            onClick={() => !isLast && onNavigate(partialPath)}
                            className={`px-2 py-1 rounded text-sm transition-colors ${
                                isLast
                                    ? 'text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            disabled={isLast}
                            aria-current={isLast ? 'page' : undefined}
                        >
                            {part}
                        </button>
                    </div>
                );
            })}
        </nav>
    );
};