import React, { useState, useMemo, useEffect } from 'react';
import { Node } from '../types';
import { useAuth } from './AuthContext';
import { 
    FileText, 
    Folder, 
    Download, 
    Trash2, 
    Archive, 
    Edit2, 
    Printer, 
    Eye, 
    ExternalLink, 
    FileType, 
    FileSpreadsheet, 
    File as FileIcon,
    FileText as TextFileIcon
} from 'lucide-react';

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
  onOpenFile?: (path: string) => void;
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

const getAllDocumentsUnder = (node: Node): Node[] => {
  let documents: Node[] = [];
  
  if (node.type === 'file') {
    documents.push(node);
    return documents;
  }

  if (node.nodes) {
    node.nodes.forEach(childNode => {
      documents = [...documents, ...getAllDocumentsUnder(childNode)];
    });
  }

  return documents;
};

// Helper to check if file is a PDF
const isPdfFile = (filename: string, mimeType?: string): boolean => {
  return mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
};

// Helper to get file icon based on type
const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) return <FileIcon className="h-5 w-5 text-gray-500" />;
  
    // PDF files: Red file icon
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    
    // Word files: Blue document icon
    if (mimeType.includes('word') || mimeType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      return <FileType className="h-5 w-5 text-blue-500" />;
    }
    
    // Excel files: Green spreadsheet icon
    if (mimeType.includes('excel') || mimeType.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    
    // PowerPoint files: Orange document icon
    if (mimeType.includes('powerpoint') || mimeType.includes('vnd.openxmlformats-officedocument.presentationml.presentation')) {
      return <FileType className="h-5 w-5 text-orange-500" />;
    }
    
    // Text files: Gray text file icon
    if (mimeType.startsWith('text/')) {
      return <TextFileIcon className="h-5 w-5 text-gray-500" />;
    }
    
    // Other files: Gray generic file icon
    return <FileIcon className="h-5 w-5 text-gray-500" />;
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
  onOpenFile,
}: DataTableProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const { can } = useAuth();

  // Check permissions
  const canDelete = can('documents.delete');
  const canEdit = can('documents.edit');
  const canArchive = can('documents.archive');
  const canView = can('documents.view');
  const canDownload = can('documents.download');
  const canPrint = can('documents.print');
  const isAdmin = can('admin.access'); // For backward compatibility checks

  // Update the useMemo section in DataTable.tsx
  const { rows, showActions } = useMemo(() => {
    // For admin users - show full hierarchy as before
    if (isAdmin) {
      // 1. Initial State: No path selected. Show all 'process' folders from 'Original'.
      if (!selectedPath) {
        const originalNode = hierarchy.find(n => n.name === 'Original');
        if (!originalNode) return { rows: [], showActions: true };

        const processFolders: Node[] = [];
        originalNode.nodes?.forEach(categoryNode => {
          categoryNode.nodes?.forEach(processNode => {
            if (processNode.type === 'folder' && processNode.folder_type === 'process') {
              processFolders.push(processNode);
            }
          });
        });
        return { rows: processFolders, showActions: true };
      }

      // 2. A path IS selected. Find the node and show its direct children.
      const selectedNode = findNode(hierarchy, selectedPath);
      if (!selectedNode || selectedNode.type !== 'folder') {
        return { rows: [], showActions: false };
      }

      // If it's a process folder, show all documents beneath it (recursively)
      if (selectedNode.folder_type === 'process') {
        const allDocuments = getAllDocumentsUnder(selectedNode);
        return { rows: allDocuments, showActions: false };
      }
      
      // If it's a document_type folder (like "Procédures"), show all documents beneath it
      if (selectedNode.folder_type === 'document_type') {
        const allDocuments = getAllDocumentsUnder(selectedNode);
        return { rows: allDocuments, showActions: false };
      }
      
      // For other folder types, show all documents beneath them
      const allDocuments = getAllDocumentsUnder(selectedNode);
      return { rows: allDocuments, showActions: false };
    }
    // For non-admin users - simplified view
    else {
      // 1. Initial State: No path selected. Show all process folders directly
      if (!selectedPath) {
        const processFolders: Node[] = [];
        // Find all process folders under Original
        const originalNode = hierarchy.find(n => n.name === 'Original');
        originalNode?.nodes?.forEach(categoryNode => {
          categoryNode.nodes?.forEach(processNode => {
            if (processNode.type === 'folder' && processNode.folder_type === 'process') {
              processFolders.push(processNode);
            }
          });
        });
        return { rows: processFolders, showActions: true };
      }

      // 2. When any folder is selected, show all documents under it (recursively)
      const selectedNode = findNode(hierarchy, selectedPath);
      
      if (!selectedNode || selectedNode.type !== 'folder') {
        return { rows: [], showActions: false };
      }

      // For any folder type, list all documents beneath it
      const allDocuments = getAllDocumentsUnder(selectedNode);
      return { rows: allDocuments, showActions: false };
    }
  }, [selectedPath, hierarchy, isAdmin]);

  // Reset selection when rows change to avoid stale selections
  useEffect(() => {
    setSelectedFiles([]);
  }, [rows]);

  const allSelected = useMemo(() => {
    const fileRows = rows.filter(row => row.type === 'file');
    return fileRows.length > 0 && selectedFiles.length === fileRows.length;
  }, [rows, selectedFiles]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedFiles([]);
    } else {
      const allFilePaths = rows.filter(row => row.type === 'file').map(row => row.full_path);
      setSelectedFiles(allFilePaths);
    }
  };

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev =>
      prev.includes(filePath)
        ? prev.filter(p => p !== filePath)
        : [...prev, filePath]
    );
  };

  // Bulk actions handlers
  const handleBulkDelete = () => {
    if (selectedFiles.length > 0 && canDelete) {
      onDelete(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const handleBulkDownload = () => {
    if (onDownload && selectedFiles.length > 0 && canDownload) {
      onDownload(selectedFiles);
      setSelectedFiles([]);
    }
  };
    
  const handleBulkPrint = () => {
    if (onPrint && selectedFiles.length > 0 && canPrint) {
        onPrint(selectedFiles);
        setSelectedFiles([]);
    }
  };

  // Handle row click to navigate into folders or open files
  const handleRowClick = (item: Node) => {
    if (item.type === 'folder') {
      onSelect(item.full_path);
    } else if (item.type === 'file' && onOpenFile && canView) {
      // For files, trigger the open file action
      onOpenFile(item.full_path);
    }
  };

  // Handle file opening (PDF viewing)
  const handleOpenFile = (item: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenFile && canView) {
      onOpenFile(item.full_path);
    }
  };

  // Handle download single file
  const handleDownloadFile = (item: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload && canDownload) {
      onDownload([item.full_path]);
    }
  };

  // Handle print single file
  const handlePrintFile = (item: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrint && canPrint) {
      onPrint([item.full_path]);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Grid view (not implemented in this snippet, but logic would go here)
  if (viewMode === 'grid' && !showActions) {
      // ... grid view JSX ...
  }

  // Don't render if user doesn't have view permission
  if (!canView) {
    return (
      <div className="text-center py-20">
        <div className="text-lg font-medium text-gray-900 mb-2">
          Accès non autorisé
        </div>
        <p className="text-sm text-gray-500">
          Vous n'avez pas les permissions nécessaires pour voir les documents.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions bar */}
      {selectedFiles.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                {selectedFiles.length} fichier(s) sélectionné(s)
                </span>
            </div>
            <div className="flex items-center gap-2">
                {onDownload && canDownload && (
                <button
                    onClick={handleBulkDownload}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Télécharger"
                >
                    <Download className="h-4 w-4" />
                </button>
                )}
                {onPrint && canPrint && (
                <button
                    onClick={handleBulkPrint}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    title="Imprimer"
                >
                    <Printer className="h-4 w-4" />
                </button>
                )}
                {canDelete && (
                    <button
                    onClick={handleBulkDelete}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                    >
                    <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {!showActions && (
                <th className="w-12 px-4 py-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={rows.filter(r => r.type === 'file').length === 0}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {showActions ? 'Dossier de processus' : 'Nom'}
              </th>
              {!showActions && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taille
                  </th>
                </>
              )}
              <th className="px-30 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <tr
                key={row.full_path}
                className={`hover:bg-gray-50 transition-colors group ${
                  selectedFiles.includes(row.full_path) ? 'bg-blue-50' : ''
                } ${row.type === 'folder' || (row.type === 'file' && canView) ? 'cursor-pointer' : ''}`}
                onClick={() => handleRowClick(row)}
              >
                {!showActions && (
                  <td className="w-12 px-4 py-4">
                     {row.type === 'file' && (
                        <div className="flex items-center">
                            <input
                            type="checkbox"
                            checked={selectedFiles.includes(row.full_path)}
                            onChange={() => toggleFile(row.full_path)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>
                     )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {row.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    ) : (
                      <div className="mr-3 flex-shrink-0">
                        {getFileIcon(row.mime_type)}
                      </div>
                    )}
                    <div className="text-sm font-medium text-gray-900 truncate" title={row.name}>
                      {row.name}
                    </div>
                    {/* Show clickable indicator for files */}
                    {row.type === 'file' && canView && (
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-400">
                          {isPdfFile(row.name, row.mime_type) ? 'Cliquer pour ouvrir' : 'Cliquer pour télécharger'}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                {showActions ? (
                  <td colSpan={3}></td>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.type === 'file' ? row.size || '-' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {row.type === 'file' && (
                            <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Read-only actions for all users with permissions */}
                                {onOpenFile && canView && (
                                  <button onClick={(e) => handleOpenFile(row, e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title={isPdfFile(row.name, row.mime_type) ? "Ouvrir" : "Télécharger"}>
                                        {isPdfFile(row.name, row.mime_type) ? <Eye className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                                  </button>
                                )}
                                {onDownload && canDownload && (
                                  <button onClick={(e) => handleDownloadFile(row, e)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Télécharger">
                                        <Download className="h-4 w-4" />
                                  </button>
                                )}
                                {onPrint && canPrint && isPdfFile(row.name, row.mime_type) && (
                                  <button onClick={(e) => handlePrintFile(row, e)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Imprimer">
                                    <Printer className="h-4 w-4" />
                                  </button>
                                )}
                                
                                {/* Permission-based actions */}
                                {canArchive && (
                                    <button onClick={(e) => handleActionClick(e, () => onArchive(row.full_path))} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Archiver">
                                        <Archive className="h-4 w-4" />
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={(e) => handleActionClick(e, () => onRename(row.full_path))} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Renommer">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                )}
                                {canDelete && (
                                    <button onClick={(e) => handleActionClick(e, () => onDelete([row.full_path]))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="text-center py-20">
            <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showActions ? 'Aucun dossier de processus' : 'Ce dossier est vide'}
            </h3>
            <p className="text-sm text-gray-500">
              {showActions 
                ? "Aucun dossier de processus n'a été trouvé."
                : "Vous pouvez créer un nouveau dossier ou télécharger des fichiers si applicable."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}