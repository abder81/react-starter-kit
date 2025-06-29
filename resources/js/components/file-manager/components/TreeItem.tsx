// src/components/TreeItem.tsx
import React, { useState, useEffect, memo } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { Node } from '../types';

// Recursively checks if a node or any descendant matches the target path.
const contains = (
  node: Node,
  target: string,
  currentPath: string
): boolean => {
  if (currentPath === target) return true;
  return !!node.nodes?.some(child =>
    contains(child, target, `${currentPath}/${child.name}`)
  );
};

// Type guard to check if a node is a folder
const isFolder = (node: Node): boolean => node.type === 'folder';

// Check if a folder has any subfolders
const hasSubfolders = (node: Node): boolean => {
  if (!isFolder(node)) return false;
  return node.nodes?.some(child => isFolder(child)) ?? false;
};

interface TreeItemProps {
  node: Node;
  path: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onLoadChildren?: (path: string) => Promise<void>;
  loading?: boolean;
  isAdmin: boolean;
}

export const TreeItem = memo(function TreeItem({
  node,
  path,
  selectedPath,
  onSelect,
  onLoadChildren,
  loading = false,
  isAdmin,
}: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // Only show folder children in the tree
  const folderChildren = isFolder(node) ? node.nodes?.filter(isFolder) ?? [] : [];
  const hasVisibleChildren = folderChildren.length > 0;
  const isSelected = path === selectedPath;
  const hasSubfoldersInNode = hasSubfolders(node);

  // Auto-expand if this node or any descendant is selected
  useEffect(() => {
    if (selectedPath && contains(node, selectedPath, path)) {
      setIsOpen(true);
    }
  }, [selectedPath, node, path]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOpen && onLoadChildren && isFolder(node)) {
      // Load children if not already loaded and we're opening
      if (!node.nodes || node.nodes.length === 0) {
        setIsLoadingChildren(true);
        try {
          await onLoadChildren(path);
        } catch (error) {
          console.error('Failed to load children:', error);
        } finally {
          setIsLoadingChildren(false);
        }
      }
    }
    
    setIsOpen(open => !open);
  };

  const handleSelect = async () => {
    onSelect(path);
    
    if (isFolder(node)) {
      // Load children if not already loaded
      if (onLoadChildren && (!node.nodes || node.nodes.length === 0)) {
        setIsLoadingChildren(true);
        try {
          await onLoadChildren(path);
        } catch (error) {
          console.error('Failed to load children:', error);
        } finally {
          setIsLoadingChildren(false);
        }
      }
      
      if (hasVisibleChildren || (node.nodes && node.nodes.length > 0)) {
        setIsOpen(true);
      }
    }
  };

  // In TreeItem.tsx, modify the getNodeIcon function:
  const getNodeIcon = () => {
    const depth = path.split('/').length;
    
    // For non-admin users, adjust depth calculation since we're skipping level 1
    const adjustedDepth = !isAdmin ? depth + 1 : depth;
    
    switch (adjustedDepth) {
        case 1: // Root level (only for admin)
            return <Folder className="h-4 w-4 text-gray-600" />;
        case 2: // Categories (Pilotage, Réalisation, Support)
            return <Folder className="h-4 w-4 text-blue-600" />;
        case 3: // Processes (PSP-01, etc.)
            return <Folder className="h-4 w-4 text-green-600" />;
        case 4: // Document types
            return <Folder className="h-4 w-4 text-orange-600" />;
        default: // Confidentiality levels
            return <Folder className="h-4 w-4 text-purple-600" />;
    }
  };

  // Check if this is a folder that should show a chevron. folder (interne, public, restreint, confidentiel and strictement confidentiel) won't show a chevron
  const shouldShowChevron = isFolder(node) && !['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'].includes(node.name);

  //const shouldShowChevron = isFolder(node) && node.folder_type !== 'confidentiality';

  return (
    <li className="select-none">
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150 hover:bg-gray-100 cursor-pointer group ${
          isSelected ? 'bg-blue-100 border-l-3 border-blue-500' : ''
        }`}
        onClick={handleSelect}
      >
        {shouldShowChevron && (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
            disabled={isLoadingChildren}
          >
            {isLoadingChildren ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <ChevronRight
                className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-90' : ''
                }`}
              />
            )}
          </button>
        )}

        <div
          className={`flex items-center gap-2 flex-1 min-w-0 ${
            !shouldShowChevron ? 'ml-5' : ''
          }`}
        >
          {getNodeIcon()}
          <span
            className={`truncate text-sm transition-colors ${
              isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'
            }`}
            title={node.name}
          >
            {node.name}
          </span>
        </div>
      </div>

      {isOpen && hasVisibleChildren && (
        <div className="ml-4 mt-1 border-l border-gray-200 pl-2">
          <ul className="space-y-0.5">
            {folderChildren.map(child => (
              <TreeItem
                key={child.id}
                node={child}
                path={`${path}/${child.name}`}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onLoadChildren={onLoadChildren}
                loading={loading}
                isAdmin={isAdmin}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
});