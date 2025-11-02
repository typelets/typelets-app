import { useMemo } from 'react';

import type { Folder } from '@/src/services/api';

/**
 * Pre-calculate folder paths for all folders (O(n) once instead of O(n*m) repeatedly)
 * Returns a map of folderId -> full folder path string (e.g., "Parent / Child / Grandchild")
 */
export function useFolderPaths(allFolders: Folder[]) {
  return useMemo(() => {
    const pathMap = new Map<string, string>();

    const buildFolderPath = (folderId: string): string => {
      // Check cache first
      if (pathMap.has(folderId)) {
        return pathMap.get(folderId)!;
      }

      const folder = allFolders.find(f => f.id === folderId);
      if (!folder) return '';

      const path: string[] = [];
      let currentFolder: Folder | undefined = folder;

      while (currentFolder) {
        path.unshift(currentFolder.name);
        if (currentFolder.parentId) {
          // Check if parent path is already calculated
          if (pathMap.has(currentFolder.parentId)) {
            path.unshift(pathMap.get(currentFolder.parentId)!);
            break;
          }
          currentFolder = allFolders.find(f => f.id === currentFolder?.parentId);
        } else {
          break;
        }
      }

      const fullPath = path.join(' / ');
      pathMap.set(folderId, fullPath);
      return fullPath;
    };

    // Pre-calculate paths for all folders
    allFolders.forEach(folder => buildFolderPath(folder.id));

    return pathMap;
  }, [allFolders]);
}
