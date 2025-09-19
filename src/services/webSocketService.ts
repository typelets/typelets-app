import type {
  WebSocketConfig,
  WebSocketStatus,
  WebSocketState,
  WebSocketEventHandlers,
  WebSocketServiceInterface,
  OutgoingMessage,
  IncomingMessage,
} from '@/types/websocket';
import type { Note, Folder } from '@/types/note';
import { WEBSOCKET_URL } from '@/constants';
import {
  type AuthenticatedMessage,
  initializeMessageAuth,
  signWebSocketMessage,
  verifyWebSocketMessage,
  clearMessageAuth,
} from '@/lib/utils/messageAuth';
import { SecureError, logSecureError } from '@/lib/errors/SecureError';

// Debug logging utility with security safeguards
// Set to false to disable debug logs, or use DEBUG_WEBSOCKET=true env var to enable
const DEBUG_WEBSOCKET = false;

// Message authentication is now working - backend matches frontend implementation
// Only allow disabling in development for debugging
const DISABLE_MESSAGE_AUTH =
  import.meta.env.VITE_DISABLE_MESSAGE_AUTH === 'true' && import.meta.env.DEV;

const sanitizeLogData = (data: unknown): unknown => {
  if (!data) return data;

  // Handle auth messages - redact token
  if (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'token' in data
  ) {
    const authData = data as Record<string, unknown>;
    if (authData.type === 'auth' && authData.token) {
      return {
        ...data,
        token: '[REDACTED]',
      };
    }
  }

  // Handle arrays (like message queues)
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  // Handle objects - recursively sanitize
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
};

const debugLog = (category: string, message: string, data?: unknown) => {
  if (DEBUG_WEBSOCKET) {
    // SECURITY: Always sanitize data before logging
    const sanitizedData = sanitizeLogData(data);
    // eslint-disable-next-line no-console
    console.log(`[WebSocket:${category}]`, message, sanitizedData || '');
  }
};

class WebSocketService implements WebSocketServiceInterface {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: WebSocketState;
  private eventHandlers: WebSocketEventHandlers = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private currentToken: string | null = null;
  private messageQueue: OutgoingMessage[] = [];
  private messageAuthEnabled = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectInterval: config.reconnectInterval ?? 1000,
      maxReconnectInterval: config.maxReconnectInterval ?? 30000,
      reconnectBackoffFactor: config.reconnectBackoffFactor ?? 2,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };

    this.state = {
      status: 'disconnected',
      isConnected: false,
      isAuthenticated: false,
      userId: null,
      error: null,
      reconnectAttempts: 0,
      joinedNotes: new Set(),
      lastSync: null,
    };
  }

  public setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public connect(): void {
    if (
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) {
      debugLog('Connection', 'Already connecting or connected');
      return;
    }

    debugLog('Connection', 'Attempting to connect to', this.config.url);
    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      debugLog('Connection', 'Connection failed', error);
      const secureError = new SecureError(
        `WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Unable to connect to server. Please check your internet connection.',
        'WS_001',
        'medium',
        error
      );
      logSecureError(secureError, 'WebSocketService.connect');
      this.handleConnectionError(secureError.userMessage);
    }
  }

  public disconnect(): void {
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    // Clear message authentication state
    clearMessageAuth();
    this.messageAuthEnabled = false;

    this.updateStatus('disconnected');
    this.state.isConnected = false;
    this.state.isAuthenticated = false;
    this.state.userId = null;
    this.state.joinedNotes.clear();
    this.messageQueue = [];

    this.eventHandlers.onDisconnect?.();
  }

  public authenticate(token: string): void {
    debugLog('Auth', 'Attempting authentication', {
      hasToken: !!token,
      isConnected: this.state.isConnected,
    });
    this.currentToken = token;

    if (this.state.isConnected) {
      this.sendMessage({ type: 'auth', token });
    } else {
      // Queue authentication for when connection is established
      debugLog('Auth', 'Queuing authentication for when connected');
      this.messageQueue.unshift({ type: 'auth', token });
    }
  }

  private async initializeMessageAuth(sessionSecret: string): Promise<void> {
    if (DISABLE_MESSAGE_AUTH) {
      debugLog(
        'Auth',
        'Message authentication disabled by DISABLE_MESSAGE_AUTH flag'
      );
      this.messageAuthEnabled = false;
      return;
    }

    try {
      debugLog(
        'Auth',
        'Initializing message auth with session secret length:',
        sessionSecret.length
      );
      debugLog(
        'Auth',
        'Previous auth state:',
        this.messageAuthEnabled ? 'enabled' : 'disabled'
      );
      await initializeMessageAuth(sessionSecret);
      this.messageAuthEnabled = true;
      debugLog('Auth', 'Message authentication initialized successfully');
    } catch (error) {
      const secureError = new SecureError(
        `Message authentication initialization failed: ${error}`,
        'Security features temporarily unavailable',
        'WS_002',
        'high',
        error
      );
      logSecureError(secureError, 'WebSocketService.initializeMessageAuth');
      debugLog('Auth', 'Failed to initialize message authentication', error);
      // Continue without message auth - graceful degradation
      this.messageAuthEnabled = false;
    }
  }

  private isAuthenticatedMessage(
    message: unknown
  ): message is AuthenticatedMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'payload' in message &&
      'signature' in message &&
      'timestamp' in message &&
      'nonce' in message
    );
  }

  public joinNote(noteId: string): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    if (!noteId || typeof noteId !== 'string') {
      return;
    }

    if (this.state.joinedNotes.has(noteId)) {
      return;
    }

    this.sendMessage({ type: 'join_note', noteId });
  }

  public leaveNote(noteId: string): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    if (!noteId || typeof noteId !== 'string') {
      return;
    }

    if (!this.state.joinedNotes.has(noteId)) {
      return;
    }

    this.sendMessage({ type: 'leave_note', noteId });
  }

  public sendNoteUpdate(noteId: string, changes: Partial<Note>): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    if (!noteId || typeof noteId !== 'string') {
      return;
    }

    this.sendMessage({
      type: 'note_update',
      noteId,
      changes: {
        title: changes.title,
        content: changes.content,
        starred: changes.starred,
        archived: changes.archived,
        deleted: changes.deleted,
        hidden: changes.hidden,
        hiddenAt: changes.hiddenAt,
        folderId: changes.folderId,
        tags: changes.tags,
      },
    });
  }

  public sendNoteCreated(note: Note): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    this.sendMessage({
      type: 'note_created',
      noteId: note.id,
      noteData: note,
    });
  }

  public sendNoteDeleted(noteId: string): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    this.sendMessage({
      type: 'note_deleted',
      noteId,
    });
  }

  public sendFolderCreated(folder: Folder): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    this.sendMessage({
      type: 'folder_created',
      folderId: folder.id,
      folderData: folder,
    });
  }

  public sendFolderUpdated(
    folderId: string,
    changes: {
      name?: string;
      color?: string;
      parentId?: string | null;
      order?: number;
    },
    updatedFolder: Folder
  ): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    this.sendMessage({
      type: 'folder_updated',
      folderId,
      changes: {
        name: changes.name,
        color: changes.color,
        parentId: changes.parentId,
      },
      updatedFolder,
    });
  }

  public sendFolderDeleted(folderId: string): void {
    if (!this.state.isAuthenticated) {
      return;
    }

    this.sendMessage({
      type: 'folder_deleted',
      folderId,
    });
  }

  public getStatus(): WebSocketStatus {
    return this.state.status;
  }

  public isConnected(): boolean {
    return this.state.isConnected;
  }

  public isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  public getJoinedNotes(): string[] {
    return Array.from(this.state.joinedNotes);
  }

  public getState(): Readonly<WebSocketState> {
    return { ...this.state };
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.state.isConnected = true;
      this.state.reconnectAttempts = 0;
      this.updateStatus('connected');
      this.startHeartbeat();
      void this.processMessageQueue();
      this.eventHandlers.onConnect?.();
    };

    this.ws.onclose = (event) => {
      this.state.isConnected = false;
      this.state.isAuthenticated = false;
      this.clearHeartbeatTimer();

      if (event.code !== 1000) {
        // Not a normal closure
        this.handleConnectionError(
          `Connection closed: ${event.reason || 'Unknown reason'}`
        );
      } else {
        this.updateStatus('disconnected');
      }
    };

    this.ws.onerror = () => {
      this.handleConnectionError('WebSocket error occurred');
    };

    this.ws.onmessage = (event) => {
      try {
        if (typeof event.data !== 'string') {
          return;
        }

        const rawMessage = JSON.parse(event.data);
        void this.handleIncomingMessage(rawMessage);
      } catch {
        // Silently ignore malformed messages
      }
    };
  }

  private async handleIncomingMessage(rawMessage: unknown): Promise<void> {
    try {
      let message: IncomingMessage;

      // Check if this is an authenticated message
      if (this.messageAuthEnabled && this.isAuthenticatedMessage(rawMessage)) {
        // Verify message signature
        const isValid = await verifyWebSocketMessage(
          rawMessage as AuthenticatedMessage
        );
        if (!isValid) {
          debugLog(
            'Receive',
            'Message signature verification failed - rejecting message'
          );

          // SECURITY: Strict mode - disconnect on authentication failure
          const authError = new SecureError(
            'WebSocket message signature verification failed',
            'Security validation failed. Reconnecting for safety.',
            'WS_002',
            'critical'
          );
          logSecureError(authError, 'WebSocketService.handleIncomingMessage');

          this.eventHandlers.onError?.({
            type: 'error',
            message: authError.userMessage,
            code: 'AUTH_FAILED_STRICT',
          });

          // Terminate connection immediately to prevent downgrade attacks
          this.disconnect();
          return;
        } else {
          // Message is valid, extract payload
          const authMessage = rawMessage as AuthenticatedMessage;
          if (authMessage.payload) {
            message = authMessage.payload as IncomingMessage;
          } else {
            debugLog(
              'Receive',
              'Authenticated message missing payload - rejecting'
            );
            return;
          }
        }
      } else {
        // Handle non-authenticated messages (auth, connection_established, etc.)
        message = rawMessage as IncomingMessage;
      }

      // Runtime validation for critical message properties
      if (!message || typeof message.type !== 'string') {
        debugLog('Receive', 'Invalid message structure', message);
        return;
      }

      debugLog('Receive', `Received ${message.type} message`, message);

      switch (message.type) {
        case 'connection_established':
          // Connection established, ready for authentication
          if (this.currentToken) {
            this.sendMessage({ type: 'auth', token: this.currentToken });
          }
          break;

        case 'auth_success':
          this.state.isAuthenticated = true;
          this.state.userId = message.userId;
          this.updateStatus('authenticated');

          // Initialize message authentication with session secret
          if (message.sessionSecret) {
            debugLog(
              'Auth',
              'Session secret received, initializing message authentication'
            );
            this.initializeMessageAuth(message.sessionSecret);
          } else {
            debugLog(
              'Auth',
              'No session secret provided - message authentication disabled'
            );
            this.messageAuthEnabled = false;
          }

          this.eventHandlers.onAuthenticated?.(message.userId);
          break;

        case 'auth_failed': {
          this.state.isAuthenticated = false;
          this.state.userId = null;
          debugLog('Auth', `Authentication failed: ${message.message}`);

          // Emit auth failure to trigger token refresh in the hook
          const authFailedError = new SecureError(
            `WebSocket authentication failed: ${message.message}`,
            'Authentication failed. Please log in again.',
            'WS_002',
            'high'
          );
          logSecureError(authFailedError, 'WebSocketService.auth_failed');

          this.eventHandlers.onError?.({
            type: 'error',
            message: authFailedError.userMessage,
            code: 'AUTH_FAILED',
          });
          break;
        }

        case 'note_sync':
          // Validate note sync message structure
          if (message.noteId && message.updatedNote) {
            this.state.lastSync = Date.now();
            this.eventHandlers.onNoteSync?.(message);
          }
          break;

        case 'note_created_sync':
          // Process note creation sync for cross-tab synchronization
          this.state.lastSync = Date.now();
          this.eventHandlers.onNoteCreatedSync?.(message);
          break;

        case 'note_deleted_sync':
          // Process note deletion sync for cross-tab synchronization
          this.state.lastSync = Date.now();
          this.eventHandlers.onNoteDeletedSync?.(message);
          break;

        case 'folder_created_sync':
          // Process folder sync messages for cross-tab synchronization
          this.state.lastSync = Date.now();
          this.eventHandlers.onFolderCreatedSync?.(message);
          break;

        case 'folder_updated_sync':
          // Process folder sync messages for cross-tab synchronization
          this.state.lastSync = Date.now();
          this.eventHandlers.onFolderUpdatedSync?.(message);
          break;

        case 'folder_deleted_sync':
          // Process folder sync messages for cross-tab synchronization
          this.state.lastSync = Date.now();
          this.eventHandlers.onFolderDeletedSync?.(message);
          break;

        case 'note_update_success':
          this.eventHandlers.onNoteUpdateSuccess?.(message);
          break;

        case 'note_joined':
          this.state.joinedNotes.add(message.noteId);
          break;

        case 'note_left':
          this.state.joinedNotes.delete(message.noteId);
          break;

        case 'pong':
          // Server response to ping - keep connection alive
          break;

        case 'error':
          this.eventHandlers.onError?.(message);
          break;

        default:
          debugLog('Receive', 'Unknown message type', {
            type: (message as { type?: string }).type,
            message,
          });
      }
    } catch (error) {
      debugLog('Receive', 'Error handling message', { error, rawMessage });

      // Emit error to handlers but don't crash the connection
      const messageError = new SecureError(
        `WebSocket message handling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Connection error occurred. Please try again.',
        'WS_003',
        'medium',
        error
      );
      logSecureError(messageError, 'WebSocketService.handleIncomingMessage');

      this.eventHandlers.onError?.({
        type: 'error',
        message: messageError.userMessage,
        code: 'MESSAGE_HANDLING_ERROR',
      });
    }
  }

  private async sendMessage(message: OutgoingMessage): Promise<void> {
    debugLog('Send', `Sending ${message.type} message`, message);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      debugLog('Send', 'Connection not ready, queuing message', {
        readyState: this.ws?.readyState,
      });
      this.messageQueue.push(message);
      return;
    }

    try {
      let messageToSend: string;

      // Sign message if authentication is enabled
      if (this.messageAuthEnabled) {
        try {
          const signedMessage = await signWebSocketMessage(message);
          messageToSend = JSON.stringify(signedMessage);
          debugLog('Send', 'Message signed successfully');
        } catch (error) {
          debugLog(
            'Send',
            'Message signing failed, dropping message for security',
            error
          );
          const signingError = new SecureError(
            `WebSocket message signing failed: ${error}`,
            'Unable to secure message. Please try again.',
            'WS_002',
            'high',
            error
          );
          logSecureError(signingError, 'WebSocketService.sendMessage');
          throw signingError;
        }
      } else {
        // Only allow unsigned messages when message auth is not yet initialized
        // This covers the initial auth handshake case
        if (message.type === 'auth' && !this.state.isAuthenticated) {
          debugLog(
            'Send',
            'Sending initial auth message unsigned (message auth not yet initialized)'
          );
          messageToSend = JSON.stringify(message);
        } else if (DISABLE_MESSAGE_AUTH) {
          debugLog(
            'Send',
            'Sending unsigned message (message auth disabled by flag)'
          );
          messageToSend = JSON.stringify(message);
        } else {
          // Don't allow unsigned messages in production after initial connection
          debugLog(
            'Send',
            'Rejecting unsigned message - authentication required'
          );
          const unsignedError = new SecureError(
            'Attempted to send unsigned message in authenticated session',
            'Security error occurred. Please reconnect.',
            'WS_002',
            'critical'
          );
          logSecureError(unsignedError, 'WebSocketService.sendMessage');
          throw unsignedError;
        }
      }

      this.ws.send(messageToSend);
    } catch (error) {
      debugLog('Send', 'Failed to send message, re-queuing', error);
      this.messageQueue.push(message); // Re-queue failed message
    }
  }

  private async processMessageQueue(): Promise<void> {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.sendMessage(message);
      }
    }
  }

  private updateStatus(status: WebSocketStatus): void {
    if (this.state.status !== status) {
      debugLog('Status', `Status changed: ${this.state.status} → ${status}`);
      this.state.status = status;
      this.eventHandlers.onStatusChange?.(status);
    }
  }

  private handleConnectionError(error: string): void {
    this.state.error = error;
    this.updateStatus('error');
    this.eventHandlers.onError?.({ type: 'error', message: error });

    if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.updateStatus('disconnected');
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.updateStatus('reconnecting');

    const delay = Math.min(
      this.config.reconnectInterval *
        Math.pow(
          this.config.reconnectBackoffFactor,
          this.state.reconnectAttempts
        ),
      this.config.maxReconnectInterval
    );

    this.reconnectTimer = setTimeout(() => {
      this.state.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeatTimer();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping message to keep connection alive
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Create and export singleton instance
const getWebSocketUrl = () => {
  const isDevelopment = import.meta.env.DEV;

  if (WEBSOCKET_URL) {
    return WEBSOCKET_URL;
  }

  // Default URLs based on environment
  if (isDevelopment) {
    return 'ws://localhost:3000';
  }

  // Production - use same host but with ws/wss protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
};

export const webSocketService = new WebSocketService({
  url: getWebSocketUrl(),
  maxReconnectAttempts: 10,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectBackoffFactor: 2,
  heartbeatInterval: 30000,
});

export default webSocketService;
