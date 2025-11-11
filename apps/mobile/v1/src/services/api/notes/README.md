# Notes API - Modular Structure

The notes API has been modularized to improve maintainability and make it easier to find and fix bugs.

## Structure

```
services/api/notes/
├── index.ts          # Main export, combines all modules
├── crud.ts           # Create, update, delete operations (~400 lines)
├── core.ts           # Query and other operations (to be further extracted)
├── cache-sync.ts     # Cache synchronization utilities
├── shared.ts         # Shared helper functions
└── README.md         # This file
```

## Modules

### `crud.ts` - Create, Update, Delete Operations
**~400 lines** | ✅ Modularized

Contains:
- `createNote()` - Create new notes with offline support
- `updateNote()` - Update existing notes with cache sync
- `deleteNote()` - Delete notes

**Key Features:**
- Automatic cache synchronization (SQLite + AsyncStorage)
- Offline support with optimistic updates
- Proper error handling and logging

### `cache-sync.ts` - Cache Synchronization
**~50 lines** | ✅ Modularized

Contains:
- `updateSQLiteCache()` - Update local database cache
- `clearAsyncStorageCaches()` - Clear preview caches
- `syncAllCaches()` - Sync all cache layers

**Purpose:** Centralized cache management to prevent stale data issues.

### `shared.ts` - Shared Utilities
**~40 lines** | ✅ Modularized

Contains:
- `invalidateCountsCache()` - Invalidate counts and database caches

### `core.ts` - Core Operations
**~1000 lines** | 🔄 To be further modularized

Currently contains:
- Query operations (`getNotes`, `getNote`, `getCounts`)
- Visibility operations (`hideNote`, `unhideNote`)
- Attachment operations (file upload/download)
- Trash operations (`emptyTrash`)

**Next Steps:** Extract these into separate modules:
- `queries.ts` - Query operations
- `visibility.ts` - Hide/unhide operations
- `attachments.ts` - File operations

## Benefits of Modularization

### 1. Easier Bug Fixes
**Before:** Search through 1269 lines to find delete logic
**After:** Go directly to `crud.ts` (~400 lines)

### 2. Better Code Organization
Each module has a single responsibility:
- CRUD operations → `crud.ts`
- Cache management → `cache-sync.ts`
- Shared utilities → `shared.ts`

### 3. Easier Testing
Each module can be tested independently:
```typescript
import { createCrudOperations } from './crud';
// Test just CRUD operations
```

### 4. Cache Issue Resolution
The cache synchronization bugs were caused by mixing cache logic throughout the file. Now it's centralized in `cache-sync.ts`, making it obvious when caches need to sync.

## Cache Architecture

The app has **3 cache layers:**

1. **SQLite Database** (`databaseCache.ts`)
   - Persistent local storage
   - Survives app restarts
   - Updated by: `updateSQLiteCache()`

2. **AsyncStorage** (`useNotesLoader.ts`)
   - UI preview cache
   - Fast rendering
   - Cleared by: `clearAsyncStorageCaches()`

3. **In-Memory Refs** (`useNotesLoader.ts`)
   - Ultra-fast mode (< 30 seconds)
   - Skip decryption
   - Auto-invalidated on count mismatch

### Cache Sync Strategy

**Create/Update Operations:**
```typescript
await syncAllCaches(note, shouldClearAsyncStorage);
// 1. Always update SQLite cache
// 2. Optionally clear AsyncStorage (for delete/archive/move)
```

**When to Clear AsyncStorage:**
- ✅ Note deleted (`deleted: true`)
- ✅ Note archived (`archived: true`)
- ✅ Note moved to different folder (`folderId` changed)
- ❌ Note content edited (keep cache for performance)

## Migration Guide

No changes needed! The modular structure maintains the same API:

```typescript
const api = useApiService();

// All operations work the same
await api.createNote({ title, content });
await api.updateNote(noteId, { deleted: true });
await api.deleteNote(noteId);
```

## Future Enhancements

1. **Extract Remaining Modules:**
   - [ ] `queries.ts` - Query operations
   - [ ] `visibility.ts` - Hide/unhide operations
   - [ ] `attachments.ts` - File operations

2. **Add Unit Tests:**
   - [ ] Test CRUD operations independently
   - [ ] Test cache synchronization logic
   - [ ] Mock network/database for faster tests

3. **Performance Optimizations:**
   - [ ] Batch cache updates
   - [ ] Optimize background refresh
   - [ ] Add request deduplication

## Troubleshooting

### "Deleted notes reappearing"
**Root Cause:** Cache synchronization issue
**Fixed in:** `crud.ts` + `cache-sync.ts`
- `updateNote()` now syncs all caches
- AsyncStorage cleared for location changes
- SQLite always updated

### "New notes not appearing"
**Root Cause:** Ultra-fast mode using stale cache
**Fixed in:** `useNotesLoader.ts`
- Count mismatch detection
- Skip ultra-fast mode if counts differ

### "Notes showing [ENCRYPTED]"
**Root Cause:** Background refresh storing encrypted content
**Fixed in:** `core.ts`
- Always cache decrypted content
- Removed preference check
