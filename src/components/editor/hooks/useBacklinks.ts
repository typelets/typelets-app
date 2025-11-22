import { useMemo } from 'react';
import type { Note } from '@/types/note';

export interface Backlink {
  noteId: string;
  noteTitle: string;
  folderName?: string;
}

/**
 * Extracts note link IDs from HTML content
 * Looks for <span data-type="noteLink" data-note-id="..."> elements
 */
function extractNoteLinksFromContent(content: string): string[] {
  if (!content) return [];

  const noteIds: string[] = [];

  // Match data-note-id attributes in noteLink spans
  const regex = /data-type="noteLink"[^>]*data-note-id="([^"]+)"/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    noteIds.push(match[1]);
  }

  // Also try the reverse order (data-note-id before data-type)
  const reverseRegex = /data-note-id="([^"]+)"[^>]*data-type="noteLink"/g;
  while ((match = reverseRegex.exec(content)) !== null) {
    if (!noteIds.includes(match[1])) {
      noteIds.push(match[1]);
    }
  }

  return noteIds;
}

/**
 * Hook to compute backlinks for a given note
 * Returns all notes that link to the current note
 */
export function useBacklinks(
  currentNoteId: string | undefined,
  allNotes: Note[]
): Backlink[] {
  return useMemo(() => {
    if (!currentNoteId) return [];

    const backlinks: Backlink[] = [];

    for (const note of allNotes) {
      // Skip the current note itself
      if (note.id === currentNoteId) continue;

      // Skip deleted, hidden, or archived notes
      if (note.deleted || note.hidden || note.archived) continue;

      // Extract note links from content
      const linkedNoteIds = extractNoteLinksFromContent(note.content);

      // Check if this note links to the current note
      if (linkedNoteIds.includes(currentNoteId)) {
        backlinks.push({
          noteId: note.id,
          noteTitle: note.title || 'Untitled',
          folderName: note.folder?.name,
        });
      }
    }

    // Sort alphabetically by title
    return backlinks.sort((a, b) => a.noteTitle.localeCompare(b.noteTitle));
  }, [currentNoteId, allNotes]);
}

/**
 * Hook to get all outgoing links from a note
 * Returns all notes that the current note links to
 */
export function useOutgoingLinks(
  currentNote: Note | null,
  allNotes: Note[]
): Backlink[] {
  return useMemo(() => {
    if (!currentNote) return [];

    const linkedNoteIds = extractNoteLinksFromContent(currentNote.content);

    if (linkedNoteIds.length === 0) return [];

    const outgoingLinks: Backlink[] = [];

    for (const noteId of linkedNoteIds) {
      const linkedNote = allNotes.find((n) => n.id === noteId);

      if (linkedNote && !linkedNote.deleted && !linkedNote.hidden) {
        outgoingLinks.push({
          noteId: linkedNote.id,
          noteTitle: linkedNote.title || 'Untitled',
          folderName: linkedNote.folder?.name,
        });
      }
    }

    // Sort alphabetically by title
    return outgoingLinks.sort((a, b) => a.noteTitle.localeCompare(b.noteTitle));
  }, [currentNote, allNotes]);
}

/**
 * Get link counts for a note (for display in notes list)
 */
export function useNoteLinkCounts(
  currentNoteId: string | undefined,
  allNotes: Note[]
): { backlinks: number; outgoing: number } {
  return useMemo(() => {
    if (!currentNoteId) return { backlinks: 0, outgoing: 0 };

    const currentNote = allNotes.find((n) => n.id === currentNoteId);
    const outgoing = currentNote
      ? extractNoteLinksFromContent(currentNote.content).length
      : 0;

    let backlinks = 0;
    for (const note of allNotes) {
      if (note.id === currentNoteId) continue;
      if (note.deleted || note.hidden || note.archived) continue;

      const linkedNoteIds = extractNoteLinksFromContent(note.content);
      if (linkedNoteIds.includes(currentNoteId)) {
        backlinks++;
      }
    }

    return { backlinks, outgoing };
  }, [currentNoteId, allNotes]);
}
