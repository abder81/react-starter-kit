// src/App.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, Grid3X3, List, SortAsc, Search, FileText, FolderPlus, Upload, Trash2 } from 'lucide-react';
import { 
  findNode, 
  Node, 
  updateNodeInHierarchy, 
  removeNodeInHierarchy, 
  convertApiToNode,
  DocumentSearchResult,
  FolderContentsResponse,
  ApiFolder
} from './types';
import  {Sidebar}  from './components/Sidebar';
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

// Helper function to get CSRF token
const getCsrfToken = () => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
};

// Helper function to get default headers
const getDefaultHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': getCsrfToken(),
    'Accept': 'application/json',
  };
};

export default function App() {
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;

  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [hierarchy, setHierarchy] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration states
  const [rootCategories, setRootCategories] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [confidentialityLevels, setConfidentialityLevels] = useState<string[]>([]);

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

  // Search results
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load configurations
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        const response = await fetch('/folders/configurations');
        if (!response.ok) {
          throw new Error('Failed to fetch configurations');
        }
        const data = await response.json();
        setRootCategories(data.rootCategories);
        setDocTypes(data.documentTypes);
        setConfidentialityLevels(data.confidentialityLevels);
      } catch (error) {
        console.error('Error loading configurations:', error);
        setError('Failed to load folder configurations');
      }
    };

    loadConfigurations();
  }, []);

  // API functions
  const fetchHierarchy = async (): Promise<Node[]> => {
    try {
      const response = await fetch('/folders/hierarchy', {
        headers: getDefaultHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch hierarchy');
      }
      
      const data = await response.json();
      console.log('Received hierarchy data:', data);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('Invalid hierarchy data:', data);
        throw new Error('Invalid hierarchy data received from server');
      }

      // Convert each item in the array
      return data.map(item => {
        try {
          if (!item || typeof item !== 'object') {
            throw new Error('Invalid item in hierarchy data');
          }
          return convertApiToNode(item);
        } catch (error) {
          console.error('Error converting node:', item, error);
          throw new Error('Failed to convert hierarchy node');
        }
      });
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      throw error;
    }
  };

  const fetchFolderContents = async (path: string): Promise<Node[]> => {
    try {
      const response = await fetch(`/folders/contents?path=${encodeURIComponent(path)}`, {
        headers: getDefaultHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch folder contents');
      }
      const data: FolderContentsResponse = await response.json();
      return data.nodes.map(convertApiToNode);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      throw error;
    }
  };

  const searchDocuments = async (query: string): Promise<DocumentSearchResult[]> => {
    try {
      const response = await fetch(`/documents/search?query=${encodeURIComponent(query)}`, {
        headers: getDefaultHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search documents');
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  };

  const createFolder = async (name: string, parentPath: string): Promise<Node> => {
    try {
      const response = await fetch('/folders', {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({
          name,
          parent_path: parentPath,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
      
      const folderData = await response.json();
      return convertApiToNode(folderData);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (path: string): Promise<void> => {
    try {
      const response = await fetch('/folders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ path }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error('Ce dossier ne peut pas être supprimé car il est protégé');
        }
        throw new Error(errorData.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  };

  const uploadFiles = async (files: File[], folderPath: string): Promise<Node[]> => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files[]', file));
      formData.append('folder_path', folderPath);

      const response = await fetch('/documents', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload files');
      }

      const uploadedFiles = await response.json();
      return uploadedFiles.map((file: any) => convertApiToNode(file));
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const renameDocument = async (documentId: number, newName: string): Promise<void> => {
    try {
      const response = await fetch(`/documents/${documentId}`, {
        method: 'PUT',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename document');
      }
    } catch (error) {
      console.error('Error renaming document:', error);
      throw error;
    }
  };

  const deleteDocument = async (documentId: number): Promise<void> => {
    try {
      const response = await fetch(`/documents/${documentId}`, {
        method: 'DELETE',
        headers: getDefaultHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const bulkDeleteDocuments = async (documentIds: number[]): Promise<void> => {
    try {
      const response = await fetch('/documents/bulk-delete', {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ document_ids: documentIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete documents');
      }
    } catch (error) {
      console.error('Error bulk deleting documents:', error);
      throw error;
    }
  };

  const downloadDocuments = async (documentIds: number[]): Promise<void> => {
    try {
      const response = await fetch('/documents/download', {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ document_ids: documentIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to download documents');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentIds.length === 1 ? 'document.pdf' : 'documents.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading documents:', error);
      throw error;
    }
  };

  // Load initial hierarchy
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoading(true);
        setError(null);
        const hierarchyData = await fetchHierarchy();
        setHierarchy(hierarchyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hierarchy');
      } finally {
        setLoading(false);
      }
    };

    loadHierarchy();
  }, []);

  // Search effect
  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const results = await searchDocuments(searchTerm);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Helper to check if current path allows file uploads (5th level - confidentiality levels)
  const canUploadFiles = (path: string | null): boolean => {
    if (!path) return false;
    const parts = path.split('/');
    
    // Must be at 5th level: Original/[Process]/[ProcessCode]/[DocType]/[ConfidentialityLevel]
    if (parts.length !== 5) return false;
    if (parts[0] !== 'Original') return false;
    if (!rootCategories.includes(parts[1])) return false;
    if (!docTypes.includes(parts[3])) return false;
    if (!confidentialityLevels.includes(parts[4])) return false;
    return true;
  };

  // Protected folders logic
  const isProtectedPath = (path: string): boolean => {
    if (!path) return false;
    const parts = path.split('/');
    
    // Root folders (Original, Obsolete) are protected
    if (parts.length === 1) return true;
    
    // Category folders (Pilotage, Réalisation, Support) are protected
    if (parts.length === 2) return true;
    
    // Process folders (PSP-01, PSP-02, etc.) are protected
    if (parts.length === 3) return true;

    
    return false;
  };

  const isDeleteDisabled = !selectedPath || isProtectedPath(selectedPath);

  // Search
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

  // Handle search result click
  const handleSearchClick = (result: DocumentSearchResult) => {
    const parts = result.full_path.split('/');
    parts.pop();
    setSelectedPath(parts.join('/'));
    setSearchTerm('');
  };

  // Create folder handler
  const handleCreateFolder = async () => {
    if (!selectedPath || !newFolderName.trim()) return;
    
    try {
      setLoading(true);
      const newFolder = await createFolder(newFolderName.trim(), selectedPath);
      
      setHierarchy(prev =>
        updateNodeInHierarchy(prev, selectedPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), newFolder],
        }))
      );
      
      setNewFolderName('');
      setShowCreateFolderModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  // Delete folder handler
  const handleDeleteFolder = async () => {
    if (!selectedPath || isProtectedPath(selectedPath)) return;
    
    try {
      setLoading(true);
      await deleteFolder(selectedPath);
      
      const parentPath = selectedPath.split('/').slice(0, -1).join('/');
      setHierarchy(prev => removeNodeInHierarchy(prev, selectedPath));
      setSelectedPath(parentPath);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  // Upload handlers
  const handleFileUpload = async (files: File[], isArchive: boolean, version?: string) => {
    if (!files.length) {
      throw new Error('No files to upload');
    }

    const targetPath = isArchive && archiveFilePath 
      ? archiveFilePath.split('/').slice(0, -1).join('/')
      : selectedPath;

    if (!targetPath) {
      throw new Error('No upload path specified');
    }

    try {
      const uploadedFiles = await uploadFiles(files, targetPath);
      
      // Update hierarchy with new files
      setHierarchy(prev =>
        updateNodeInHierarchy(prev, targetPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), ...uploadedFiles],
        }))
      );

      // If archiving, move current file to Obsolete
      if (isArchive && archiveFilePath) {
        const obsoletePath = targetPath.replace('Original/', 'Obsolete/');
        const currentNode = findNode(hierarchy, archiveFilePath);
        if (currentNode) {
          setHierarchy(prev => removeNodeInHierarchy(prev, archiveFilePath));
          setHierarchy(prev =>
            updateNodeInHierarchy(prev, obsoletePath, node => ({
              ...node,
              nodes: [...(node.nodes || []), currentNode],
            }))
          );
        }
      }

    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  const handleUploadClick = () => {
    setArchiveMode(false);
    setShowUploadModal(true);
  };

  const handleArchiveClick = (path: string) => {
    setArchiveFilePath(path);
    setArchiveMode(true);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (files: File[], isArchive: boolean, version: string) => {
    try {
      setFilesToUpload(files);
      setArchiveMode(isArchive);
      
      await handleFileUpload(files, isArchive, version);
      
      setShowUploadModal(false);
      setFilesToUpload([]);
      setArchiveMode(false);
      setArchiveFilePath(null);
    } catch (error) {
      console.error('Upload/Archive failed:', error);
      throw error;
    }
  };

  // File operations
  const handleDeleteFile = async (filePath: string) => {
    const node = findNode(hierarchy, filePath);
    if (!node || node.type !== 'file') return;

    try {
      await deleteDocument(node.id);
      setHierarchy(prev => removeNodeInHierarchy(prev, filePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleRenameFile = (filePath: string) => {
    setFileToRename(filePath);
    const currentName = filePath.split('/').pop() || '';
    setNewFileName(currentName);
    setShowRenameModal(true);
  };

  const handleRenameConfirm = async () => {
    if (!fileToRename || !newFileName.trim()) return;
    
    const node = findNode(hierarchy, fileToRename);
    if (!node || node.type !== 'file') return;

    try {
      await renameDocument(node.id, newFileName.trim());
      
      const newNode = { ...node, name: newFileName.trim() };
      const parentPath = fileToRename.split('/').slice(0, -1).join('/');
      
      setHierarchy(prev => removeNodeInHierarchy(prev, fileToRename));
      setHierarchy(prev =>
        updateNodeInHierarchy(prev, parentPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), newNode],
        }))
      );
      
      setShowRenameModal(false);
      setFileToRename(null);
      setNewFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename file');
    }
  };

  // Bulk actions
  const handleBulkDelete = async (paths: string[]) => {
    const fileNodes: Node[] = [];
    paths.forEach(path => {
      const node = findNode(hierarchy, path);
      if (node && node.type === 'file') {
        fileNodes.push(node);
      }
    });

    if (fileNodes.length === 0) return;

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${fileNodes.length} fichier(s) ?`)) {
      try {
        const documentIds = fileNodes.map(node => node.id);
        await bulkDeleteDocuments(documentIds);
        
        paths.forEach(path => {
          setHierarchy(prev => removeNodeInHierarchy(prev, path));
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete files');
      }
    }
  };

  const handleBulkDownload = async (paths: string[]) => {
    const fileNodes: Node[] = [];
    paths.forEach(path => {
      const node = findNode(hierarchy, path);
      if (node && node.type === 'file') {
        fileNodes.push(node);
      }
    });

    if (fileNodes.length === 0) return;

    try {
      const documentIds = fileNodes.map(node => node.id);
      await downloadDocuments(documentIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download files');
    }
  };

  const handleBulkPrint = (paths: string[]) => {
    // Implement your print logic here
    console.log('Printing files:', paths);
  };

  // Add state for managing hierarchy updates
  const onUpdateHierarchy = (updater: (hierarchy: Node[]) => Node[]) => {
    setHierarchy(updater(hierarchy));
  };

  if (loading && hierarchy.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <button
            onClick={() => setError(null)}
            className="float-right ml-2 text-red-700 hover:text-red-900"
          >
            ×
          </button>
          {error}
        </div>
      )}
      
      <aside
        ref={sidebarRef}
        className="flex-none border-r border-gray-200 bg-white shadow-sm flex flex-col"
        style={{ width: sidebarWidth }}
      >
        <Sidebar 
          selectedPath={selectedPath} 
          onSelect={setSelectedPath} 
          hierarchy={hierarchy}
          loading={loading}
          onUpdateHierarchy={onUpdateHierarchy}
        />
      </aside>
      
      <div
        className="w-1 hover:w-2 bg-gray-200 hover:bg-blue-300 cursor-ew-resize transition-all duration-150"
        onMouseDown={() => setIsDragging(true)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Breadcrumb selectedPath={selectedPath} onNavigate={setSelectedPath} />
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
              {searchLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
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

          {/* Search Results */}
          {isSearching ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Résultats de recherche ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-gray-500">
                  {searchLoading ? 'Recherche en cours...' : `Aucun fichier trouvé pour « ${searchTerm} »`}
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleSearchClick(result)}
                    >
                      <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {result.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {result.full_path}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Main Content */
            selectedPath ? (
              <DataTable
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                hierarchy={hierarchy}
                viewMode={viewMode}
                onCreateFolder={() => setShowCreateFolderModal(true)}
                onDelete={handleBulkDelete}        // Uncomment this
                onRename={handleRenameFile}
                onArchive={handleArchiveClick}
                onDownload={handleBulkDownload}    // Uncomment this
                onPrint={handleBulkPrint}          // Uncomment this
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sélectionnez un dossier
                </h3>
                <p className="text-gray-500">
                  Choisissez un dossier dans la barre latérale pour voir son contenu
                </p>
              </div>
            )
          )}
        </div>
      </main>

      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
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
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrez le nom du dossier"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowCreateFolderModal(false)}
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

      {/* Delete Folder Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le dossier"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer le dossier{' '}
            <span className="font-medium">{selectedPath?.split('/').pop()}</span> ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2 pt-4">
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
        onClose={() => setShowRenameModal(false)}
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
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrez le nouveau nom"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowRenameModal(false)}
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

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={archiveMode ? "Archiver et remplacer" : "Télécharger des fichiers"}
        // size="lg"
      >
        <UploadArchiveForm
          initialArchiveMode={archiveMode}
          currentFileName={archiveFilePath ? archiveFilePath.split('/').pop() || '' : ''}
          onSubmit={handleUploadSubmit}
          onCancel={() => setShowUploadModal(false)}
        />
      </Modal>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setFilesToUpload(files);
        }}
      />
    </div>
  );
}