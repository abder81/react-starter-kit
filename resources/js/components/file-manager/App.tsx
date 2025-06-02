// src/App.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, Grid3X3, List, SortAsc, Search, FileText, FolderPlus, Upload, Trash2 } from 'lucide-react';
import { findNode, Node } from './types';
import { Sidebar, initialHierarchy, searchFiles } from './components/Sidebar';
import { Breadcrumb } from './components/Breadcrumb';
import DataTable from './components/DataTable';
import Modal from './components/Modal';
import UploadArchiveForm from './components/UploadArchiveForm';

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

// Constants
const FIRST_LEVEL_ROOTS = ['Pilotage (4)', 'Réalisation (6)', 'Support (7)'];
const docTypes = ['Procédure', 'Charte', 'Guide', 'Politique', 'Enregistrement'];
const confidentialityLevels = ['Interne', 'Public', 'Restreint', 'Confidentiel', 'Strictement Confidentiel'];

export default function App() {
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;

  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [hierarchy, setHierarchy] = useState<Node[]>(initialHierarchy);

  // Modal states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Upload / Archive state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [archiveFilePath, setArchiveFilePath] = useState<string | null>(null);
  const [archiveMode, setArchiveMode] = useState(false);

  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if current path allows file uploads (4th level - confidentiality levels)
  const canUploadFiles = (path: string | null): boolean => {
    if (!path) return false;
    const parts = path.split('/');
    
    // Must be at 5th level: Original/[Process]/[ProcessCode]/[DocType]/[ConfidentialityLevel]
    // Example: Original/Pilotage (4)/PSP-01/Procédure/Public
    if (parts.length !== 5) return false;
    if (parts[0] !== 'Original') return false;
    if (!FIRST_LEVEL_ROOTS.includes(parts[1])) return false;
    // parts[2] is the process code (PSP-01, PSR-05, etc.) - no validation needed
    if (!docTypes.includes(parts[3])) return false;
    if (!confidentialityLevels.includes(parts[4])) return false;
    return true;
  };

  // Helper to replace version suffix
  const replaceVersionSuffix = (fileName: string, newSuffix: string): string => {
    const [base, ...extParts] = fileName.split('.');
    const ext = extParts.join('.');
    const versionRegex = /_v\d+(?:\.\d+)?$/i;
    const baseWithoutVersion = base.replace(versionRegex, '');
    return `${baseWithoutVersion}${newSuffix}.${ext}`;
  };

  // Helper to get next version number
  const getNextVersionNumber = (fileName: string): number => {
    const versionMatch = fileName.match(/_v(\d+)(?:\.\d+)?$/i);
    if (!versionMatch) return 1; // First version
    return parseInt(versionMatch[1], 10) + 1;
  };

  // Recursively updates the tree to insert a new folder or files
  const updateNodeInHierarchy = (
    nodes: Node[],
    targetPath: string,
    updater: (node: Node) => Node,
    currentPath = ''
  ): Node[] => {
    return nodes.map(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (fullPath === targetPath) {
        return updater(node);
      }
      if (node.nodes && targetPath.startsWith(fullPath + '/')) {
        return {
          ...node,
          nodes: updateNodeInHierarchy(node.nodes, targetPath, updater, fullPath),
        };
      }
      return node;
    });
  };

  // Remove nodes helper
  const removeNodeInHierarchy = (
    nodes: Node[],
    targetPath: string,
    currentPath = ''
  ): Node[] =>
    nodes
      .filter(node => {
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        return fullPath !== targetPath;
      })
      .map(node => {
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        if (node.nodes && targetPath.startsWith(fullPath + '/')) {
          return {
            ...node,
            nodes: removeNodeInHierarchy(node.nodes, targetPath, fullPath),
          };
        }
        return node;
      });

  // Move file to Obsolete on versioned archives
  const moveFileToObsolete = (fullPath: string) => {
    const parts = fullPath.split('/');
    const fileName = parts.pop()!;
    const parentPath = parts.join('/');
    if (!parentPath.startsWith('Original/')) return;

    const versionRegex = /_v(\d+)(?:\.\d+)?$/i;
    if (!versionRegex.test(fileName)) return;

    const obsoletePath = parentPath.replace('Original/', 'Obsolete/');
    const fileNode = findNode(hierarchy, fullPath);
    if (!fileNode) return;

    setHierarchy(prev => removeNodeInHierarchy(prev, fullPath));
    setHierarchy(prev =>
      updateNodeInHierarchy(prev, obsoletePath, node => ({
        ...node,
        nodes: [...(node.nodes || []), { ...fileNode, name: fileName }],
      })),
    );
  };

  // Search
  const searchResults = useMemo(
    () => (searchTerm.length < 3 ? [] : searchFiles(hierarchy, searchTerm)),
    [searchTerm, hierarchy],
  );
  const isSearching = searchTerm.length >= 3;

  // Sidebar resizing
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      let w = e.clientX - rect.left;
      w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
      setSidebarWidth(w);
    };
    const onUp = () => setIsDragging(false);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  // Handle upload & archive
  const handleFileUpload = async (files: File[], isArchive: boolean, version?: string) => {
    if (!files.length) {
      throw new Error('No files to upload');
    }

    if (isArchive && !archiveFilePath) {
      throw new Error('No archive path specified');
    }

    if (!isArchive && !selectedPath) {
      throw new Error('No upload path specified');
    }

    try {
      const parentPath = isArchive
        ? archiveFilePath!.split('/').slice(0, -1).join('/')
        : selectedPath!;

      const folderNode = findNode(hierarchy, parentPath);
      if (!folderNode) {
        throw new Error('Invalid destination folder');
      }

      const existingNames = folderNode.nodes?.map(n => n.name) || [];
      const newNodes: Node[] = [];

      for (const file of files) {
        let finalName: string;
        
        if (isArchive) {
          const originalFileName = archiveFilePath!.split('/').pop()!;
          const newVersionNumber = version || '1';
          const lastDotIndex = originalFileName.lastIndexOf('.');
          const extension = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex) : '';
          const nameWithoutExt = lastDotIndex !== -1 
            ? originalFileName.substring(0, lastDotIndex)
            : originalFileName;
          
          const baseName = nameWithoutExt.replace(/_v[\d.]+$/, '');
          finalName = `${baseName}_v${newVersionNumber}${extension}`;

          // Move current file to Obsolete if in archive mode
          if (archiveFilePath) {
            const obsoletePath = parentPath.replace('Original/', 'Obsolete/');
            const currentNode = findNode(hierarchy, archiveFilePath);
            if (currentNode) {
              setHierarchy(prev => removeNodeInHierarchy(prev, archiveFilePath));
              setHierarchy(prev =>
                updateNodeInHierarchy(prev, obsoletePath, node => ({
                  ...node,
                  nodes: [...(node.nodes || []), { ...currentNode, name: originalFileName }],
                })),
              );
            }
          }
        } else {
          finalName = file.name;
          // Check for existing file names - this will be thrown as an error that the form can catch
          if (existingNames.includes(finalName)) {
            throw new Error(`Le fichier "${finalName}" existe déjà dans ce dossier`);
          }
        }

        newNodes.push({
          name: finalName,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          lastModified: new Date().toISOString().split('T')[0],
        });
      }

      // Update hierarchy with new files
      setHierarchy(prev =>
        updateNodeInHierarchy(prev, parentPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), ...newNodes],
        }))
      );

    } catch (error) {
      console.error('File processing failed:', error);
      throw error;
    }
  };

  // Handle search result click
  const handleSearchClick = (r: { name: string; fullPath: string }) => {
    const parts = r.fullPath.split('/');
    parts.pop();
    setSelectedPath(parts.join('/'));
    setSearchTerm('');
  };

  // Create folder
  const handleCreateFolder = () => {
    if (!selectedPath || !newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    const pathParts = selectedPath.split('/');
    const level = pathParts.length;

    let newFolder: Node;
    switch (level) {
      case 1:
        newFolder = {
          name: folderName,
          nodes: docTypes.map(type => ({
            name: type,
            nodes: confidentialityLevels.map(level => ({ name: level, nodes: [] })),
          })),
          isUserCreated: true,
        };
        break;
      case 2:
        newFolder = {
          name: folderName,
          nodes: confidentialityLevels.map(level => ({ name: level, nodes: [] })),
          isUserCreated: true,
        };
        break;
      case 3:
        newFolder = { name: folderName, nodes: [], isUserCreated: true }; 
        break;
      default:
        newFolder = { name: folderName, nodes: [], isUserCreated: true };
    }

    setHierarchy(prev =>
      updateNodeInHierarchy(prev, selectedPath, node => ({
        ...node,
        nodes: [...(node.nodes || []), newFolder],
      })),
    );
    setNewFolderName('');
    setShowCreateFolderModal(false);
  };

  // Protected folders logic
  const protectedFolders = ['Original', 'Obsolete', ...FIRST_LEVEL_ROOTS];
  const isProtectedPath = (path: string): boolean => {
    const parts = path.split('/');
    if (parts.length === 1) {
      return protectedFolders.includes(parts[0]);
    }
    if ((parts[0] === 'Original' || parts[0] === 'Obsolete') && parts.length === 2) {
      return FIRST_LEVEL_ROOTS.includes(parts[1]);
    }
    return false;
  };

  const isDeleteDisabled = !selectedPath || isProtectedPath(selectedPath);

  // Delete folder
  const handleDeleteFolder = () => {
    if (!selectedPath || isProtectedPath(selectedPath)) return;
    const parentPath = selectedPath.split('/').slice(0, -1).join('/');
    setHierarchy(prev => removeNodeInHierarchy(prev, selectedPath));
    setSelectedPath(parentPath);
    setShowDeleteModal(false);
  };

  // Delete file
  const handleDeleteFile = (filePath: string) => {
    const parentPath = filePath.split('/').slice(0, -1).join('/');
    if (isProtectedPath(parentPath)) return;
    setHierarchy(prev => removeNodeInHierarchy(prev, filePath));
  };

  // Rename file
  const handleRenameFile = (filePath: string) => {
    setFileToRename(filePath);
    const currentName = filePath.split('/').pop() || '';
    setNewFileName(currentName);
    setShowRenameModal(true);
  };

  // Confirm rename
  const handleRenameConfirm = () => {
    if (!fileToRename || !newFileName.trim()) return;
    const node = findNode(hierarchy, fileToRename);
    if (!node) return;
    const newNode = { ...node, name: newFileName.trim() };
    const parentPath = fileToRename.split('/').slice(0, -1).join('/');
    setHierarchy(prev => removeNodeInHierarchy(prev, fileToRename));
    setHierarchy(prev =>
      updateNodeInHierarchy(prev, parentPath, node => ({
        ...node,
        nodes: [...(node.nodes || []), newNode],
      })),
    );
    setShowRenameModal(false);
    setFileToRename(null);
    setNewFileName('');
  };

  // Upload / Archive handlers
  const handleUploadClick = () => {
    setArchiveMode(false);
    setShowUploadModal(true);
  };

  const handleArchiveClick = (path: string) => {
    setArchiveFilePath(path);
    setArchiveMode(true);
    setShowUploadModal(true);
  };

  // Replace the existing upload modal section with this updated version
  const handleUploadSubmit = async (files: File[], isArchive: boolean, version: string) => {
    try {
      // Set the states before processing
      setFilesToUpload(files);
      setArchiveMode(isArchive);
      
      await handleFileUpload(files, isArchive, version);
      
      // On success, close modal and reset states
      setShowUploadModal(false);
      setFilesToUpload([]);
      setArchiveMode(false);
      setArchiveFilePath(null);
    } catch (error) {
      console.error('Upload/Archive failed:', error);
      // Error handling - modal stays open, error will be handled by the form
      throw error; // Re-throw so the form can handle the error
    }
  };

  // Bulk actions
  const handleBulkDelete = async (paths: string[]) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${paths.length} fichier(s) ?`)) {
      paths.forEach(path => {
        const parentPath = path.split('/').slice(0, -1).join('/');
        if (!isProtectedPath(parentPath)) {
          setHierarchy(prev => removeNodeInHierarchy(prev, path));
        }
      });
    }
  };

  const handleBulkDownload = (paths: string[]) => {
    // Implement your download logic here
    console.log('Downloading files:', paths);
  };

  const handleBulkPrint = (paths: string[]) => {
    // Implement your print logic here
    console.log('Printing files:', paths);
  };

  // Debugging logs
  console.log('Current path:', selectedPath);
  console.log('Can upload:', canUploadFiles(selectedPath));

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        ref={sidebarRef}
        className="flex-none border-r border-gray-200 bg-white shadow-sm flex flex-col" // Added flex flex-col
        style={{ width: sidebarWidth }}
      >
        <Sidebar selectedPath={selectedPath} onSelect={setSelectedPath} hierarchy={hierarchy} />
        
      </aside>
      <div
        className="w-1 hover:w-2 bg-gray-200 hover:bg-blue-300 cursor-ew-resize transition-all duration-150"
        onMouseDown={() => setIsDragging(true)}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Breadcrumb selectedPath={selectedPath} onNavigate={setSelectedPath} />
            <div className="flex items-center gap-3">
              {/* {selectedPath && !isSearching && (
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'} hover:text-gray-700 transition-colors`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'} hover:text-gray-700 transition-colors`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <SortAsc className="h-4 w-4" />
              </button> */}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="relative w-[450px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher des fichiers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {selectedPath && !isSearching && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateFolderModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <FolderPlus className="h-4 w-4" /> Créer dossier
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleteDisabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isDeleteDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <Trash2 className="h-4 w-4" /> Supprimer dossier
                </button>

                {/* Upload button with correct visibility condition */}
                {canUploadFiles(selectedPath) && (
                  <button
                    onClick={handleUploadClick}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" /> Télécharger fichier
                  </button>
                )}
                
              </div>
            )}
          </div>
          {/* Rest of the component content */}
          {isSearching ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Résultats de recherche ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-gray-500">
                  Aucun fichier trouvé pour « {searchTerm} »
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleSearchClick(r)}
                    >
                      <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {r.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {r.fullPath}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <DataTable
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              hierarchy={hierarchy}
              viewMode={viewMode}
              onCreateFolder={() => setShowCreateFolderModal(true)}
              onDelete={handleBulkDelete}
              onRename={handleRenameFile}
              onArchive={handleArchiveClick}
              onDownload={handleBulkDownload}
              onPrint={handleBulkPrint}
            />
          )}
        </div>
      </main>
      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => {
          setShowCreateFolderModal(false);
          setNewFolderName('');
        }}
        title="Créer un nouveau dossier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du dossier
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Entrer le nom du dossier..."
              onKeyPress={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreateFolderModal(false);
                setNewFolderName('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Créer
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Upload / Archive Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setFilesToUpload([]);
          setArchiveMode(false);
          setArchiveFilePath(null);
        }}
        title={archiveMode ? "Archiver Fichier" : "Télécharger Fichier"}
      >
        <UploadArchiveForm
          onSubmit={handleUploadSubmit} 
          onCancel={() => {
            setShowUploadModal(false);
            setFilesToUpload([]);
            setArchiveMode(false);
            setArchiveFilePath(null);
          }}
          currentFileName={archiveFilePath?.split('/').pop()}
          initialArchiveMode={archiveMode}
        />
      </Modal>

      {/* Delete Folder Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le dossier"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteFolder}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename File Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setFileToRename(null);
          setNewFileName('');
        }}
        title="Renommer le fichier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau nom
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrer le nouveau nom..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowRenameModal(false);
                setFileToRename(null);
                setNewFileName('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRenameConfirm}
              disabled={!newFileName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Renommer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}