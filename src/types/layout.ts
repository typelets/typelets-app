import type { Note, Folder, ViewMode } from '@/types/note';
import type { WebSocketStatus } from '@/types/websocket';

export interface FolderPanelProps {
  currentView: ViewMode;
  folders: Folder[];
  selectedFolder: Folder | null;
  searchQuery: string;
  notesCount: number;
  starredCount: number;
  archivedCount: number;
  trashedCount: number;
  hiddenCount: number;
  publicCount: number;
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
  onCreateNote: (templateContent?: { title: string; content: string }) => void;
  onCreateFolder: (name: string, color: string, parentId?: string) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onReorderFolders: (folderId: string, newIndex: number) => Promise<void>;
  onToggleFolderExpansion: (folderId: string) => void;
  onViewChange: (view: ViewMode) => void;
  onFolderSelect: (folder: Folder | null) => void;
  onSearchChange: (query: string) => void;
  onRefreshNotes?: () => void;
}

export interface FilesPanelProps {
  notes: Note[];
  selectedNote: Note | null;
  selectedFolder: Folder | null;
  currentView: ViewMode;
  isFolderPanelOpen: boolean;
  onSelectNote: (note: Note) => void;
  onToggleStar: (noteId: string) => Promise<void>;
  onCreateNote: (templateContent?: { title: string; content: string }) => void;
  onCreateDiagram?: (templateCode?: string) => void;
  onCreateCode?: (templateData?: { language: string; code: string }) => void;
  onCreateSheets?: () => void;
  onToggleFolderPanel: () => void;
  onEmptyTrash: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  creatingNote?: boolean;
  loading?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

export interface EditorProps {
  note: Note | null;
  notes?: Note[]; // All notes for note linking feature
  folders?: Folder[];
  onUpdateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onArchiveNote: (noteId: string) => Promise<void>;
  onToggleStar: (noteId: string) => Promise<void>;
  starringStar?: boolean;
  onHideNote: (noteId: string) => Promise<void>;
  hidingNote?: boolean;
  onUnhideNote: (noteId: string) => Promise<void>;
  onRefreshNote?: (noteId: string) => Promise<void>;
  onSelectNote?: (note: Note) => void; // Navigate to a linked note
  onPublishNote?: (noteId: string, authorName?: string) => Promise<unknown>;
  onUnpublishNote?: (noteId: string) => Promise<boolean>;
  userId?: string;
  isNotesPanelOpen?: boolean;
  onToggleNotesPanel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  wsStatus?: WebSocketStatus;
  wsIsAuthenticated?: boolean;
  wsLastSync?: number | null;
  onWsReconnect?: () => void;
}
