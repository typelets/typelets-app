import type { Folder, FolderTreeNode, Note } from '@/types/note';

export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      hasChildren: false,
      isRoot: !folder.parentId,
    });
  });

  folders.forEach((folder) => {
    const node = folderMap.get(folder.id)!;

    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(node);
        parent.hasChildren = true;
      } else {
        rootFolders.push(node);
      }
    } else {
      rootFolders.push(node);
    }
  });

  return rootFolders;
}

export function flattenFolderTree(
  tree: FolderTreeNode[],
  expandedFolders = new Set<string>(),
  notes: Note[] = []
): Folder[] {
  const result: Folder[] = [];

  const noteCounts = new Map<string, number>();
  notes
    .filter((note) => !note.deleted && !note.archived)
    .forEach((note) => {
      if (note.folderId) {
        noteCounts.set(note.folderId, (noteCounts.get(note.folderId) ?? 0) + 1);
      }
    });

  function traverse(nodes: FolderTreeNode[], depth = 0) {
    nodes.forEach((node) => {
      result.push({
        ...node,
        depth,
        isExpanded: expandedFolders.has(node.id),
        noteCount: noteCounts.get(node.id) ?? 0,
      });

      if (node.hasChildren && expandedFolders.has(node.id)) {
        traverse(node.children, depth + 1);
      }
    });
  }

  traverse(tree);
  return result;
}

export function getAllDescendants(
  folderId: string,
  folders: Folder[]
): string[] {
  const descendants: string[] = [];
  const children = folders.filter((f) => f.parentId === folderId);

  children.forEach((child) => {
    descendants.push(child.id);
    descendants.push(...getAllDescendants(child.id, folders));
  });

  return descendants;
}

export function canMoveToFolder(
  sourceFolderId: string,
  targetFolderId: string,
  folders: Folder[]
): boolean {
  if (sourceFolderId === targetFolderId) return false;

  const descendants = getAllDescendants(sourceFolderId, folders);
  return !descendants.includes(targetFolderId);
}

export function getDescendantIds(
  folderId: string,
  folders: Folder[]
): string[] {
  const descendants: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = folders.filter((f) => f.parentId === currentId);

    children.forEach((child) => {
      descendants.push(child.id);
      queue.push(child.id);
    });
  }

  return descendants;
}

export function findFolderAndAncestors(
  folderId: string,
  folders: Folder[]
): string[] {
  const result: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    result.unshift(currentId);
    const folder = folders.find((f) => f.id === currentId);
    currentId = folder?.parentId ?? null;
  }

  return result;
}

export function buildFolderPath(folderId: string, folders: Folder[]): string {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return '';

  const path: string[] = [];
  let current: Folder | null = folder;

  while (current) {
    path.unshift(current.name);

    const parentId: string | null | undefined = current.parentId;
    current = parentId
      ? (folders.find((f) => f.id === parentId) ?? null)
      : null;
  }

  return path.join('/');
}

export function getFolderOptionsWithPaths(
  currentFolderId: string,
  folders: Folder[]
): { id: string; name: string; path: string; parentId: string | null }[] {
  const descendants = getAllDescendants(currentFolderId, folders);
  const availableParents = folders.filter(
    (f) => f.id !== currentFolderId && !descendants.includes(f.id)
  );

  const foldersWithPaths = availableParents.map((folder) => ({
    id: folder.id,
    name: folder.name,
    path: buildFolderPath(folder.id, folders),
    parentId: folder.parentId ?? null,
  }));

  foldersWithPaths.sort((a, b) => a.path.localeCompare(b.path));

  return foldersWithPaths;
}
