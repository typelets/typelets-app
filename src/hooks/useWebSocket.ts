import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { webSocketService } from '@/services/webSocketService';
import type {
  WebSocketStatus,
  WebSocketState,
  NoteSyncMessage,
  NoteCreatedSyncMessage,
  NoteDeletedSyncMessage,
  FolderCreatedSyncMessage,
  FolderUpdatedSyncMessage,
  FolderDeletedSyncMessage,
  NoteUpdateSuccessMessage,
  ErrorMessage,
} from '@/types/websocket';
import type { Note, Folder } from '@/types/note';
import { secureLogger } from '@/lib/utils/secureLogger';

// Debug logging for token refresh
const debugLog = (_category: string, _message: string) => {
  // Disabled by default - uncomment next line if you need debug logs
  // if (import.meta.env.DEV) console.log(`[WebSocket:${category}]`, message);
};

interface UseWebSocketOptions {
  autoConnect?: boolean;
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

export interface UseWebSocketReturn {
  // Connection state
  status: WebSocketStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  error: string | null;
  reconnectAttempts: number;
  lastSync: number | null;
  joinedNotes: string[];

  // Connection methods
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Note methods
  joinNote: (noteId: string) => void;
  leaveNote: (noteId: string) => void;
  sendNoteUpdate: (noteId: string, changes: Partial<Note>) => void;
  sendNoteCreated: (note: Note) => void;
  sendNoteDeleted: (noteId: string) => void;

  // Folder methods
  sendFolderCreated: (folder: Folder) => void;
  sendFolderUpdated: (folderId: string, changes: { name?: string; color?: string; parentId?: string | null; order?: number }, updatedFolder: Folder) => void;
  sendFolderDeleted: (folderId: string) => void;

  // Utility methods
  clearError: () => void;
  getConnectionInfo: () => {
    status: WebSocketStatus;
    isConnected: boolean;
    isAuthenticated: boolean;
    lastSync: number | null;
    joinedNotes: number;
  };
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { getToken, isSignedIn, userId: clerkUserId } = useAuth();
  const [state, setState] = useState<WebSocketState>(() => webSocketService.getState());
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent stale closures
  const optionsRef = useRef(options);
  const isInitializedRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Setup WebSocket event handlers
  useEffect(() => {
    const handlers = {
      onStatusChange: (status: WebSocketStatus) => {
        setState(prevState => ({ ...prevState, status }));
      },

      onNoteSync: (message: NoteSyncMessage) => {
        optionsRef.current.onNoteSync?.(message);
      },

      onNoteCreatedSync: (message: NoteCreatedSyncMessage) => {
        optionsRef.current.onNoteCreatedSync?.(message);
      },

      onNoteDeletedSync: (message: NoteDeletedSyncMessage) => {
        optionsRef.current.onNoteDeletedSync?.(message);
      },

      onFolderCreatedSync: (message: FolderCreatedSyncMessage) => {
        optionsRef.current.onFolderCreatedSync?.(message);
      },

      onFolderUpdatedSync: (message: FolderUpdatedSyncMessage) => {
        optionsRef.current.onFolderUpdatedSync?.(message);
      },

      onFolderDeletedSync: (message: FolderDeletedSyncMessage) => {
        optionsRef.current.onFolderDeletedSync?.(message);
      },

      onNoteUpdateSuccess: (message: NoteUpdateSuccessMessage) => {
        optionsRef.current.onNoteUpdateSuccess?.(message);
      },

      onError: async (errorMessage: ErrorMessage) => {
        setError(errorMessage.message);

        // Handle auth failures by attempting to refresh token
        if (errorMessage.code === 'AUTH_FAILED' && isSignedIn) {
          debugLog('Auth', 'Auth failed, attempting token refresh');
          try {
            const freshToken = await getToken();
            if (freshToken) {
              debugLog('Auth', 'Retrying authentication with fresh token');
              webSocketService.authenticate(freshToken);
              lastTokenRef.current = freshToken;
              return; // Don't propagate error if we're retrying
            }
          } catch (error) {
            secureLogger.error('Token refresh failed after auth failure', error);
          }
        }

        optionsRef.current.onError?.(errorMessage);
      },

      onConnect: () => {
        setError(null);
        setState(webSocketService.getState());
        optionsRef.current.onConnect?.();
      },

      onDisconnect: () => {
        setState(webSocketService.getState());
        optionsRef.current.onDisconnect?.();
      },

      onAuthenticated: (userId: string) => {
        setState(webSocketService.getState());
        optionsRef.current.onAuthenticated?.(userId);
      },
    };

    webSocketService.setEventHandlers(handlers);

    // Cleanup handlers on unmount
    return () => {
      webSocketService.setEventHandlers({});
    };
  }, [isSignedIn, getToken]);

  // Handle authentication and auto-connection with token refresh
  useEffect(() => {
    const handleAuth = async () => {
      if (!isSignedIn || !clerkUserId) {
        if (webSocketService.isConnected()) {
          webSocketService.disconnect();
        }
        return;
      }

      try {
        // ALWAYS get a fresh token to avoid expiration issues
        const token = await getToken();
        if (!token) {
          return;
        }

        // Always authenticate with fresh token if we're connected
        // This handles token refresh automatically
        lastTokenRef.current = token;

        if (webSocketService.isConnected()) {
          webSocketService.authenticate(token);
        } else if (options.autoConnect !== false) {
          webSocketService.connect();
          // Authentication will happen automatically after connection
          setTimeout(() => {
            webSocketService.authenticate(token);
          }, 100);
        }
      } catch (error) {
        secureLogger.error('WebSocket authentication failed', error);
        setError('Authentication failed - token may be expired');
      }
    };

    if (isSignedIn && !isInitializedRef.current) {
      isInitializedRef.current = true;
      handleAuth();
    } else if (isSignedIn) {
      handleAuth();
    }
  }, [isSignedIn, clerkUserId, getToken, options.autoConnect]);

  // Set up periodic token refresh to prevent expiration
  useEffect(() => {
    if (!isSignedIn) return;

    // Refresh token every 30 minutes (tokens typically expire in 1 hour)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        const freshToken = await getToken();
        if (freshToken && webSocketService.isConnected()) {
          debugLog('Auth', 'Refreshing JWT token proactively');
          webSocketService.authenticate(freshToken);
          lastTokenRef.current = freshToken;
        }
      } catch (error) {
        secureLogger.error('WebSocket token refresh failed', error);
        setError('Token refresh failed');
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(tokenRefreshInterval);
  }, [isSignedIn, getToken]);

  // Periodically sync state with service
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = webSocketService.getState();
      setState(prevState => {
        if (JSON.stringify(prevState) !== JSON.stringify(currentState)) {
          return currentState;
        }
        return prevState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Connection methods
  const connect = useCallback(() => {
    setError(null);
    webSocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setState(webSocketService.getState());
  }, []);

  const reconnect = useCallback(() => {
    webSocketService.disconnect();
    setTimeout(() => {
      webSocketService.connect();
    }, 1000);
  }, []);

  // Note methods
  const joinNote = useCallback((noteId: string) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.joinNote(noteId);
  }, []);

  const leaveNote = useCallback((noteId: string) => {
    webSocketService.leaveNote(noteId);
  }, []);

  const sendNoteUpdate = useCallback((noteId: string, changes: Partial<Note>) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendNoteUpdate(noteId, changes);
  }, []);

  const sendNoteCreated = useCallback((note: Note) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendNoteCreated(note);
  }, []);

  const sendNoteDeleted = useCallback((noteId: string) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendNoteDeleted(noteId);
  }, []);

  const sendFolderCreated = useCallback((folder: Folder) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendFolderCreated(folder);
  }, []);

  const sendFolderUpdated = useCallback((folderId: string, changes: Partial<Folder>, updatedFolder: Folder) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendFolderUpdated(folderId, changes, updatedFolder);
  }, []);

  const sendFolderDeleted = useCallback((folderId: string) => {
    if (!webSocketService.isAuthenticated()) {
      return;
    }
    webSocketService.sendFolderDeleted(folderId);
  }, []);

  // Utility methods
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getConnectionInfo = useCallback(() => ({
    status: state.status,
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    lastSync: state.lastSync,
    joinedNotes: state.joinedNotes.size,
  }), [state]);

  return {
    // State
    status: state.status,
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    userId: state.userId,
    error: error || state.error,
    reconnectAttempts: state.reconnectAttempts,
    lastSync: state.lastSync,
    joinedNotes: Array.from(state.joinedNotes),

    // Methods
    connect,
    disconnect,
    reconnect,
    joinNote,
    leaveNote,
    sendNoteUpdate,
    sendNoteCreated,
    sendNoteDeleted,
    sendFolderCreated,
    sendFolderUpdated,
    sendFolderDeleted,
    clearError,
    getConnectionInfo,
  };
}