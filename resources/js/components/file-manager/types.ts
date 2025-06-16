// src/types.ts
export type Node = {
  type: 'folder' | 'file';
  id: number;
  name: string;
  full_path: string;
  nodes?: Node[];
  size?: string;
  lastModified?: string;
  parentPath?: string;
  isUserCreated?: boolean;
  isTopLevel?: boolean;
  folder_path?: string;
  mime_type?: string;
  level?: number;
  folder_type?: 'root' | 'category' | 'process' | 'document_type' | 'confidentiality' | 'custom';
  is_protected?: boolean;
};

// API Response types
export type ApiFolder = {
  type: 'folder';
  id: number;
  name: string;
  full_path: string;
  nodes?: (ApiFolder | ApiFile)[];
  level: number;
  folder_type: 'root' | 'category' | 'process' | 'document_type' | 'confidentiality' | 'custom';
  is_protected: boolean;
  is_user_created: boolean;
};

export type ApiFile = {
  type: 'file';
  id: number;
  name: string;
  full_path: string;
  size: string;
  lastModified: string;
  folder_path?: string;
  mime_type: string;
};

export type FolderContentsResponse = {
  nodes: (ApiFolder | ApiFile)[];
};

export type DocumentSearchResult = {
  id: number;
  name: string;
  full_path: string;
  size: string;
  lastModified: string;
  mime_type: string;
};

// Helper function to update nodes in hierarchy
export const updateNodeInHierarchy = (
  nodes: Node[],
  targetPath: string,
  updater: (node: Node) => Node,
  currentPath = ''
): Node[] =>
  nodes.map(node => {
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

// Remove nodes helper
export const removeNodeInHierarchy = (
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

// Find node helper
export const findNode = (
  nodes: Node[],
  targetPath: string,
  currentPath = ''
): Node | null => {
  for (const node of nodes) {
    const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    if (fullPath === targetPath) return node;
    if (node.nodes) {
      const found = findNode(node.nodes, targetPath, fullPath);
      if (found) return found;
    }
  }
  return null;
};

// Convert API response to Node format
export const convertApiToNode = (apiData: ApiFolder | ApiFile | any): Node => {
  // Log the incoming data for debugging
  console.log('Converting API data:', apiData);

  if (!apiData || typeof apiData !== 'object') {
    console.error('Invalid API data:', apiData);
    throw new Error('Invalid API data received');
  }

  // If it's a standard file response from upload
  if (apiData.name && apiData.size && apiData.lastModified && !apiData.type) {
    return {
      type: 'file',
      id: apiData.id,
      name: apiData.name,
      full_path: apiData.full_path || `${apiData.folder_path}/${apiData.name}`,
      size: apiData.size,
      lastModified: apiData.lastModified,
      folder_path: apiData.folder_path,
      mime_type: apiData.mime_type
    };
  }

  // Regular folder/file conversion
  if (apiData.type === 'file') {
    return {
      type: 'file',
      id: apiData.id,
      name: apiData.name,
      full_path: apiData.full_path,
      size: apiData.size,
      lastModified: apiData.lastModified,
      folder_path: apiData.folder_path,
      mime_type: apiData.mime_type,
    };
  } else if (apiData.type === 'folder') {
    const folderNode: Node = {
      type: 'folder',
      id: apiData.id,
      name: apiData.name,
      full_path: apiData.full_path,
      nodes: [],
      level: apiData.level,
      folder_type: apiData.folder_type,
      is_protected: apiData.is_protected,
      isUserCreated: apiData.is_user_created,
    };

    if (Array.isArray(apiData.nodes)) {
      folderNode.nodes = apiData.nodes.map((child: any) => {
        try {
          return convertApiToNode(child);
        } catch (error) {
          console.error('Error converting child node:', child, error);
          throw error;
        }
      });
    }

    return folderNode;
  }

  console.error('Unknown node type:', apiData);
  throw new Error('Unknown node type in API data');
};

// --- START PERMISSION CHANGES ---
// Mockup of user/auth types for permission checking.
// In a real app, this would be defined based on your authentication system.
export type User = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean; // <-- Added admin flag
};

export type Auth = {
    user: User | null;
};

// This type would typically be in a global types file for Inertia.js
export type SharedData = {
    auth: Auth;
};
// --- END PERMISSION CHANGES ---