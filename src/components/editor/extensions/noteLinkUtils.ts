import type { Note } from '@/types/note';

export interface NoteLinkItem {
  noteId: string;
  noteTitle: string;
  folderName?: string;
}

/**
 * Helper function to convert notes to suggestion items
 */
export function notesToSuggestionItems(
  notes: Note[],
  currentNoteId?: string
): NoteLinkItem[] {
  return notes
    .filter((note) => {
      // Exclude current note, deleted, and hidden notes
      if (note.id === currentNoteId) return false;
      if (note.deleted) return false;
      if (note.hidden) return false;
      if (note.archived) return false;
      return true;
    })
    .map((note) => ({
      noteId: note.id,
      noteTitle: note.title || 'Untitled',
      folderName: note.folder?.name,
    }))
    .sort((a, b) => a.noteTitle.localeCompare(b.noteTitle));
}
