// src/types.ts
export type Node = {
  name: string;
  nodes?: Node[];
  size?: string;
  lastModified?: string;
  parentPath?: string;
  isUserCreated?: boolean;
  isTopLevel?: boolean; // Add this flag
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

// Add this helper function
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