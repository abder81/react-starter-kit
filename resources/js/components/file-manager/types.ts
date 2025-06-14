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
  folder_path?: string; // For files, path to their parent folder
  mime_type?: string; // For files
};

// API Response types
export type ApiFolder = {
  type: 'folder';
  id: number;
  name: string;
  full_path: string;
  nodes: (ApiFolder | ApiFile)[];
};

export type ApiFile = {
  type: 'file';
  id: number;
  name: string;
  full_path: string;
  size: string;
  lastModified: string;
  folder_path?: string;
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
export const convertApiToNode = (apiData: ApiFolder | ApiFile): Node => {
  if (apiData.type === 'file') {
    return {
      type: 'file',
      id: apiData.id,
      name: apiData.name,
      full_path: apiData.full_path,
      size: apiData.size,
      lastModified: apiData.lastModified,
      folder_path: apiData.folder_path,
    };
  } else {
    return {
      type: 'folder',
      id: apiData.id,
      name: apiData.name,
      full_path: apiData.full_path,
      nodes: apiData.nodes.map(convertApiToNode),
    };
  }
};