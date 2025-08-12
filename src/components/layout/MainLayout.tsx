import { useState, useCallback } from 'react';
import { FolderOpen, FileText } from 'lucide-react';
import Index from '@/components/editor';
import FolderPanel from '@/components/folders/FolderPanel';
import NotesPanel from '@/components/notes/NotesPanel';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNotes } from '@/hooks/useNotes';
import { api } from '@/lib/api/api.ts';
import type { Note, Folder, ViewMode } from '@/types/note';

interface FolderPanelProps {
  currentView: ViewMode;
  folders: Folder[];
  selectedFolder: Folder | null;
  searchQuery: string;
  notesCount: number;
  starredCount: number;
  archivedCount: number;
  trashedCount: number;
  expandedFolders: Set<string>;
  onUpdateFolder: (
    folderId: string,
    name: string,
    color: string
  ) => Promise<void>;
  onUpdateFolderParent: (
    folderId: string,
    parentId: string | null
  ) => Promise<void>;
  onCreateNote: () => void;
  onCreateFolder: (name: string, color: string, parentId?: string) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onReorderFolders: (folderId: string, newIndex: number) => Promise<void>;
  onToggleFolderExpansion: (folderId: string) => void;
  onViewChange: (view: ViewMode) => void;
  onFolderSelect: (folder: Folder | null) => void;
  onSearchChange: (query: string) => void;
}

interface FilesPanelProps {
  notes: Note[];
  selectedNote: Note | null;
  selectedFolder: Folder | null;
  currentView: ViewMode;
  isFolderPanelOpen: boolean;
  onSelectNote: (note: Note) => void;
  onToggleStar: (noteId: string) => Promise<void>;
  onCreateNote: () => void;
  onToggleFolderPanel: () => void;
  onEmptyTrash: () => Promise<void>;
  isMobile?: boolean;
  onClose?: () => void;
}

interface EditorProps {
  note: Note | null;
  folders?: Folder[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onArchiveNote: (noteId: string) => Promise<void>;
  onToggleStar: (noteId: string) => Promise<void>;
}

export default function MainLayout() {
  const isMobile = useIsMobile();
  const [folderSidebarOpen, setFolderSidebarOpen] = useState(!isMobile);
  const [filesPanelOpen, setFilesPanelOpen] = useState(!isMobile);

  const {
    notes,
    folders,
    selectedNote,
    selectedFolder,
    currentView,
    searchQuery,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    expandedFolders,
    updateFolder,
    createNote,
    createFolder,
    deleteFolder,
    updateNote,
    deleteNote,
    toggleStar,
    archiveNote,
    toggleFolderExpansion,
    reorderFolders,
    setSelectedNote,
    setSelectedFolder,
    setCurrentView,
    setSearchQuery,
    refetch,
  } = useNotes();

  const handleCreateNote = useCallback(() => {
    void createNote();
    if (!filesPanelOpen) setFilesPanelOpen(true);
  }, [createNote, filesPanelOpen]);

  const handleCreateFolder = useCallback(
    (name: string, color: string, parentId?: string) => {
      void createFolder(name, color, parentId);
    },
    [createFolder]
  );

  const handleUpdateFolder = useCallback(
    async (folderId: string, name: string, color: string) => {
      await updateFolder(folderId, { name, color });
    },
    [updateFolder]
  );

  const handleUpdateFolderParent = useCallback(
    async (folderId: string, parentId: string | null) => {
      await updateFolder(folderId, { parentId });
    },
    [updateFolder]
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      await deleteFolder(folderId);
    },
    [deleteFolder]
  );

  const handleReorderFolders = useCallback(
    async (folderId: string, newIndex: number) => {
      try {
        await reorderFolders(folderId, newIndex);
      } catch (error) {
        console.error('Error reordering folders:', error);
        void refetch();
      }
    },
    [reorderFolders, refetch]
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      await api.emptyTrash();

      if (selectedNote && currentView === 'trash') {
        setSelectedNote(null);
      }

      await refetch();
    } catch (error) {
      console.error('Failed to empty trash:', error);
    }
  }, [selectedNote, currentView, setSelectedNote, refetch]);

  const handleToggleFolderPanel = useCallback(() => {
    setFolderSidebarOpen((prev) => {
      const newState = !prev;
      if (isMobile && newState) {
        setFilesPanelOpen(false);
      }
      return newState;
    });
  }, [isMobile]);

  const handleToggleFilesPanel = useCallback(() => {
    setFilesPanelOpen((prev) => {
      const newState = !prev;
      if (isMobile && newState) {
        setFolderSidebarOpen(false);
      }
      return newState;
    });
  }, [isMobile]);

  const handleSelectNote = useCallback(
    (note: Note) => {
      setSelectedNote(note);
      if (isMobile) {
        setFolderSidebarOpen(false);
        setFilesPanelOpen(false);
      }
    },
    [isMobile, setSelectedNote]
  );

  const handleClosePanels = useCallback(() => {
    setFolderSidebarOpen(false);
    setFilesPanelOpen(false);
  }, []);

  const sharedPanelProps: FolderPanelProps = {
    currentView,
    folders,
    selectedFolder,
    searchQuery,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    expandedFolders,
    onUpdateFolder: handleUpdateFolder,
    onUpdateFolderParent: handleUpdateFolderParent,
    onCreateNote: handleCreateNote,
    onCreateFolder: handleCreateFolder,
    onDeleteFolder: handleDeleteFolder,
    onReorderFolders: handleReorderFolders,
    onToggleFolderExpansion: toggleFolderExpansion,
    onViewChange: setCurrentView,
    onFolderSelect: setSelectedFolder,
    onSearchChange: setSearchQuery,
  };

  const sharedFilesPanelProps: FilesPanelProps = {
    notes,
    selectedNote,
    selectedFolder,
    currentView,
    isFolderPanelOpen: folderSidebarOpen,
    onSelectNote: handleSelectNote,
    onToggleStar: toggleStar,
    onCreateNote: handleCreateNote,
    onToggleFolderPanel: handleToggleFolderPanel,
    onEmptyTrash: handleEmptyTrash,
  };

  const editorProps: EditorProps = {
    note: selectedNote,
    folders,
    onUpdateNote: updateNote,
    onDeleteNote: deleteNote,
    onArchiveNote: archiveNote,
    onToggleStar: toggleStar,
  };

  if (isMobile) {
    return (
      <MobileLayout
        folderSidebarOpen={folderSidebarOpen}
        filesPanelOpen={filesPanelOpen}
        selectedNote={selectedNote}
        onClosePanels={handleClosePanels}
        onToggleFolderPanel={handleToggleFolderPanel}
        onToggleFilesPanel={handleToggleFilesPanel}
        folderPanelProps={sharedPanelProps}
        filesPanelProps={{
          ...sharedFilesPanelProps,
          isMobile: true,
          onClose: () => setFilesPanelOpen(false),
        }}
        editorProps={editorProps}
      />
    );
  }

  return (
    <DesktopLayout
      folderSidebarOpen={folderSidebarOpen}
      filesPanelOpen={filesPanelOpen}
      folderPanelProps={sharedPanelProps}
      filesPanelProps={sharedFilesPanelProps}
      editorProps={editorProps}
    />
  );
}

interface MobileLayoutProps {
  folderSidebarOpen: boolean;
  filesPanelOpen: boolean;
  selectedNote: Note | null;
  onClosePanels: () => void;
  onToggleFolderPanel: () => void;
  onToggleFilesPanel: () => void;
  folderPanelProps: FolderPanelProps;
  filesPanelProps: FilesPanelProps;
  editorProps: EditorProps;
}

function MobileLayout({
  folderSidebarOpen,
  filesPanelOpen,
  selectedNote,
  onClosePanels,
  onToggleFolderPanel,
  onToggleFilesPanel,
  folderPanelProps,
  filesPanelProps,
  editorProps,
}: MobileLayoutProps) {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {(folderSidebarOpen || filesPanelOpen) && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClosePanels}
        />
      )}

      <div
        className={`fixed top-0 left-0 z-50 h-full w-80 overflow-y-auto transition-transform duration-200 ease-in-out ${
          folderSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <FolderPanel isOpen={folderSidebarOpen} {...folderPanelProps} />
      </div>

      <div
        className={`fixed top-0 left-0 z-50 h-full w-80 overflow-y-auto transition-transform duration-200 ease-in-out ${
          filesPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NotesPanel isOpen={filesPanelOpen} {...filesPanelProps} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-border bg-background flex shrink-0 items-center justify-between border-b p-3">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFolderPanel}
              className="h-9 w-9 p-0"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFilesPanel}
              className="h-9 w-9 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>

          {selectedNote && (
            <div className="text-foreground mx-4 flex-1 truncate text-center text-sm font-medium">
              {selectedNote.title || 'Untitled Note'}
            </div>
          )}

          <div className="w-18" />
        </div>

        <main className="flex-1 overflow-hidden">
          <Index {...editorProps} />
        </main>
      </div>
    </div>
  );
}

interface DesktopLayoutProps {
  folderSidebarOpen: boolean;
  filesPanelOpen: boolean;
  folderPanelProps: FolderPanelProps;
  filesPanelProps: FilesPanelProps;
  editorProps: EditorProps;
}

function DesktopLayout({
  folderSidebarOpen,
  filesPanelOpen,
  folderPanelProps,
  filesPanelProps,
  editorProps,
}: DesktopLayoutProps) {
  return (
    <div className="bg-background flex h-screen">
      <FolderPanel isOpen={folderSidebarOpen} {...folderPanelProps} />

      <NotesPanel isOpen={filesPanelOpen} {...filesPanelProps} />

      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-hidden">
          <Index {...editorProps} />
        </main>
      </div>
    </div>
  );
}
