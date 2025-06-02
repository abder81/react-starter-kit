// src/components/Sidebar.tsx
import React from 'react';
import { Node } from '../types';
import { TreeItem } from './TreeItem';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

// Data setup
const docNodes: Node[] = [
  { name: 'Procedure_Qualite_v2.1.pdf', size: '2.4 MB', lastModified: '2024-03-15' },
  { name: 'Manuel_Formation.pdf', size: '1.8 MB', lastModified: '2024-03-10' },
  { name: 'Guide_Utilisateur.pdf', size: '3.2 MB', lastModified: '2024-03-12' },
  { name: 'Politique_Securite.pdf', size: '1.1 MB', lastModified: '2024-03-08' },
];
const confidentialityLevels = ['Interne','Public','Restreint','Confidentiel','Strictement Confidentiel'];
const docTypes = ['Procédure','Charte','Guide','Politique','Enregistrement'];

const makeDocTypeNodes = (): Node[] =>
  docTypes.map(type => ({
    name: type,
    nodes: confidentialityLevels.map(level => ({ name: level, nodes: [...docNodes] })),
  }));
const makeItem = (name: string): Node => ({ name, nodes: makeDocTypeNodes() });
const makeEmptyItem = (name: string): Node => ({
  name,
  nodes: docTypes.map(type => ({
    name: type,
    nodes: confidentialityLevels.map(level => ({ name: level, nodes: [] }))
  }))
});

export const initialHierarchy: Node[] = [
  {
    name: 'Original',
    nodes: [
      { 
        name: 'Pilotage (4)', 
        nodes: [
          makeItem('PSP-01'),
          makeItem('PSP-02'),
          makeItem('PSP-03: Piloter le SMQ et les connaissances'),
          makeItem('PSP-04')
        ] 
      },
      { 
        name: 'Réalisation (6)', 
        nodes: [
          makeItem('PSR-05'),
          makeItem('PSR-06'),
          makeItem('PSR-07'),
          makeItem('PSR-09')
        ] 
      },
      { 
        name: 'Support (7)', 
        nodes: [
          makeItem('PSS-11'),
          makeItem('PSS-13'),
          makeItem('PSS-15'),
          makeItem('PSS-17')
        ] 
      }
    ]
  },
  {
    name: 'Obsolete',
    nodes: [
      { 
        name: 'Pilotage (4)', 
        nodes: [
          makeEmptyItem('PSP-01'),
          makeEmptyItem('PSP-02'),
          makeEmptyItem('PSP-03: Piloter le SMQ et les connaissances'),
          makeEmptyItem('PSP-04')
        ] 
      },
      { 
        name: 'Réalisation (6)', 
        nodes: [
          makeEmptyItem('PSR-05'),
          makeEmptyItem('PSR-06'),
          makeEmptyItem('PSR-07'),
          makeEmptyItem('PSR-09')
        ] 
      },
      { 
        name: 'Support (7)', 
        nodes: [
          makeEmptyItem('PSS-11'),
          makeEmptyItem('PSS-13'),
          makeEmptyItem('PSS-15'),
          makeEmptyItem('PSS-17')
        ] 
      }
    ]
  }
];

export const searchFiles = (
  nodes: Node[],
  searchTerm: string
): Array<{ name: string; fullPath: string }> => {
  const results: Array<{ name: string; fullPath: string }> = [];
  const traverse = (node: Node, path: string) => {
    if (!node.nodes || node.nodes.length === 0) {
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({ name: node.name, fullPath: path });
      }
    } else {
      node.nodes.forEach(child => traverse(child, `${path}/${child.name}`));
    }
  };
  nodes.forEach(node => traverse(node, node.name));
  return results;
};

interface SidebarProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hierarchy: Node[];
}

interface SidebarProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hierarchy: Node[];
}

export function Sidebar({ selectedPath, onSelect, hierarchy }: SidebarProps) {
  const page = usePage<SharedData>();
  const { auth } = page.props;
  const getInitials = useInitials();

  return (    

    <div className="flex flex-col h-full">

      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {hierarchy.map(node => (
            <TreeItem
              key={node.name}
              node={node}
              path={node.name}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </div>
      
      {/* Add user dropdown at the bottom of the sidebar */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 dark:bg-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Avatar className="size-9">
                <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                  {getInitials(auth.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[260px]">
                  {auth.user.name}
                </span>
                {/* <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                  {auth.user.email}
                </span> */}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-66" 
            align="start" 
            side="top"
            sideOffset={8}
          >
            <UserMenuContent user={auth.user} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
