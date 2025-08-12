import { useCallback, useState } from 'react';

import type { Folder } from '@/types/note.ts';
import { canMoveToFolder } from '@/utils/folderTree';

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  dragOverIndex: number | null;
}

interface DragData {
  index: number;
  folderId: string;
}

export function useDragAndDrop(
  displayFolders: Folder[],
  folders: Folder[],
  onReorderFolders: (folderId: string, newIndex: number) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dragOverIndex: null,
  });

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      const folder = displayFolders[index];
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({ index, folderId: folder.id } as DragData)
      );

      setDragState({
        isDragging: true,
        draggedIndex: index,
        dragOverIndex: null,
      });

      const target = e.currentTarget as HTMLElement;
      target.style.opacity = '0.5';
    },
    [displayFolders]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (dragState.draggedIndex !== index) {
        setDragState((prev) => ({
          ...prev,
          dragOverIndex: index,
        }));
      }
    },
    [dragState.draggedIndex]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragState((prev) => ({ ...prev, dragOverIndex: null }));
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();

      try {
        const dragData = JSON.parse(
          e.dataTransfer.getData('text/plain')
        ) as DragData;
        const draggedIndex = dragData.index;
        const draggedFolderId = dragData.folderId;

        if (draggedIndex === dropIndex) {
          return;
        }

        const draggedFolder = displayFolders[draggedIndex];
        const targetFolder = displayFolders[dropIndex];

        // Check if the folder can be moved to the target location
        if (
          targetFolder.parentId &&
          !canMoveToFolder(draggedFolder.id, targetFolder.parentId, folders)
        ) {
          console.warn('Cannot move folder to its own descendant');
          return;
        }

        if (draggedFolder.parentId !== targetFolder.parentId) {
          return;
        }

        const allSiblingsInOrder = folders
          .filter((f) => f.parentId === draggedFolder.parentId)
          .sort((a, b) => {
            const aIndex = folders.findIndex((f) => f.id === a.id);
            const bIndex = folders.findIndex((f) => f.id === b.id);
            return aIndex - bIndex;
          });

        const draggedSiblingIndex = allSiblingsInOrder.findIndex(
          (f) => f.id === draggedFolderId
        );
        const targetSiblingIndex = allSiblingsInOrder.findIndex(
          (f) => f.id === targetFolder.id
        );

        if (draggedSiblingIndex === -1 || targetSiblingIndex === -1) {
          console.error('Could not find folder indices in siblings array');
          return;
        }

        await onReorderFolders(draggedFolderId, targetSiblingIndex);
      } catch (error) {
        console.error('Failed to reorder folders:', error);
      } finally {
        setDragState({
          isDragging: false,
          draggedIndex: null,
          dragOverIndex: null,
        });
      }
    },
    [displayFolders, folders, onReorderFolders]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDragState({
      isDragging: false,
      draggedIndex: null,
      dragOverIndex: null,
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
