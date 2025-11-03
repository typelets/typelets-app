import { useMemo } from 'react';

import type { Note } from '@/src/services/api';

import type { FilterConfig, SortConfig } from './FilterSortSheet';

export function useNotesFiltering(
  notes: Note[],
  searchQuery: string | undefined,
  filterConfig: FilterConfig,
  sortConfig: SortConfig
) {
  return useMemo(() => {
    // Filter notes by search query
    const searchFilteredNotes = notes.filter(
      note =>
        note.title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        note.content.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    // Apply additional filters
    const additionallyFilteredNotes = searchFilteredNotes.filter(note => {
      if (filterConfig.showAttachmentsOnly && (!note.attachments || note.attachments.length === 0) && (!note.attachmentCount || note.attachmentCount === 0)) {
        return false;
      }
      if (filterConfig.showStarredOnly && !note.starred) {
        return false;
      }
      if (filterConfig.showHiddenOnly && !note.hidden) {
        return false;
      }
      return true;
    });

    // Sort notes
    return [...additionallyFilteredNotes].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.option) {
        case 'updated':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'title':
          aValue = (a.title || 'Untitled').toLowerCase();
          bValue = (b.title || 'Untitled').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [notes, searchQuery, filterConfig, sortConfig]);
}
