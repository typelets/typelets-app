import { useState, useCallback, useEffect } from 'react';
import { MasterPasswordDialog } from '@/components/password/MasterPasswordDialog';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import type { Tab } from './TabBar';
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

  // Tab state management
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Sync responsive panel states with local states for desktop
  useEffect(() => {
    if (!isMobile) {
      setFolderSidebarOpen(responsiveFolderPanel.isOpen);
      setFilesPanelOpen(responsiveNotesPanel.isOpen);
    }
  }, [isMobile, responsiveFolderPanel.isOpen, responsiveNotesPanel.isOpen]);

  const {
    notes,
    allNotes,
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
    publicCount,
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
    publishNote,
    unpublishNote,
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

  const handleCreateDiagram = useCallback(async (templateCode?: string) => {
    try {
      // If templateCode is provided, use it; otherwise create blank diagram
      const content = templateCode || '';

      await createNote(undefined, {
        title: 'Untitled Diagram',
        content,
        type: 'diagram'
      });

      if (!filesPanelOpen) setFilesPanelOpen(true);
    } catch (error) {
      console.error('Failed to create diagram:', error);
    }
  }, [createNote, filesPanelOpen]);

  const handleCreateCode = useCallback(async (templateData?: { language: string; code: string }) => {
    try {
      // If templateData is provided, use it; otherwise create blank code note
      const language = templateData?.language || 'javascript';
      const code = templateData?.code || '';

      // Store both language and code in content as JSON
      const content = JSON.stringify({ language, code });

      await createNote(undefined, {
        title: 'Untitled Code',
        content,
        type: 'code'
      });

      if (!filesPanelOpen) setFilesPanelOpen(true);
    } catch (error) {
      console.error('Failed to create code note:', error);
    }
  }, [createNote, filesPanelOpen]);

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
      // Check if tab already exists for this note
      const existingTab = openTabs.find(t => t.noteId === note.id);

      if (existingTab) {
        // Tab already open, just switch to it
        setActiveTabId(existingTab.id);
        setSelectedNote(note);
      } else {
        // Open in new tab
        const newTab: Tab = {
          id: `tab-${note.id}-${Date.now()}`,
          noteId: note.id,
          title: note.title || 'Untitled',
          type: note.type || 'note',
          isDirty: false,
          isPublished: note.isPublished,
        };
        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
        setSelectedNote(note);
      }

      if (isMobile) {
        setFolderSidebarOpen(false);
        setFilesPanelOpen(false);
      }
    },
    [isMobile, openTabs, setSelectedNote]
  );

  const handleTabClick = useCallback((tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      // Use allNotes to find notes that might be outside current view/folder
      const note = allNotes.find(n => n.id === tab.noteId);
      if (note) {
        setSelectedNote(note);
      }
    }
  }, [openTabs, allNotes, setSelectedNote]);

  const handleTabClose = useCallback((tabId: string) => {
    // No warning needed - autosave handles saving changes
    const tabIndex = openTabs.findIndex(t => t.id === tabId);
    const newTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(newTabs);

    // Switch to adjacent tab if closing active tab
    if (tabId === activeTabId) {
      const newActiveTab = newTabs[tabIndex - 1] || newTabs[0];
      if (newActiveTab) {
        setActiveTabId(newActiveTab.id);
        // Use allNotes to find notes that might be outside current view/folder
        const note = allNotes.find(n => n.id === newActiveTab.noteId);
        if (note) {
          setSelectedNote(note);
        }
      } else {
        setActiveTabId(null);
        setSelectedNote(null);
      }
    }
  }, [openTabs, activeTabId, allNotes, setSelectedNote]);

  const handleCloseAllTabs = useCallback(() => {
    // Close all tabs and clear selection
    setOpenTabs([]);
    setActiveTabId(null);
    setSelectedNote(null);
  }, [setSelectedNote]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    // Find and close the tab for this note
    const tabToClose = openTabs.find(t => t.noteId === noteId);
    if (tabToClose) {
      handleTabClose(tabToClose.id);
    }
    // Delete the note
    await deleteNote(noteId);
  }, [openTabs, handleTabClose, deleteNote]);

  const handleArchiveNote = useCallback(async (noteId: string) => {
    // Find and close the tab for this note
    const tabToClose = openTabs.find(t => t.noteId === noteId);
    if (tabToClose) {
      handleTabClose(tabToClose.id);
    }
    // Archive the note
    await archiveNote(noteId);
  }, [openTabs, handleTabClose, archiveNote]);

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (!selectedNote) return;

    setOpenTabs(tabs =>
      tabs.map(tab =>
        tab.noteId === selectedNote.id ? { ...tab, isDirty } : tab
      )
    );
  }, [selectedNote]);

  // Update tab properties when note changes
  useEffect(() => {
    if (!selectedNote?.id) return;

    setOpenTabs(tabs =>
      tabs.map(tab =>
        tab.noteId === selectedNote.id
          ? { ...tab, title: selectedNote.title || 'Untitled', type: selectedNote.type || 'note', isPublished: selectedNote.isPublished }
          : tab
      )
    );
  }, [selectedNote]);

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
          publishedAt: apiNote.publishedAt ? new Date(apiNote.publishedAt) : null,
          publicUpdatedAt: apiNote.publicUpdatedAt ? new Date(apiNote.publicUpdatedAt) : null,
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
    publicCount,
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
    onCreateDiagram: handleCreateDiagram,
    onCreateCode: handleCreateCode,
    onToggleFolderPanel: handleToggleFolderPanel,
    onEmptyTrash: handleEmptyTrash,
    onRefresh: refetch,
    creatingNote,
  };

  const editorProps: EditorProps = {
    note: selectedNote,
    notes: allNotes, // All notes for note linking (not filtered by view/search)
    folders,
    onUpdateNote: updateNote,
    onDeleteNote: handleDeleteNote,
    onArchiveNote: handleArchiveNote,
    onToggleStar: toggleStar,
    starringStar,
    onHideNote: hideNote,
    hidingNote,
    onUnhideNote: unhideNote,
    onRefreshNote: handleRefreshNote,
    onSelectNote: handleSelectNote, // For navigating to linked notes (opens in new tab)
    onPublishNote: publishNote,
    onUnpublishNote: unpublishNote,
    userId,
    isNotesPanelOpen: filesPanelOpen,
    onToggleNotesPanel: handleToggleNotesPanel,
    onDirtyChange: handleDirtyChange,
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
      openTabs={openTabs}
      activeTabId={activeTabId}
      onTabClick={handleTabClick}
      onTabClose={handleTabClose}
      onCloseAll={handleCloseAllTabs}
    />
  );
}
