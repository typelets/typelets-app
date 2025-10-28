import { useState } from 'react';
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  FilterX,
  ChevronDown,
} from 'lucide-react';
import NotesList from '@/components/notes/NotesPanel/NotesList.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NOTE_TEMPLATES } from '@/constants/templates';
import type { Note, Folder as FolderType, ViewMode } from '@/types/note.ts';

type SortOption = 'updated' | 'created' | 'title' | 'starred';

interface SortConfig {
  option: SortOption;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  showAttachmentsOnly: boolean;
  showStarredOnly: boolean;
  showHiddenOnly: boolean;
}

interface FilesPanelProps {
  isOpen: boolean;
  notes: Note[];
  selectedNote: Note | null;
  selectedFolder: FolderType | null;
  folders?: FolderType[];
  currentView: ViewMode;
  isFolderPanelOpen: boolean;
  onSelectNote: (note: Note) => void;
  onToggleStar: (noteId: string) => void;
  onCreateNote: (templateContent?: { title: string; content: string }) => void;
  onToggleFolderPanel: () => void;
  onEmptyTrash?: () => Promise<void>;
  creatingNote?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function FilesPanel({
  isOpen,
  notes,
  selectedNote,
  selectedFolder,
  folders,
  currentView,
  isFolderPanelOpen,
  onSelectNote,
  onToggleStar,
  onCreateNote,
  onToggleFolderPanel,
  onEmptyTrash,
  creatingNote = false,
  isMobile = false,
  onClose,
}: FilesPanelProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    option: 'created',
    direction: 'desc',
  });

  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    showAttachmentsOnly: false,
    showStarredOnly: false,
    showHiddenOnly: false,
  });

  const sortNotes = (notes: Note[], config: SortConfig): Note[] => {
    return [...notes].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (config.option) {
        case 'updated':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'title':
          aValue = a.title.toLowerCase() || 'untitled';
          bValue = b.title.toLowerCase() || 'untitled';
          break;
        case 'starred':
          aValue = a.starred ? 1 : 0;
          bValue = b.starred ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterNotes = (notes: Note[], config: FilterConfig): Note[] => {
    return notes.filter((note) => {
      const hasAttachments = (note.attachmentCount && note.attachmentCount > 0) ||
        (note.attachments && note.attachments.length > 0);

      // A note is included if it passes ALL active filters (AND logic)
      // Exclude if any active filter condition fails
      const excludeByAttachments = config.showAttachmentsOnly && !hasAttachments;
      const excludeByStarred = config.showStarredOnly && !note.starred;
      const excludeByHidden = config.showHiddenOnly && !note.hidden;

      return !(excludeByAttachments || excludeByStarred || excludeByHidden);
    });
  };

  const filteredNotes = filterNotes(notes, filterConfig);
  const sortedNotes = sortNotes(filteredNotes, sortConfig);

  const getSortLabel = () => {
    switch (sortConfig.option) {
      case 'updated':
        return 'Last Modified';
      case 'created':
        return 'Created Date';
      case 'title':
        return sortConfig.direction === 'asc' ? 'Title (A-Z)' : 'Title (Z-A)';
      default:
        return 'Last Modified';
    }
  };

  const getFilterLabel = () => {
    const activeFilters = [];
    if (filterConfig.showAttachmentsOnly)
      activeFilters.push('With Attachments');
    if (filterConfig.showStarredOnly) activeFilters.push('Starred');
    if (filterConfig.showHiddenOnly) activeFilters.push('Hidden');

    if (activeFilters.length === 0) return `Sort: ${getSortLabel()}`;
    return `Filter: ${activeFilters.join(', ')} | Sort: ${getSortLabel()}`;
  };

  const hasActiveFilters =
    filterConfig.showAttachmentsOnly ||
    filterConfig.showStarredOnly ||
    filterConfig.showHiddenOnly;

  const getPanelTitle = () => {
    if (selectedFolder) {
      return selectedFolder.name;
    }

    switch (currentView) {
      case 'starred':
        return 'Starred Notes';
      case 'archived':
        return 'Archived Notes';
      case 'trash':
        return 'Trash';
      default:
        return 'All Notes';
    }
  };

  const handleNoteSelect = (note: Note) => {
    onSelectNote(note);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isTrashView = currentView === 'trash';

  const getEmptyMessage = () => {
    if (currentView === 'trash') {
      return 'Trash is empty';
    }
    if (selectedFolder) {
      return `No notes in "${selectedFolder.name}"`;
    }

    switch (currentView) {
      case 'starred':
        return 'No starred notes';
      case 'archived':
        return 'No archived notes';
      default:
        return 'No notes yet';
    }
  };

  if (!isOpen) {
    return (
      <div className="h-full w-0 overflow-hidden transition-all duration-300" />
    );
  }

  return (
    <div className="border-border bg-background flex h-full w-full flex-col overflow-hidden border-r transition-all duration-300 md:w-80 md:max-w-96 md:min-w-80">
      <div className="border-border flex h-17 shrink-0 items-center justify-between border-b p-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {!isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleFolderPanel}
              title={
                isFolderPanelOpen ? 'Hide folder panel' : 'Show folder panel'
              }
            >
              {isFolderPanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-lg leading-tight font-semibold">
              {getPanelTitle()}
            </h3>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              {selectedFolder && (
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: selectedFolder.color ?? '#6b7280' }}
                />
              )}
              <span className="text-[11px] opacity-80">
                {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                {sortedNotes.length !== notes.length &&
                  ` (${notes.length} total)`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`flex items-center justify-center ${isMobile ? 'h-9 w-9 touch-manipulation p-0' : 'h-6 w-6 p-0'}`}
                title={getFilterLabel()}
              >
                {hasActiveFilters ? (
                  <FilterX
                    className={`${isMobile ? 'h-3 w-3' : 'h-2 w-2'} text-primary`}
                  />
                ) : (
                  <Filter className={isMobile ? 'h-3 w-3' : 'h-2 w-2'} />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52" sideOffset={8}>
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                FILTER
              </div>
              <DropdownMenuItem
                onClick={() =>
                  setFilterConfig((prev) => ({
                    ...prev,
                    showAttachmentsOnly: !prev.showAttachmentsOnly,
                  }))
                }
                className={`${filterConfig.showAttachmentsOnly ? 'bg-accent' : ''} mb-1`}
              >
                {filterConfig.showAttachmentsOnly ? '✓' : '○'} Attachments
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setFilterConfig((prev) => ({
                    ...prev,
                    showStarredOnly: !prev.showStarredOnly,
                  }))
                }
                className={`${filterConfig.showStarredOnly ? 'bg-accent' : ''} mb-1`}
              >
                {filterConfig.showStarredOnly ? '✓' : '○'} Starred
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setFilterConfig((prev) => ({
                    ...prev,
                    showHiddenOnly: !prev.showHiddenOnly,
                  }))
                }
                className={`${filterConfig.showHiddenOnly ? 'bg-accent' : ''} mb-1`}
              >
                {filterConfig.showHiddenOnly ? '✓' : '○'} Hidden
              </DropdownMenuItem>

              {(filterConfig.showAttachmentsOnly ||
                filterConfig.showStarredOnly ||
                filterConfig.showHiddenOnly) && (
                <DropdownMenuItem
                  onClick={() =>
                    setFilterConfig({
                      showAttachmentsOnly: false,
                      showStarredOnly: false,
                      showHiddenOnly: false,
                    })
                  }
                  className="text-muted-foreground mb-1"
                >
                  Clear Filters
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                SORT BY
              </div>
              <DropdownMenuItem
                onClick={() =>
                  setSortConfig({ option: 'updated', direction: 'desc' })
                }
                className={`${sortConfig.option === 'updated' ? 'bg-accent' : ''} mb-1`}
              >
                Last Modified
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setSortConfig({ option: 'created', direction: 'desc' })
                }
                className={`${sortConfig.option === 'created' ? 'bg-accent' : ''} mb-1`}
              >
                Created Date
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setSortConfig({ option: 'title', direction: 'asc' })
                }
                className={`${sortConfig.option === 'title' && sortConfig.direction === 'asc' ? 'bg-accent' : ''} mb-1`}
              >
                Title (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setSortConfig({ option: 'title', direction: 'desc' })
                }
                className={`${sortConfig.option === 'title' && sortConfig.direction === 'desc' ? 'bg-accent' : ''} mb-1`}
              >
                Title (Z-A)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isTrashView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center justify-center gap-1 ${isMobile ? 'h-9 touch-manipulation px-3' : 'h-6 px-2'}`}
                  title="Create new note from template"
                  disabled={creatingNote}
                >
                  {creatingNote ? (
                    <div
                      className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} animate-spin rounded-full border-2 border-current border-t-transparent`}
                    />
                  ) : (
                    <>
                      <Plus className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                      {!isMobile && <ChevronDown className="h-2 w-2" />}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                  CREATE FROM TEMPLATE
                </div>
                {NOTE_TEMPLATES.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() =>
                      onCreateNote({
                        title: template.title,
                        content: template.content,
                      })
                    }
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {template.description}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NotesList
          notes={sortedNotes}
          selectedNote={selectedNote}
          onSelectNote={handleNoteSelect}
          onToggleStar={onToggleStar}
          isTrashView={isTrashView}
          onEmptyTrash={onEmptyTrash}
          emptyMessage={getEmptyMessage()}
          folders={folders}
        />
      </div>
    </div>
  );
}
