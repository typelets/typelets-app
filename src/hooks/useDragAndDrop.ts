import { useState } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { Folder } from '@/types/note.ts';
import { canMoveToFolder } from '@/utils/folderTree';
import { secureLogger } from '@/lib/utils/secureLogger';

interface DragState {
  activeId: string | null;
  overId: string | null;
}

export function useDragAndDrop(
  displayFolders: Folder[],
  folders: Folder[],
  onReorderFolders: (folderId: string, newIndex: number) => Promise<void>
) {
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    overId: null,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setDragState({
      activeId: event.active.id as string,
      overId: null,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setDragState((prev) => ({
      ...prev,
      overId: over?.id as string | null,
    }));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setDragState({
      activeId: null,
      overId: null,
    });

    if (!over || active.id === over.id) {
      return;
    }

    try {
      const draggedFolderId = active.id as string;
      const targetFolderId = over.id as string;

      const draggedIndex = displayFolders.findIndex((f) => f.id === draggedFolderId);
      const targetIndex = displayFolders.findIndex((f) => f.id === targetFolderId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return;
      }

      const draggedFolder = displayFolders[draggedIndex];
      const targetFolder = displayFolders[targetIndex];

      // Check if the folder can be moved to the target location
      if (
        targetFolder.parentId &&
        !canMoveToFolder(draggedFolder.id, targetFolder.parentId, folders)
      ) {
        secureLogger.warn('Cannot move folder to its own descendant');
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

      const targetSiblingIndex = allSiblingsInOrder.findIndex(
        (f) => f.id === targetFolder.id
      );

      if (targetSiblingIndex === -1) {
        secureLogger.error('Could not find folder index in siblings array');
        return;
      }

      await onReorderFolders(draggedFolderId, targetSiblingIndex);
    } catch (error) {
      secureLogger.error('Failed to reorder folders:', error);
    }
  };

  const handleDragCancel = () => {
    setDragState({
      activeId: null,
      overId: null,
    });
  };

  const activeFolder = dragState.activeId
    ? displayFolders.find((f) => f.id === dragState.activeId)
    : null;

  return {
    dragState,
    activeFolder,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
