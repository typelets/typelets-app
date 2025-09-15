import type { Note, Folder } from './note';

// WebSocket Connection States
export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'disconnected'
  | 'error'
  | 'reconnecting';

// Outgoing Messages (Client → Server)
export interface WebSocketOutgoingMessage {
  type: 'auth' | 'join_note' | 'leave_note' | 'note_update' | 'note_created' | 'note_deleted' | 'folder_created' | 'folder_updated' | 'folder_deleted';
}

export interface AuthMessage extends WebSocketOutgoingMessage {
  type: 'auth';
  token: string;
}

export interface JoinNoteMessage extends WebSocketOutgoingMessage {
  type: 'join_note';
  noteId: string;
}

export interface LeaveNoteMessage extends WebSocketOutgoingMessage {
  type: 'leave_note';
  noteId: string;
}

export interface NoteUpdateMessage extends WebSocketOutgoingMessage {
  type: 'note_update';
  noteId: string;
  changes: {
    title?: string;
    content?: string;
    starred?: boolean;
    archived?: boolean;
    deleted?: boolean;
    hidden?: boolean;
    folderId?: string | null;
    tags?: string[];
  };
}

export interface NoteCreatedMessage extends WebSocketOutgoingMessage {
  type: 'note_created';
  noteData: Note;
}

export interface NoteDeletedMessage extends WebSocketOutgoingMessage {
  type: 'note_deleted';
  noteId: string;
}

export interface FolderCreatedMessage extends WebSocketOutgoingMessage {
  type: 'folder_created';
  folderData: Folder;
}

export interface FolderUpdatedMessage extends WebSocketOutgoingMessage {
  type: 'folder_updated';
  folderId: string;
  changes: {
    name?: string;
    color?: string;
    parentId?: string | null;
    order?: number;
  };
  updatedFolder: Folder;
}

export interface FolderDeletedMessage extends WebSocketOutgoingMessage {
  type: 'folder_deleted';
  folderId: string;
}

export type OutgoingMessage =
  | AuthMessage
  | JoinNoteMessage
  | LeaveNoteMessage
  | NoteUpdateMessage
  | NoteCreatedMessage
  | NoteDeletedMessage
  | FolderCreatedMessage
  | FolderUpdatedMessage
  | FolderDeletedMessage;

// Incoming Messages (Server → Client)
export interface WebSocketIncomingMessage {
  type: string;
  timestamp?: number;
  fromUserId?: string;
}

export interface ConnectionEstablishedMessage extends WebSocketIncomingMessage {
  type: 'connection_established';
  message: string;
}

export interface AuthSuccessMessage extends WebSocketIncomingMessage {
  type: 'auth_success';
  message: string;
  userId: string;
  sessionSecret?: string; // Optional session secret for message authentication
}

export interface AuthFailedMessage extends WebSocketIncomingMessage {
  type: 'auth_failed';
  message: string;
}

export interface NoteSyncMessage extends WebSocketIncomingMessage {
  type: 'note_sync';
  noteId: string;
  changes: Partial<Note>;
  updatedNote: Note;
  timestamp: number;
  fromUserId: string;
}

export interface NoteCreatedSyncMessage extends WebSocketIncomingMessage {
  type: 'note_created_sync';
  noteData: Note;
  timestamp: number;
  fromUserId: string;
}

export interface NoteDeletedSyncMessage extends WebSocketIncomingMessage {
  type: 'note_deleted_sync';
  noteId: string;
  timestamp: number;
  fromUserId: string;
}

export interface FolderCreatedSyncMessage extends WebSocketIncomingMessage {
  type: 'folder_created_sync';
  folderData: Folder;
  timestamp: number;
  fromUserId: string;
}

export interface FolderUpdatedSyncMessage extends WebSocketIncomingMessage {
  type: 'folder_updated_sync';
  folderId: string;
  updatedFolder: Folder;
  changes: {
    name?: string;
    color?: string;
    parentId?: string | null;
    order?: number;
  };
  timestamp: number;
  fromUserId: string;
}

export interface FolderDeletedSyncMessage extends WebSocketIncomingMessage {
  type: 'folder_deleted_sync';
  folderId: string;
  timestamp: number;
  fromUserId: string;
}

export interface NoteUpdateSuccessMessage extends WebSocketIncomingMessage {
  type: 'note_update_success';
  noteId: string;
  updatedNote: Note;
  timestamp: number;
}

export interface NoteJoinedMessage extends WebSocketIncomingMessage {
  type: 'note_joined';
  noteId: string;
  message: string;
}

export interface NoteLeftMessage extends WebSocketIncomingMessage {
  type: 'note_left';
  noteId: string;
}

export interface ErrorMessage extends WebSocketIncomingMessage {
  type: 'error';
  message: string;
  code?: string;
}

export interface PongMessage extends WebSocketIncomingMessage {
  type: 'pong';
}

export type IncomingMessage =
  | ConnectionEstablishedMessage
  | AuthSuccessMessage
  | AuthFailedMessage
  | NoteSyncMessage
  | NoteCreatedSyncMessage
  | NoteDeletedSyncMessage
  | FolderCreatedSyncMessage
  | FolderUpdatedSyncMessage
  | FolderDeletedSyncMessage
  | NoteUpdateSuccessMessage
  | NoteJoinedMessage
  | NoteLeftMessage
  | ErrorMessage
  | PongMessage;

// WebSocket Configuration
export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectBackoffFactor?: number;
  heartbeatInterval?: number;
}

// WebSocket Event Handlers
export interface WebSocketEventHandlers {
  onStatusChange?: (status: WebSocketStatus) => void;
  onNoteSync?: (message: NoteSyncMessage) => void;
  onNoteCreatedSync?: (message: NoteCreatedSyncMessage) => void;
  onNoteDeletedSync?: (message: NoteDeletedSyncMessage) => void;
  onFolderCreatedSync?: (message: FolderCreatedSyncMessage) => void;
  onFolderUpdatedSync?: (message: FolderUpdatedSyncMessage) => void;
  onFolderDeletedSync?: (message: FolderDeletedSyncMessage) => void;
  onNoteUpdateSuccess?: (message: NoteUpdateSuccessMessage) => void;
  onError?: (error: ErrorMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onAuthenticated?: (userId: string) => void;
}

// WebSocket Context State
export interface WebSocketState {
  status: WebSocketStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  error: string | null;
  reconnectAttempts: number;
  joinedNotes: Set<string>;
  lastSync: number | null;
}

// WebSocket Service Interface
export interface WebSocketServiceInterface {
  connect(): void;
  disconnect(): void;
  authenticate(token: string): void;
  joinNote(noteId: string): void;
  leaveNote(noteId: string): void;
  sendNoteUpdate(noteId: string, changes: Partial<Note>): void;
  sendNoteCreated(note: Note): void;
  sendNoteDeleted(noteId: string): void;
  sendFolderCreated(folder: Folder): void;
  sendFolderUpdated(folderId: string, changes: Partial<Folder>, updatedFolder: Folder): void;
  sendFolderDeleted(folderId: string): void;
  getStatus(): WebSocketStatus;
  isConnected(): boolean;
  isAuthenticated(): boolean;
  getJoinedNotes(): string[];
}