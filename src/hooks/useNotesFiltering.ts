import { useMemo } from 'react';
import type { Note, Folder, ViewMode } from '@/types/note';
import { getDescendantIds } from '@/utils/folderTree';

interface UseNotesFilteringParams {
  notes: Note[];
  folders: Folder[];
  selectedFolder: Folder | null;
  currentView: ViewMode;
  searchQuery: string;
}

export function useNotesFiltering({
  notes,
  folders,
  selectedFolder,
  currentView,
  searchQuery,
}: UseNotesFilteringParams) {
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Search filtering
      if (searchQuery.trim()) {
        const searchableContent = `${note.title} ${note.content} ${note.tags.join(' ')}`;
        const matchesSearch =
          searchableContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          );

        if (!matchesSearch) return false;
      }

      // Folder filtering
      if (selectedFolder) {
        const folderIds = [
          selectedFolder.id,
          ...getDescendantIds(selectedFolder.id, folders),
        ];
        if (!folderIds.includes(note.folderId ?? '')) return false;
        return !note.deleted && !note.archived;
      }

      // View filtering
      switch (currentView) {
        case 'starred':
          return note.starred && !note.deleted && !note.archived;
        case 'archived':
          return note.archived && !note.deleted;
        case 'trash':
          return note.deleted;
        case 'hidden':
          return note.hidden && !note.deleted;
        case 'public':
          return note.isPublished && !note.deleted && !note.archived;
        default:
          return !note.deleted && !note.archived;
      }
    });
  }, [notes, searchQuery, currentView, selectedFolder, folders]);

  // Calculate counts for different views in a single pass
  const counts = useMemo(() => {
    return notes.reduce(
      (acc, note) => {
        if (!note.deleted && !note.archived) {
          acc.notesCount++;
          if (note.starred) acc.starredCount++;
          if (note.isPublished) acc.publicCount++;
        }
        if (note.archived && !note.deleted) acc.archivedCount++;
        if (note.deleted) acc.trashedCount++;
        if (note.hidden && !note.deleted) acc.hiddenCount++;
        return acc;
      },
      {
        notesCount: 0,
        starredCount: 0,
        archivedCount: 0,
        trashedCount: 0,
        hiddenCount: 0,
        publicCount: 0,
      }
    );
  }, [notes]);

  return {
    filteredNotes,
    ...counts,
  };
}
