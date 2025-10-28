import { useState, useCallback, useEffect } from 'react';
import { MasterPasswordDialog } from '@/components/password/MasterPasswordDialog';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  useResponsiveFolderPanel,
  useResponsiveNotesPanel,
} from '@/hooks/useResponsiveFolderPanel';
import { useMasterPassword } from '@/hooks/useMasterPassword';
import { useNotes } from '@/hooks/useNotes';
import { api } from '@/lib/api/api';
import type {
  FolderPanelProps,
  FilesPanelProps,
  EditorProps,
} from '@/types/layout';
import type { Note } from '@/types/note';

export default function MainLayout() {
  const isMobile = useIsMobile();
  const { needsUnlock, isChecking, userId, handleUnlockSuccess } =
    useMasterPassword();

  // Use responsive panel hooks for desktop view
  const responsiveFolderPanel = useResponsiveFolderPanel(!isMobile);
  const responsiveNotesPanel = useResponsiveNotesPanel(!isMobile);
  const [folderSidebarOpen, setFolderSidebarOpen] = useState(!isMobile);
  const [filesPanelOpen, setFilesPanelOpen] = useState(!isMobile);

  // Sync responsive panel states with local states for desktop
  useEffect(() => {
    if (!isMobile) {
      setFolderSidebarOpen(responsiveFolderPanel.isOpen);
      setFilesPanelOpen(responsiveNotesPanel.isOpen);
    }
  }, [isMobile, responsiveFolderPanel.isOpen, responsiveNotesPanel.isOpen]);

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
    hiddenCount,
    expandedFolders,
    updateFolder,
    createNote,
    creatingNote,
    createFolder,
    deleteFolder,
    updateNote,
    deleteNote,
    toggleStar,
    starringStar,
    archiveNote,
    hideNote,
    hidingNote,
    unhideNote,
    toggleFolderExpansion,
    reorderFolders,
    setSelectedNote,
    setSelectedFolder,
    setCurrentView,
    setSearchQuery,
    setNotes,
    refetch,
    reinitialize,
    // BACKLOG: WebSocket moved to upcoming release
    // webSocket,
  } = useNotes();

  const handleCreateNote = useCallback(
    (templateContent?: { title: string; content: string }) => {
      void createNote(undefined, templateContent);
      if (!filesPanelOpen) setFilesPanelOpen(true);
    },
    [createNote, filesPanelOpen]
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      // Clear selected note if it's in trash, regardless of current view
      if (selectedNote?.deleted) {
        setSelectedNote(null);
      }

      // Optimistically remove all trashed notes from UI immediately
      setNotes(prevNotes => prevNotes.filter(note => !note.deleted));

      await api.emptyTrash();
      await refetch();
    } catch (error) {
      console.error('Failed to empty trash:', error);
      // Refetch to restore correct state on error
      await refetch();
    }
  }, [selectedNote, setSelectedNote, setNotes, refetch]);

  const handleToggleFolderPanel = useCallback(() => {
    if (!isMobile) {
      // Use responsive toggle for desktop
      responsiveFolderPanel.toggleFolderPanel();
    } else {
      // Manual toggle for mobile
      setFolderSidebarOpen((prev) => {
        const newState = !prev;
        if (newState) {
          setFilesPanelOpen(false);
        }
        return newState;
      });
    }
  }, [isMobile, responsiveFolderPanel]);

  const handleToggleNotesPanel = useCallback(() => {
    if (!isMobile) {
      // Use responsive toggle for desktop
      responsiveNotesPanel.toggleNotesPanel();
    } else {
      // Manual toggle for mobile
      setFilesPanelOpen((prev) => !prev);
    }
  }, [isMobile, responsiveNotesPanel]);

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

  const handlePasswordChange = useCallback(() => {
    setSelectedNote(null);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [setSelectedNote]);

  const handleRefreshNote = useCallback(
    async (noteId: string) => {
      try {
        const apiNote = await api.getNote(noteId);
        const refreshedNote: Note = {
          ...apiNote,
          createdAt: new Date(apiNote.createdAt),
          updatedAt: new Date(apiNote.updatedAt),
          hiddenAt: apiNote.hiddenAt ? new Date(apiNote.hiddenAt) : null,
        };

        // Update the note in the notes list
        setNotes((prev) =>
          prev.map((note) => {
            if (note.id === noteId) {
              // Preserve attachments and folder from local state
              return {
                ...refreshedNote,
                attachments: note.attachments,
                folder: note.folder,
              };
            }
            return note;
          })
        );

        // Update selected note
        setSelectedNote((prev) => {
          if (prev?.id === noteId) {
            return {
              ...refreshedNote,
              attachments: prev.attachments,
              folder: prev.folder,
            };
          }
          return prev;
        });
      } catch (error) {
        console.error('Failed to refresh note:', error);
      }
    },
    [setSelectedNote, setNotes]
  );

  const handleMasterPasswordUnlock = useCallback(() => {
    handleUnlockSuccess();
    // Force re-initialize and fetch data after successful unlock/setup
    void reinitialize();
  }, [handleUnlockSuccess, reinitialize]);

  const folderPanelProps: FolderPanelProps = {
    currentView,
    folders,
    selectedFolder,
    searchQuery,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    hiddenCount,
    expandedFolders,
    onUpdateFolder: async (id, name, color) => {
      await updateFolder(id, { name, color });
    },
    onUpdateFolderParent: async (id, parentId) => {
      await updateFolder(id, { parentId });
    },
    onCreateNote: handleCreateNote,
    onCreateFolder: createFolder,
    onDeleteFolder: deleteFolder,
    onReorderFolders: reorderFolders,
    onToggleFolderExpansion: toggleFolderExpansion,
    onViewChange: setCurrentView,
    onFolderSelect: setSelectedFolder,
    onSearchChange: setSearchQuery,
    onRefreshNotes: handlePasswordChange,
  };

  const filesPanelProps: FilesPanelProps = {
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
    creatingNote,
  };

  const editorProps: EditorProps = {
    note: selectedNote,
    folders,
    onUpdateNote: updateNote,
    onDeleteNote: deleteNote,
    onArchiveNote: archiveNote,
    onToggleStar: toggleStar,
    starringStar,
    onHideNote: hideNote,
    hidingNote,
    onUnhideNote: unhideNote,
    onRefreshNote: handleRefreshNote,
    userId,
    isNotesPanelOpen: filesPanelOpen,
    onToggleNotesPanel: handleToggleNotesPanel,
    // BACKLOG: WebSocket moved to upcoming release
    // wsStatus: webSocket.status,
    // wsIsAuthenticated: webSocket.isAuthenticated,
    // wsLastSync: webSocket.lastSync,
    // onWsReconnect: webSocket.reconnect,
  };

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-2xl">🔐</div>
          <p className="text-gray-600">Checking encryption status...</p>
        </div>
      </div>
    );
  }

  if (needsUnlock && userId) {
    return (
      <>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔐</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Secure Notes
            </h1>
            <p className="text-gray-600">
              Your notes are protected with end-to-end encryption
            </p>
          </div>
        </div>
        <MasterPasswordDialog
          userId={userId}
          onSuccess={handleMasterPasswordUnlock}
        />
      </>
    );
  }

  return isMobile ? (
    <MobileLayout
      selectedNote={selectedNote}
      folderPanelProps={folderPanelProps}
      filesPanelProps={{
        ...filesPanelProps,
        isMobile: true,
        onClose: () => setFilesPanelOpen(false),
      }}
      editorProps={editorProps}
    />
  ) : (
    <DesktopLayout
      folderSidebarOpen={folderSidebarOpen}
      filesPanelOpen={filesPanelOpen}
      folderPanelProps={folderPanelProps}
      filesPanelProps={filesPanelProps}
      editorProps={editorProps}
    />
  );
}
