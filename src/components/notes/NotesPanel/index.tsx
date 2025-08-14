import { Plus, PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import NotesList from '@/components/notes/NotesPanel/NotesList.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { Note, Folder as FolderType, ViewMode } from '@/types/note.ts';

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
  onCreateNote: () => void;
  onToggleFolderPanel: () => void;
  onEmptyTrash?: () => Promise<void>;
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
  isMobile = false,
  onClose,
}: FilesPanelProps) {
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

  return (
    <div
      className={`${isOpen ? 'w-80' : 'w-0'} border-border bg-background flex h-full flex-col overflow-hidden border-r transition-all duration-300`}
    >
      <div className="border-border flex h-17 shrink-0 items-center justify-between border-b p-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {isMobile && onClose ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              title="Close files panel"
              className="touch-manipulation"
            >
              <ArrowLeft />
            </Button>
          ) : (
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
              <span className="text-xs opacity-80">
                {notes.length} note{notes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isTrashView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateNote}
              className={`flex items-center justify-center ${isMobile ? 'h-9 w-9 touch-manipulation p-0' : 'h-6 w-6 p-0'} `}
              title="Create new note"
            >
              <Plus className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NotesList
          notes={notes}
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
