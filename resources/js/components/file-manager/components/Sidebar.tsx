// src/components/Sidebar.tsx
import React, { useCallback } from 'react';
import { Node, updateNodeInHierarchy } from '../types';
import { TreeItem } from './TreeItem';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

interface SidebarProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hierarchy: Node[];
  loading: boolean;
  onUpdateHierarchy: (updater: (hierarchy: Node[]) => Node[]) => void;
}

export function Sidebar({ 
  selectedPath, 
  onSelect, 
  hierarchy, 
  loading,
  onUpdateHierarchy 
}: SidebarProps) {
  const page = usePage<SharedData>();
  const { auth } = page.props;
  const getInitials = useInitials();

  // Function to fetch folder contents and update hierarchy
  const handleLoadChildren = useCallback(async (path: string) => {
    try {
      const response = await fetch(`/folders/contents?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch folder contents');
      }
      
      const data = await response.json();
      const children = data.nodes.map((item: any) => ({
        type: item.type,
        id: item.id,
        name: item.name,
        full_path: item.full_path,
        nodes: item.type === 'folder' ? [] : undefined,
        size: item.size,
        lastModified: item.lastModified,
        folder_path: item.folder_path,
        mime_type: item.mime_type,
        isUserCreated: item.is_user_created,
      }));

      // Update the hierarchy with the loaded children
      onUpdateHierarchy(prev => 
        updateNodeInHierarchy(prev, path, node => ({
          ...node,
          nodes: children,
        }))
      );
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      throw error;
    }
  }, [onUpdateHierarchy]);

  if (loading && hierarchy.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {hierarchy.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Aucun dossier disponible</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {hierarchy.map(node => (
              <TreeItem
                key={node.id}
                node={node}
                path={node.name}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onLoadChildren={handleLoadChildren}
                loading={loading}
              />
            ))}
          </ul>
        )}
      </div>
      
    </div>
  );
}