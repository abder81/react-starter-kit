// src/components/DataTable.tsx
import React, { useState, useMemo } from 'react';
import { Node } from '../types';
import { FileText, Folder, Eye, Download, Trash2, Archive, Edit2, Printer, Check } from 'lucide-react';

interface DataTableProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  hierarchy: Node[];
  viewMode: 'list' | 'grid';
  onCreateFolder: () => void;
  onDelete: (paths: string[]) => void;
  onRename: (path: string) => void;
  onArchive: (path: string) => void;
  onDownload?: (paths: string[]) => void;
  onPrint?: (paths: string[]) => void;
}

// Helpers
const findNode = (nodes: Node[], target: string, cur = ''): Node | null => {
  for (const n of nodes) {
    const p = cur ? `${cur}/${n.name}` : n.name;
    if (p === target) return n;
    if (n.nodes) {
      const f = findNode(n.nodes, target, p);
      if (f) return f;
    }
  }
  return null;
};

const getAllFiles = (node: Node): Node[] => {
  const files: Node[] = [];
  const traverse = (cur: Node) => {
    if (cur.type === 'file') {
      files.push({
        type: 'file',
        id: cur.id,
        name: cur.name,
        full_path: cur.full_path,
        size: cur.size,
        lastModified: cur.lastModified,
        mime_type: cur.mime_type,
        folder_path: cur.folder_path
      });
    } else if (cur.nodes) {
      cur.nodes.forEach(child => traverse(child));
    }
  };
  traverse(node);
  return files;
};

export default function DataTable({
  selectedPath,
  onSelect,
  hierarchy,
  viewMode,
  onCreateFolder,
  onDelete,
  onRename,
  onArchive,
  onDownload,
  onPrint,
}: DataTableProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Generate rows based on current path
  const { rows, showActions } = useMemo(() => {
    if (!selectedPath) {
      // First-run: show all PS* items under Original
      const original = hierarchy.find(n => n.name === 'Original');
      const rows: Node[] = [];
      original?.nodes?.forEach(category => {
        category.nodes?.forEach(item => {
          rows.push({ 
            ...item, 
            parentPath: `Original/${category.name}`,
            isTopLevel: true
          });
        });
      });
      return { rows, showActions: true };
    }

    const node = findNode(hierarchy, selectedPath);
    if (!node) return { rows: [], showActions: false };
    
    // If node has children (folders), show them with actions enabled
    if (node.nodes && node.nodes.length > 0) {
      const hasSubfolders = node.nodes.some(child => child.type === 'folder');
      if (hasSubfolders) {
        return { 
          rows: node.nodes.filter(child => child.type === 'folder'), 
          showActions: true 
        };
      }
    }
    
    // Otherwise show files
    return { 
      rows: getAllFiles(node), 
      showActions: false 
    };
  }, [selectedPath, hierarchy]);

  // Check if all files are selected
  const allSelected = rows.length > 0 && selectedFiles.length === rows.length && !rows.some(r => r.isTopLevel);
  
  // Toggle all files selection
  const toggleAll = () => {
    if (allSelected) {
      setSelectedFiles([]);
    } else {
      const newSelected = rows
        .filter(row => !row.isTopLevel && row.type === 'file') // Don't select top-level items or folders
        .map(row => row.full_path || `${selectedPath}/${row.name}`);
      setSelectedFiles(newSelected);
    }
  };

  // Toggle single file selection
  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev =>
      prev.includes(filePath)
        ? prev.filter(p => p !== filePath)
        : [...prev, filePath]
    );
  };

  // Bulk actions handlers
  const handleBulkDelete = () => {
    if (selectedFiles.length > 0) {
      onDelete(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const handleBulkDownload = () => {
    if (onDownload && selectedFiles.length > 0) {
      onDownload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const handleBulkPrint = () => {
    if (onPrint && selectedFiles.length > 0) {
      onPrint(selectedFiles);
      setSelectedFiles([]);
    }
  };

  // Handle row click for folders
  const handleRowClick = (item: Node) => {
    if (showActions && item.type === 'folder') {
      const fullPath = item.isTopLevel 
        ? `${item.parentPath}/${item.name}`
        : item.full_path || `${selectedPath}/${item.name}`;
      onSelect(fullPath);
    }
  };

  // Grid view for files only
  if (viewMode === 'grid' && !showActions) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {rows.map((file, i) => (
            <div key={`${file.name}-${i}`} className="group p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-200 bg-white">
              <div className="flex flex-col items-center text-center">
                <FileText className="h-12 w-12 text-red-500 mb-2" />
                <h3 className="text-sm font-medium text-gray-900 truncate w-full" title={file.name}>{file.name}</h3>
                {file.size && <p className="text-xs text-gray-500 mt-1">{file.size}</p>}
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    className="p-1 hover:bg-gray-100 rounded" 
                    onClick={e => {
                      e.stopPropagation();
                      // Handle view action
                    }}
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button 
                    className="p-1 hover:bg-gray-100 rounded" 
                    onClick={e => {
                      e.stopPropagation();
                      onDownload && onDownload([file.full_path || `${selectedPath}/${file.name}`]);
                    }}
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions bar - only show for file listings with selections */}
      {selectedFiles.length > 0 && !showActions && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              {selectedFiles.length} fichier(s) sélectionné(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={handleBulkDownload}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Télécharger"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {onPrint && (
              <button
                onClick={handleBulkPrint}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Imprimer"
              >
                <Printer className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Only show checkbox column for file listings (not folder listings) */}
              {!showActions && (
                <th className="w-12 px-4 py-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {showActions ? 'Nom' : 'Fichier'}
              </th>
              {!showActions && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taille
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modifié
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, i) => {
              const filePath = row.full_path || (row.isTopLevel 
                ? `${row.parentPath}/${row.name}`
                : `${selectedPath}/${row.name}`);

              const parentPath = filePath.split('/').slice(0, -1).join('/');
              const isSelected = selectedFiles.includes(filePath);

              return (
                <tr
                  key={`${row.name}-${i}`}
                  className={`hover:bg-gray-50 transition-colors group ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${showActions ? 'cursor-pointer' : ''}`}
                  onClick={() => handleRowClick(row)}
                >
                  {/* Checkbox cell - only for file listings */}
                  {!showActions && (
                    <td className="w-12 px-4 py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFile(filePath)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </td>
                  )}
                  
                  {/* Name cell */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {showActions ? (
                        <Folder className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                      )}
                      <div className="flex flex-col">
                        {/* Show path for files when not at top level */}
                        {!showActions && !row.isTopLevel && (
                          <span className="text-xs text-gray-400 truncate max-w-md">
                            {parentPath}/
                          </span>
                        )}
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {row.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Size and Modified columns - only for files */}
                  {!showActions && (
                    <>                
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.size || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.lastModified || '-'}
                      </td>
                    </>
                  )}
                  
                  {/* Actions cell */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {!showActions && row.type === 'file' && (
                        <>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" 
                            onClick={e => {
                              e.stopPropagation();
                              onArchive(filePath);
                            }}
                            title="Archiver"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" 
                            onClick={e => {
                              e.stopPropagation();
                              onRename(filePath);
                            }}
                            title="Renommer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" 
                            onClick={e => {
                              e.stopPropagation();
                              onDelete([filePath]);
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Empty state */}
        {rows.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun {showActions ? 'dossier' : 'fichier'} trouvé
            </h3>
            <p className="text-gray-500">
              {showActions 
                ? "Ce dossier ne contient aucun sous-dossier" 
                : "Ce dossier ne contient aucun fichier"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}