// src/App.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Filter, Grid3X3, List, SortAsc, Search, FileText, FolderPlus, Upload, Trash2, Edit2 } from 'lucide-react';
import { 
  findNode, 
  Node, 
  updateNodeInHierarchy, 
  removeNodeInHierarchy, 
  convertApiToNode,
  DocumentSearchResult,
  FolderContentsResponse,
  ApiFolder,
  Auth
} from './types';
import { Sidebar } from './components/Sidebar';
import { Breadcrumb } from './components/Breadcrumb';
import DataTable from './components/DataTable';
import Modal from './components/Modal';
import UploadArchiveForm from './components/UploadArchiveForm';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { AuthProvider, useAuth } from './components/AuthContext';


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

function AppContent() {
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;

  // UI States
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Data States
  const [hierarchy, setHierarchy] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Configuration states
  const [rootCategories, setRootCategories] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [confidentialityLevels, setConfidentialityLevels] = useState<string[]>([]);

  // Modal states
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  
  // Form states
  const [newFolderName, setNewFolderName] = useState('');
  const [fileToRename, setFileToRename] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [folderToRename, setFolderToRename] = useState<string | null>(null);
  const [newFolderNameForRename, setNewFolderNameForRename] = useState('');
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);

  // Upload states
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [archiveFilePath, setArchiveFilePath] = useState<string | null>(null);
  const [archiveMode, setArchiveMode] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use the new useAuth hook from AuthContext
  const { can } = useAuth();

  // Optimized API functions with better error handling
  const fetchHierarchy = useCallback(async (): Promise<Node[]> => {
    try {
      const response = await fetch('/folders/hierarchy', {
        headers: getDefaultHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch hierarchy`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Invalid hierarchy data:', data);
        throw new Error('Invalid hierarchy data received from server');
      }

      return data.map(item => convertApiToNode(item));
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      throw error;
    }
  }, []);

  const createFolder = useCallback(async (name: string, parentPath: string): Promise<Node> => {
    try {
      const response = await fetch('/folders/create', {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          parent_path: parentPath,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create folder`);
      }
      
      const folderData = await response.json();
      return convertApiToNode(folderData);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }, []);

  const deleteFolder = useCallback(async (path: string): Promise<void> => {
    try {
      const encodedPath = encodeURIComponent(path);
      const response = await fetch(`/folders/${encodedPath}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to delete folder`);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }, []);

  const renameFolder = useCallback(async (folderId: number, newName: string): Promise<void> => {
    try {
      const response = await fetch(`/folders/${folderId}/rename`, {
        method: 'PUT',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ new_name: newName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to rename folder`);
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  }, []);

  const searchDocuments = useCallback(async (query: string): Promise<DocumentSearchResult[]> => {
    try {
      const response = await fetch(`/documents/search?query=${encodeURIComponent(query)}`, {
        headers: getDefaultHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search documents');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }, []);

  // File operations (optimized)
  const uploadFiles = useCallback(async (files: File[], folderPath: string): Promise<Node[]> => {
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
  }, []);

  const renameDocument = useCallback(async (documentId: number, newName: string): Promise<void> => {
    try {
      const response = await fetch(`/documents/${documentId}`, {
        method: 'PUT',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename document');
      }
    } catch (error) {
      console.error('Error renaming document:', error);
      throw error;
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: number): Promise<void> => {
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
  }, []);

  const bulkDeleteDocuments = useCallback(async (documentIds: number[]): Promise<void> => {
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
  }, []);

  const downloadDocuments = useCallback(async (paths: string[]): Promise<void> => {
    try {
      const fileNodes: Node[] = [];
      paths.forEach(path => {
        const node = findNode(hierarchy, path);
        if (node && node.type === 'file') {
          fileNodes.push(node);
        }
      });

      if (fileNodes.length === 0) return;

      const documentIds = fileNodes.map(node => node.id);
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
      
      // Use the actual file name for single file downloads
      if (fileNodes.length === 1) {
        a.download = fileNodes[0].name;
      } else {
        a.download = 'documents.zip';
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to download files');
    }
  }, [hierarchy]);

  const fetchDescendants = useCallback(async (path: string): Promise<Node> => {
    const response = await fetch(`/folders/descendants?path=${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error('Failed to fetch descendants');
    const data = await response.json();
    return convertApiToNode(data);
  }, []);

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
  }, [fetchHierarchy]);

  // Optimized search effect with debouncing
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
  }, [searchTerm, searchDocuments]);

  const selectedNode = useMemo(() => {
    if (!selectedPath || !hierarchy.length) return null;
    return findNode(hierarchy, selectedPath);
  }, [selectedPath, hierarchy]);

  const isProtectedPath = useCallback((path: string): boolean => {
    if (!path) return false;
    const node = findNode(hierarchy, path);
    return node?.is_protected || false;
  }, [hierarchy]);
  
  // Event handlers (optimized)
  const handleCreateFolder = useCallback(async () => {
    if (!selectedPath || !newFolderName.trim()) {
      setError('Veuillez saisir un nom de dossier valide');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newFolder = await createFolder(newFolderName.trim(), selectedPath);
      
      // Update hierarchy with new folder
      setHierarchy(prev => {
        const updated = updateNodeInHierarchy(prev, selectedPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), newFolder],
        }));
        return updated;
      });
      
      // Reset form and close modal
      setNewFolderName('');
      setShowCreateFolderModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      setError(errorMessage);
      console.error('Create folder error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPath, newFolderName, createFolder]);

  const handleDeleteFolder = useCallback(async () => {
    if (!selectedPath || isProtectedPath(selectedPath)) {
      setError('Ce dossier ne peut pas être supprimé');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await deleteFolder(selectedPath);
      
      // Update hierarchy by removing the deleted folder
      const parentPath = selectedPath.split('/').slice(0, -1).join('/');
      setHierarchy(prev => removeNodeInHierarchy(prev, selectedPath));
      
      // Navigate to parent
      setSelectedPath(parentPath || null);
      setShowDeleteModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      console.error('Delete folder error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPath, isProtectedPath, deleteFolder]);

  // UPDATED: This function is now simpler and more reliable.
  const handleArchiveUpload = useCallback(async (file: File, version: string) => {
    if (!archiveFilePath) throw new Error('Archive path not set.');
    const nodeToArchive = findNode(hierarchy, archiveFilePath);
    if (!nodeToArchive || nodeToArchive.type !== 'file') throw new Error('File to archive not found.');

    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('version', version);
        const response = await fetch(`/documents/${nodeToArchive.id}/archive`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': getCsrfToken(), 'Accept': 'application/json' },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to archive file');
        }

        // --- KEY CHANGE ---
        // Instead of manually manipulating the state, we re-fetch the entire
        // hierarchy from the server. This guarantees the UI is in sync with the
        // database, including the new 'Obsolete' folder if it was just created.
        const updatedHierarchy = await fetchHierarchy();
        setHierarchy(updatedHierarchy);
        // --- END KEY CHANGE ---

        // Close the modal and reset states
        setShowUploadModal(false);
        setArchiveMode(false);
        setArchiveFilePath(null);
    } catch (error) {
        setError(error instanceof Error ? error.message : 'Archiving failed.');
        throw error; // Re-throw for form to handle
    } finally {
        setLoading(false);
    }
  }, [archiveFilePath, hierarchy, fetchHierarchy]);


  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!selectedPath) {
      throw new Error('No upload path specified');
    }

    try {
      const uploadedFileNodes = await uploadFiles(files, selectedPath);
      
      setHierarchy(prev =>
        updateNodeInHierarchy(prev, selectedPath, node => ({
          ...node,
          nodes: [...(node.nodes || []), ...uploadedFileNodes],
        }))
      );
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }, [selectedPath, uploadFiles]);

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

  const handleSearchClick = useCallback((result: DocumentSearchResult) => {
    const parts = result.full_path.split('/');
    parts.pop();
    setSelectedPath(parts.join('/'));
    setSearchTerm('');
  }, []);

  const handleUploadClick = useCallback(() => {
    setFilesToUpload([]);
    setArchiveMode(false);
    setArchiveFilePath(null);
    setShowUploadModal(true);
  }, []);

  const handleArchiveClick = useCallback((path: string) => {
    const node = findNode(hierarchy, path);
    if (node?.full_path.startsWith("Original")) {
        setArchiveFilePath(path);
        setArchiveMode(true);
        setShowUploadModal(true);
    } else {
        setError("Only files in the 'Original' directory can be archived.");
    }
  }, [hierarchy]);

  // UPDATED: This function now routes to the correct handler
  const handleUploadSubmit = useCallback(async (files: File[], isArchive: boolean, version: string) => {
    try {
      setLoading(true);
      setError(null);
      if (isArchive) {
        if (files.length !== 1) throw new Error("Archiving requires a single file.");
        await handleArchiveUpload(files[0], version);
      } else {
        await handleFileUpload(files); 
      }
      
      // Close modal on success
      setShowUploadModal(false);
      setFilesToUpload([]);
      setArchiveMode(false);
      setArchiveFilePath(null);
    } catch (error) {
      // Error is set within the upload/archive functions. Don't close modal on error.
      console.error('Submit failed:', error);
      setError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
        setLoading(false);
    }
  }, [handleFileUpload, handleArchiveUpload]);

  const handleDeleteFile = useCallback(async (filePath: string) => {
    const node = findNode(hierarchy, filePath);
    if (!node || node.type !== 'file') return;

    try {
      await deleteDocument(node.id);
      setHierarchy(prev => removeNodeInHierarchy(prev, filePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  }, [hierarchy, deleteDocument]);

  const handleRenameFile = useCallback((filePath: string) => {
    setFileToRename(filePath);
    const currentName = filePath.split('/').pop() || '';
    setNewFileName(currentName);
    setShowRenameModal(true);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!fileToRename || !newFileName.trim()) return;
    
    const node = findNode(hierarchy, fileToRename);
    if (!node || node.type !== 'file') return;

    try {
      await renameDocument(node.id, newFileName.trim());
      
      const parentPath = fileToRename.split('/').slice(0, -1).join('/');
      const newFullPath = parentPath + '/' + newFileName.trim();
      
      setHierarchy(prev => 
        updateNodeInHierarchy(prev, fileToRename, existingNode => ({
          ...existingNode,
          name: newFileName.trim(),
          full_path: newFullPath
        }))
      );
      
      setShowRenameModal(false);
      setFileToRename(null);
      setNewFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename file');
    }
  }, [fileToRename, newFileName, hierarchy, renameDocument]);

  const handleRenameFolder = useCallback((folderPath: string) => {
    setFolderToRename(folderPath);
    const currentName = folderPath.split('/').pop() || '';
    setNewFolderNameForRename(currentName);
    setShowRenameFolderModal(true);
  }, []);

  const handleRenameFolderConfirm = useCallback(async () => {
    if (!folderToRename || !newFolderNameForRename.trim()) return;
    
    const node = findNode(hierarchy, folderToRename);
    if (!node || node.type !== 'folder') return;

    try {
      setLoading(true);
      setError(null);
      
      await renameFolder(node.id, newFolderNameForRename.trim());
      
      // Refresh the hierarchy to get the updated structure
      const updatedHierarchy = await fetchHierarchy();
      setHierarchy(updatedHierarchy);
      
      // Update selected path if it was the renamed folder
      if (selectedPath === folderToRename) {
        const parentPath = folderToRename.split('/').slice(0, -1).join('/');
        const newFullPath = parentPath + '/' + newFolderNameForRename.trim();
        setSelectedPath(newFullPath);
      }
      
      setShowRenameFolderModal(false);
      setFolderToRename(null);
      setNewFolderNameForRename('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename folder';
      setError(errorMessage);
      console.error('Rename folder error:', err);
    } finally {
      setLoading(false);
    }
  }, [folderToRename, newFolderNameForRename, hierarchy, renameFolder, fetchHierarchy, selectedPath]);

  const handleBulkDelete = useCallback(async (paths: string[]) => {
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
  }, [hierarchy, bulkDeleteDocuments]);

  const handleBulkDownload = useCallback(async (paths: string[]) => {
    const fileNodes: Node[] = [];
    paths.forEach(path => {
      const node = findNode(hierarchy, path);
      if (node && node.type === 'file') {
        fileNodes.push(node);
      }
    });

    if (fileNodes.length === 0) return;

    try {
      await downloadDocuments(paths);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download files');
    }
  }, [hierarchy, downloadDocuments]);

  const handleBulkPrint = useCallback(async (paths: string[]) => {
    const fileNodes: Node[] = [];
    paths.forEach(path => {
      const node = findNode(hierarchy, path);
      if (node && node.type === 'file' && (node.mime_type === 'application/pdf' || node.name.toLowerCase().endsWith('.pdf'))) {
        fileNodes.push(node);
      }
    });

    if (fileNodes.length === 0) {
      setError('No printable PDF files selected');
      return;
    }

    for (const node of fileNodes) {
      try {
        const encodedPath = encodeURIComponent(node.full_path);
        const response = await fetch(`/documents/view/${encodedPath}`, {
          headers: { 
            'X-CSRF-TOKEN': getCsrfToken(),
            'Accept': 'application/pdf'
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url);
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Don't revoke URL immediately to allow print dialog to complete
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          };
        } else {
          throw new Error('Failed to open print window');
        }
      } catch (err) {
        setError(`Could not print ${node.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [hierarchy]);

  const onUpdateHierarchy = useCallback((updater: (hierarchy: Node[]) => Node[]) => {
    setHierarchy(updater);
  }, []);

  // Update handleOpenFile to use browser's default viewer
  const handleOpenFile = useCallback(async (path: string) => {
    const node = findNode(hierarchy, path);
    if (node && node.type === 'file' && (node.mime_type === 'application/pdf' || node.name.toLowerCase().endsWith('.pdf'))) {
      try {
        const encodedPath = encodeURIComponent(node.full_path);
        const response = await fetch(`/documents/view/${encodedPath}`, {
          headers: { 
            'X-CSRF-TOKEN': getCsrfToken(),
            'Accept': 'application/pdf'
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay to ensure the browser has loaded it
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open PDF');
      }
    } else if (node) {
      // For non-PDFs, trigger a download directly
      handleBulkDownload([path]);
    }
  }, [hierarchy, handleBulkDownload]);

  // Computed values for button visibility
  const isDeleteDisabled = !selectedPath || 
    (isProtectedPath(selectedPath) && ['root', 'category'].includes(selectedNode?.folder_type || ''));
  const isSearching = searchTerm.length >= 3;

  const canCreateFolder = useMemo(() => {
    if (!selectedNode) return false;
    // The logic to decide *where* a folder can be created remains the same,
    // but we add a permission check.
    const isAllowedParentType = ['root', 'category', 'process', 'document_type', 'confidentiality'].includes(selectedNode.folder_type || '') || selectedNode.isUserCreated;
    return can('folders.create') && isAllowedParentType;
  }, [selectedNode, can]);

  const canUploadFile = useMemo(() => {
    if (!selectedNode) return false;
    // Your existing logic for uploadable locations
    const isUploadableLocation = selectedNode.folder_type === 'confidentiality' || selectedNode.isUserCreated;
    return can('documents.upload') && isUploadableLocation;
  }, [selectedNode, can]);

  useEffect(() => {
    if (selectedPath) {
      const node = findNode(hierarchy, selectedPath);
      // If node is missing, or it's a folder and its nodes are missing or incomplete (no files at this level)
      if (
        !node ||
        (node.type === 'folder' && (
          !node.nodes ||
          // Fetch if there are no files at this level, even if there are subfolders
          !node.nodes.some(n => n.type === 'file')
        ))
      ) {
        fetchDescendants(selectedPath)
          .then(fullNode => {
            setHierarchy(prev => updateNodeInHierarchy(prev, selectedPath, () => fullNode));
          })
          .catch(error => {
            console.error('Error fetching descendants:', error);
          });
      }
    }
  }, [selectedPath, hierarchy, fetchDescendants]);

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
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md">
          <button
            onClick={() => setError(null)}
            className="float-right ml-2 text-red-700 hover:text-red-900 text-lg font-bold"
          >
            ×
          </button>
          <div className="pr-6">{error}</div>
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
            <Breadcrumb 
                selectedPath={selectedPath} 
                onNavigate={(path) => {
                    // When using breadcrumb, reset to the top-level process view if navigating above a process folder
                    const pathParts = path?.split('/') || [];
                    if (pathParts.length < 3) { // Root ('Original') or Category level
                        setSelectedPath(null);
                    } else {
                        setSelectedPath(path);
                    }
                }} 
            />
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
                {canCreateFolder && (
                    <button
                      onClick={() => setShowCreateFolderModal(true)}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <FolderPlus className="h-4 w-4" /> Créer dossier
                    </button>
                )}
                
                {can('folders.edit') && selectedNode?.type === 'folder' && !selectedNode?.is_protected && (
                    <button
                        onClick={() => handleRenameFolder(selectedPath)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <Edit2 className="h-4 w-4" /> Renommer dossier
                    </button>
                )}
                
                {can('folders.delete') && !isDeleteDisabled && (
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <Trash2 className="h-4 w-4" /> Supprimer dossier
                    </button>
                )}

                {canUploadFile && (
                  <button
                    onClick={handleUploadClick}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
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
              onOpenFile={handleOpenFile}
            />
          )}
        </div>
      </main>

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
              placeholder="Entrez le nom du dossier"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Dossier parent:</strong> {selectedPath || 'Racine'}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowCreateFolderModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setFilesToUpload([]);
          setArchiveMode(false);
          setArchiveFilePath(null);
        }}
        title={archiveMode ? "Archiver et remplacer" : "Télécharger des fichiers"}
      >
        <UploadArchiveForm
          onSubmit={handleUploadSubmit}
          onCancel={() => {
            setShowUploadModal(false);
            setFilesToUpload([]);
            setArchiveMode(false);
            setArchiveFilePath(null);
          }}
          initialArchiveMode={archiveMode}
          currentFileName={archiveFilePath ? archiveFilePath.split('/').pop() : ''}
        />
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmer la suppression"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600">
            <Trash2 className="h-6 w-6" />
            <span className="font-medium">Attention</span>
          </div>
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer le dossier <strong>"{selectedPath?.split('/').pop()}"</strong> ?
          </p>
          <p className="text-sm text-red-600">
            Cette action est irréversible et supprimera également tous les fichiers et sous-dossiers.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteFolder}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>

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
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Entrez le nouveau nom"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Fichier actuel:</strong> {fileToRename?.split('/').pop()}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowRenameModal(false);
                setFileToRename(null);
                setNewFileName('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRenameConfirm}
              disabled={!newFileName.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Renommage...' : 'Renommer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRenameFolderModal}
        onClose={() => {
          setShowRenameFolderModal(false);
          setFolderToRename(null);
          setNewFolderNameForRename('');
        }}
        title="Renommer le dossier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau nom
            </label>
            <input
              type="text"
              value={newFolderNameForRename}
              onChange={(e) => setNewFolderNameForRename(e.target.value)}
              placeholder="Entrez le nouveau nom"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolderConfirm()}
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Dossier actuel:</strong> {folderToRename?.split('/').pop()}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowRenameFolderModal(false);
                setFolderToRename(null);
                setNewFolderNameForRename('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleRenameFolderConfirm}
              disabled={!newFolderNameForRename.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Renommage...' : 'Renommer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
