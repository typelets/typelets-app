# WebSocket Integration for Real-Time Note Synchronization

This document describes the WebSocket integration implementation for real-time note synchronization across multiple browser sessions and devices.

## Overview

The WebSocket integration enables:
- **Real-time sync** across multiple browser sessions
- **Live collaboration potential** (foundation for future features)
- **Connection status indicators** in the UI
- **Automatic reconnection** with exponential backoff
- **Authenticated connections** using Clerk JWT tokens

## Architecture

### Core Components

1. **WebSocket Service** (`src/services/webSocketService.ts`)
   - Manages WebSocket connection lifecycle
   - Handles authentication and message routing
   - Implements reconnection logic with exponential backoff

2. **React Hook** (`src/hooks/useWebSocket.ts`)
   - Provides React integration for WebSocket functionality
   - Manages component state and event handlers
   - Auto-connects when user is authenticated

3. **Type Definitions** (`src/types/websocket.ts`)
   - Comprehensive TypeScript types for all WebSocket messages
   - Connection states and event handler interfaces

4. **UI Components** (`src/components/common/WebSocketStatus.tsx`)
   - Connection status indicators
   - Detailed connection information dropdowns
   - Sync notifications and error displays

## Message Protocol

### Outgoing Messages (Client → Server)

```javascript
// Authentication (required first)
{ type: "auth", token: "clerk_jwt_token_here" }

// Join/leave specific notes for updates
{ type: "join_note", noteId: "uuid" }
{ type: "leave_note", noteId: "uuid" }

// Send note updates to other devices
{
  type: "note_update",
  noteId: "uuid",
  changes: { title: "New Title", content: "New content" }
}

// Notify other devices of new notes
{
  type: "note_created",
  noteData: { id: "uuid", title: "New Note", /* full note object */ }
}

// Notify other devices of deletions
{ type: "note_deleted", noteId: "uuid" }
```

### Incoming Messages (Server → Client)

```javascript
// Connection established
{ type: "connection_established", message: "Please authenticate to continue" }

// Authentication responses
{ type: "auth_success", message: "Authentication successful", userId: "user_id" }
{ type: "auth_failed", message: "Authentication failed" }

// Real-time sync from other devices
{
  type: "note_sync",
  noteId: "uuid",
  changes: {...},
  updatedNote: {...},
  timestamp: 1234567890,
  fromUserId: "user_id"
}

{
  type: "note_created_sync",
  noteData: {...},
  timestamp: 1234567890,
  fromUserId: "user_id"
}

{
  type: "note_deleted_sync",
  noteId: "uuid",
  timestamp: 1234567890,
  fromUserId: "user_id"
}

// Confirmations
{
  type: "note_update_success",
  noteId: "uuid",
  updatedNote: {...},
  timestamp: 1234567890
}

{ type: "note_joined", noteId: "uuid", message: "Successfully joined note for real-time sync" }
{ type: "note_left", noteId: "uuid" }

// Errors
{ type: "error", message: "Error description" }
```

## Configuration

### Environment Variables

Add to your `.env.local` file:

```env
# WebSocket Configuration
VITE_WEBSOCKET_URL=ws://localhost:3000
```

### Default Behavior

If `VITE_WEBSOCKET_URL` is not set:
- **Development**: Uses `ws://localhost:3000`
- **Production**: Uses same host with `ws://` or `wss://` protocol

## Usage

### Basic Integration

The WebSocket integration is automatically enabled when you use the `useNotes` hook:

```typescript
import { useNotes } from '@/hooks/useNotes';

function MyComponent() {
  const {
    notes,
    selectedNote,
    webSocket, // WebSocket status and methods
    updateNote,
    createNote,
    deleteNote
  } = useNotes();

  // WebSocket status
  console.log('WebSocket status:', webSocket.status);
  console.log('Is connected:', webSocket.isConnected);
  console.log('Is authenticated:', webSocket.isAuthenticated);

  // Manual reconnection
  const handleReconnect = () => {
    webSocket.reconnect();
  };

  return (
    <div>
      <div>Status: {webSocket.status}</div>
      {webSocket.error && (
        <div>Error: {webSocket.error}</div>
      )}
    </div>
  );
}
```

### Custom WebSocket Hook

For advanced usage, you can use the WebSocket hook directly:

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function CustomComponent() {
  const webSocket = useWebSocket({
    autoConnect: true,
    onNoteSync: (message) => {
      console.log('Note synced from another device:', message.noteId);
      // Handle incoming sync
    },
    onNoteCreatedSync: (message) => {
      console.log('New note created on another device:', message.noteData);
      // Add to local state
    },
    onError: (error) => {
      console.error('WebSocket error:', error.message);
      // Handle errors
    },
    onAuthenticated: (userId) => {
      console.log('WebSocket authenticated for user:', userId);
    }
  });

  // Manual operations
  const joinNote = (noteId: string) => {
    webSocket.joinNote(noteId);
  };

  const sendUpdate = (noteId: string, changes: any) => {
    webSocket.sendNoteUpdate(noteId, changes);
  };

  return <div>Custom WebSocket Component</div>;
}
```

### UI Components

#### Status Indicator

```typescript
import { WebSocketStatus } from '@/components/common/WebSocketStatus';

function MyApp() {
  const { webSocket } = useNotes();

  return (
    <div>
      <WebSocketStatus
        status={webSocket.status}
        isConnected={webSocket.isConnected}
        isAuthenticated={webSocket.isAuthenticated}
        reconnectAttempts={webSocket.reconnectAttempts}
        lastSync={webSocket.lastSync}
        joinedNotes={webSocket.joinedNotes}
        error={webSocket.error}
        onReconnect={webSocket.reconnect}
        onClearError={webSocket.clearError}
        showDetails={true}
      />
    </div>
  );
}
```

#### Compact Status (for status bars)

```typescript
import { WebSocketStatusCompact } from '@/components/common/WebSocketStatus';

function StatusBar() {
  const { webSocket } = useNotes();

  return (
    <div className="status-bar">
      <WebSocketStatusCompact
        status={webSocket.status}
        isAuthenticated={webSocket.isAuthenticated}
        lastSync={webSocket.lastSync}
        onReconnect={webSocket.reconnect}
      />
    </div>
  );
}
```

## Connection Lifecycle

### 1. Initial Connection
- WebSocket connects to configured URL
- Server sends `connection_established` message
- Client automatically sends authentication with Clerk JWT

### 2. Authentication
- Server validates JWT token
- On success: sends `auth_success` with userId
- On failure: sends `auth_failed` with error message

### 3. Note Joining
- When user selects a note, client sends `join_note`
- Server confirms with `note_joined` message
- Client automatically leaves previous notes

### 4. Real-time Sync
- When user makes changes, client sends `note_update`
- Server broadcasts to other connected clients
- Other clients receive `note_sync` and update local state

### 5. Disconnection & Reconnection
- Automatic reconnection with exponential backoff
- Preserves authentication state
- Rejoins previously selected notes

## Error Handling

### Connection Errors
- Network failures trigger automatic reconnection
- Maximum retry attempts configurable (default: 10)
- Exponential backoff prevents server overload

### Authentication Errors
- Invalid JWT tokens display user-friendly errors
- Automatic re-authentication on token refresh

### Message Errors
- Invalid messages logged but don't crash the app
- Server errors displayed to user with option to reconnect

## Performance Considerations

### Message Queuing
- Messages queued when connection is down
- Automatic replay when connection restored
- Prevents data loss during temporary disconnections

### State Management
- Optimistic updates for better UX
- Server confirmation ensures consistency
- Conflict resolution for simultaneous edits

### Memory Management
- Automatic cleanup of event listeners
- Timeout management for pending operations
- Garbage collection of old sync data

## Security

### Authentication
- All WebSocket connections require valid Clerk JWT tokens
- Token validation on server side
- Automatic token refresh handling

### Message Validation
- All incoming messages validated against TypeScript types
- Server-side validation of user permissions
- Protection against malformed or malicious messages

### User Isolation
- Users only receive sync messages for their own notes
- Note access controlled by user ID from JWT
- No cross-user data leakage

## Troubleshooting

### Common Issues

**WebSocket won't connect:**
- Check `VITE_WEBSOCKET_URL` environment variable
- Verify WebSocket server is running
- Check browser console for connection errors

**Authentication fails:**
- Verify Clerk JWT token is valid
- Check network connectivity
- Ensure user is properly signed in

**Sync not working:**
- Verify both clients are authenticated
- Check that notes are properly joined
- Look for error messages in browser console

**Frequent reconnections:**
- Check network stability
- Verify server is properly handling WebSocket connections
- Review reconnection settings in `webSocketService.ts`

### Debug Mode

Enable detailed logging:

```typescript
// Add to your component
useEffect(() => {
  // Enable debug logging
  localStorage.setItem('debug', 'websocket:*');
}, []);
```

## Future Enhancements

### Planned Features
- **Collaborative editing**: Real-time cursor positions and live text editing
- **Presence indicators**: Show which users are viewing/editing notes
- **Conflict resolution**: Better handling of simultaneous edits
- **Offline support**: Queue changes when offline, sync when reconnected
- **Mobile app integration**: Extend WebSocket sync to React Native app

### Extension Points
- Custom message types for specific features
- Plugin system for additional sync behaviors
- Webhook integration for external services
- Analytics and monitoring integration

## Development

### Running the WebSocket Server

The WebSocket integration expects a server at the configured URL. Ensure your backend:

1. Implements the message protocol described above
2. Validates Clerk JWT tokens
3. Properly isolates users and their data
4. Handles reconnections gracefully

### Testing

```bash
# Run the development server
npm run dev

# Set WebSocket URL for testing
VITE_WEBSOCKET_URL=ws://localhost:3001 npm run dev

# Test with multiple browser sessions
# Open localhost:5173 in multiple tabs/windows
```

### Debugging

Use browser developer tools to monitor WebSocket connections:

1. Open Network tab
2. Filter by "WS" (WebSocket)
3. Click on WebSocket connection to see messages
4. Check Console tab for detailed logs

## Contributing

When making changes to the WebSocket integration:

1. Update TypeScript types in `src/types/websocket.ts`
2. Ensure backward compatibility with existing messages
3. Add tests for new functionality
4. Update this documentation
5. Test with multiple browser sessions

## License

This WebSocket integration is part of the Typelets application and follows the same MIT license.