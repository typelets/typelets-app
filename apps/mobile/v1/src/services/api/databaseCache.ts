import { getDatabase } from '../../lib/database';
import type { Folder,Note } from './types';

/**
 * Database cache layer for offline-first data storage with expo-sqlite
 *
 * Provides functions to:
 * - Store and retrieve notes/folders from local SQLite database
 * - Manage HTTP cache metadata (ETag, Last-Modified) for conditional requests
 * - Support offline-first architecture
 */

// ============================================================================
// Cache Metadata Management
// ============================================================================

export interface CacheMetadata {
  eTag: string | null;
  lastModified: string | null;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Get cache metadata for a resource
 * Used to send conditional request headers (If-None-Match, If-Modified-Since)
 */
export async function getCacheMetadata(
  resourceType: string,
  resourceId?: string
): Promise<CacheMetadata | null> {
  try {
    const db = getDatabase();

    const result = await db.getFirstAsync<{
      e_tag: string | null;
      last_modified: number | null;
      cached_at: number;
      expires_at: number;
    }>(
      `SELECT e_tag, last_modified, cached_at, expires_at FROM cache_metadata
       WHERE resource_type = ? AND resource_id ${resourceId ? '= ?' : 'IS NULL'}`,
      resourceId ? [resourceType, resourceId] : [resourceType]
    );

    if (!result) return null;

    return {
      eTag: result.e_tag,
      lastModified: result.last_modified
        ? new Date(result.last_modified).toUTCString()
        : null,
      cachedAt: new Date(result.cached_at),
      expiresAt: new Date(result.expires_at),
    };
  } catch (error) {
    // Gracefully handle database not initialized
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping cache metadata read');
      }
      return null;
    }
    console.error('[DatabaseCache] Failed to get cache metadata:', error);
    return null;
  }
}

/**
 * Set cache metadata for a resource
 * Called after successful API response to store cache headers
 */
export async function setCacheMetadata(
  resourceType: string,
  eTag: string | null,
  lastModified: string | null,
  ttlMinutes: number = 5,
  resourceId?: string
): Promise<void> {
  try {
    const db = getDatabase();

    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;
    const lastModifiedTimestamp = lastModified ? new Date(lastModified).getTime() : null;

    // Generate unique ID
    const id = resourceId
      ? `${resourceType}_${resourceId}`
      : resourceType;

    await db.runAsync(
      `INSERT OR REPLACE INTO cache_metadata (id, resource_type, resource_id, e_tag, last_modified, cached_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, resourceType, resourceId || null, eTag, lastModifiedTimestamp, now, expiresAt]
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping cache metadata write');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to set cache metadata:', error);
  }
}

/**
 * Check if cache is expired
 */
export async function isCacheExpired(
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  const metadata = await getCacheMetadata(resourceType, resourceId);
  if (!metadata) return true;

  return new Date() > metadata.expiresAt;
}

/**
 * Invalidate cache for a resource
 */
export async function invalidateCache(
  resourceType: string,
  resourceId?: string
): Promise<void> {
  try {
    const db = getDatabase();

    await db.runAsync(
      `DELETE FROM cache_metadata
       WHERE resource_type = ? AND resource_id ${resourceId ? '= ?' : 'IS NULL'}`,
      resourceId ? [resourceType, resourceId] : [resourceType]
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping cache invalidation');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to invalidate cache:', error);
  }
}

// ============================================================================
// Note Cache Operations
// ============================================================================

/**
 * Get the type of a note from cache (quick lookup for loading UI)
 * Returns 'note', 'diagram', 'sheets', etc. or null if not found
 */
export async function getCachedNoteType(noteId: string): Promise<string | null> {
  try {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ type: string | null }>(
      'SELECT type FROM notes WHERE id = ?',
      [noteId]
    );
    return result?.type || null;
  } catch (error) {
    // Silently fail - this is just an optimization
    return null;
  }
}

/**
 * Get cached notes from database
 */
export async function getCachedNotes(filters?: {
  folderId?: string;
  starred?: boolean;
  archived?: boolean;
  deleted?: boolean;
  isPublic?: boolean;
}): Promise<Note[]> {
  try {
    const db = getDatabase();

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.folderId !== undefined) {
      conditions.push('folder_id = ?');
      params.push(filters.folderId);
    }
    if (filters?.starred !== undefined) {
      conditions.push('starred = ?');
      params.push(filters.starred ? 1 : 0);
    }
    if (filters?.archived !== undefined) {
      conditions.push('archived = ?');
      params.push(filters.archived ? 1 : 0);
    }
    if (filters?.deleted !== undefined) {
      conditions.push('deleted = ?');
      params.push(filters.deleted ? 1 : 0);
    }
    if (filters?.isPublic !== undefined) {
      conditions.push('is_published = ?');
      params.push(filters.isPublic ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM notes ${whereClause} ORDER BY updated_at DESC`,
      params
    );

    return rows.map((row) => {
      // If note has encrypted content but empty plaintext, mark as [ENCRYPTED]
      // This tells the UI to show skeleton and decrypt in background
      const hasEncryptedContent = row.encrypted_title && row.encrypted_content;
      const hasEmptyPlaintext = !row.title && !row.content;
      const needsDecryption = hasEncryptedContent && hasEmptyPlaintext;

      // Handle both TEXT (ISO string) and INTEGER (Unix timestamp) formats
      const createdAt = typeof row.created_at === 'string'
        ? row.created_at
        : new Date(row.created_at).toISOString();
      const updatedAt = typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date(row.updated_at).toISOString();

      return {
        id: row.id,
        title: needsDecryption ? '[ENCRYPTED]' : row.title,
        content: needsDecryption ? '[ENCRYPTED]' : row.content,
        folderId: row.folder_id || undefined,
        userId: row.user_id,
        starred: Boolean(row.starred),
        archived: Boolean(row.archived),
        deleted: Boolean(row.deleted),
        hidden: Boolean(row.hidden),
        createdAt,
        updatedAt,
        encryptedTitle: row.encrypted_title || undefined,
        encryptedContent: row.encrypted_content || undefined,
        iv: row.iv || undefined,
        salt: row.salt || undefined,
        attachmentCount: row.attachment_count || 0,
        isPublished: Boolean(row.is_published),
        publicSlug: row.public_slug || null,
        publishedAt: row.published_at || null,
        publicUpdatedAt: row.public_updated_at || null,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping cached notes read');
      }
      return [];
    }

    // If date conversion fails, clear the cache and return empty
    if (error instanceof RangeError || (error instanceof Error && error.message.includes('Date'))) {
      console.error('[DatabaseCache] Failed to get cached notes (invalid dates - clearing cache):', error);
      try {
        const db = getDatabase();
        // Only delete synced notes to preserve unsynced offline changes
        await db.runAsync('DELETE FROM notes WHERE is_synced = 1');
        if (__DEV__) {
          console.log('[DatabaseCache] Cleared synced notes cache due to invalid data (preserved unsynced notes)');
        }
      } catch (clearError) {
        console.error('[DatabaseCache] Failed to clear notes cache:', clearError);
      }
      return [];
    }

    console.error('[DatabaseCache] Failed to get cached notes:', error);
    return [];
  }
}

/**
 * Store notes to database cache
 *
 * @param notes - Notes to cache (can be encrypted or decrypted)
 * @param options.storeDecrypted - If true, stores title/content as decrypted (for instant loading)
 *                                  If false, only stores encrypted versions
 */
export async function storeCachedNotes(
  notes: Note[],
  options?: { storeDecrypted?: boolean }
): Promise<void> {
  if (!notes.length) return;

  try {
    const db = getDatabase();
    const now = Date.now();
    const storeDecrypted = options?.storeDecrypted ?? false;

    // Process in smaller chunks to avoid overwhelming the database
    const CHUNK_SIZE = 50;
    for (let i = 0; i < notes.length; i += CHUNK_SIZE) {
      const chunk = notes.slice(i, i + CHUNK_SIZE);

      for (const note of chunk) {
        try {
          // If storing decrypted, use the actual title/content
          // If not, clear title/content and only keep encrypted versions
          const title = storeDecrypted ? note.title : '';
          const content = storeDecrypted ? note.content : '';

          await db.runAsync(
            `INSERT OR REPLACE INTO notes (
              id, title, content, folder_id, user_id, starred, archived, deleted, hidden,
              created_at, updated_at, encrypted_title, encrypted_content, iv, salt,
              is_synced, is_dirty, synced_at, attachment_count,
              is_published, public_slug, published_at, public_updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              note.id,
              title,
              content,
              note.folderId || null,
              note.userId,
              note.starred ? 1 : 0,
              note.archived ? 1 : 0,
              note.deleted ? 1 : 0,
              note.hidden ? 1 : 0,
              note.createdAt, // Store as ISO string
              note.updatedAt, // Store as ISO string
              note.encryptedTitle || null,
              note.encryptedContent || null,
              note.iv || null,
              note.salt || null,
              1, // is_synced
              0, // is_dirty
              now, // synced_at
              note.attachmentCount || 0, // attachment_count
              note.isPublished ? 1 : 0, // is_published
              note.publicSlug || null, // public_slug
              note.publishedAt || null, // published_at
              note.publicUpdatedAt || null, // public_updated_at
            ]
          );
        } catch (noteError) {
          // Skip individual note errors, continue with others
          console.warn(`[DatabaseCache] Failed to store note ${note.id}:`, noteError);
        }
      }
    }

    if (__DEV__ && storeDecrypted) {
      console.log(`[DatabaseCache] 🔓 Stored ${notes.length} notes with decrypted content`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping notes write');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to store cached notes:', error);
  }
}

// ============================================================================
// Folder Cache Operations
// ============================================================================

/**
 * Get cached folders from database
 */
export async function getCachedFolders(): Promise<Folder[]> {
  try {
    const db = getDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM folders ORDER BY sort_order, name`
    );

    return rows.map((row) => {
      // Handle both TEXT (ISO string) and INTEGER (Unix timestamp) formats
      const createdAt = typeof row.created_at === 'string'
        ? row.created_at
        : new Date(row.created_at).toISOString();
      const updatedAt = typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date(row.updated_at).toISOString();

      return {
        id: row.id,
        name: row.name,
        color: row.color,
        parentId: row.parent_id || undefined,
        userId: row.user_id,
        sortOrder: row.sort_order || 0,
        createdAt,
        updatedAt,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping cached folders read');
      }
      return [];
    }

    // If date conversion fails, clear the cache and return empty
    if (error instanceof RangeError || (error instanceof Error && error.message.includes('Date'))) {
      console.error('[DatabaseCache] Failed to get cached folders (invalid dates - clearing cache):', error);
      try {
        const db = getDatabase();
        await db.runAsync('DELETE FROM folders');
        if (__DEV__) {
          console.log('[DatabaseCache] Cleared folders cache due to invalid data');
        }
      } catch (clearError) {
        console.error('[DatabaseCache] Failed to clear folders cache:', clearError);
      }
      return [];
    }

    console.error('[DatabaseCache] Failed to get cached folders:', error);
    return [];
  }
}

/**
 * Store folders to database cache
 */
export async function storeCachedFolders(folders: Folder[]): Promise<void> {
  if (!folders.length) return;

  try {
    const db = getDatabase();
    const now = Date.now();

    for (const folder of folders) {
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO folders (
            id, name, color, parent_id, user_id, sort_order,
            created_at, updated_at, is_synced, is_dirty, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            folder.id,
            folder.name,
            folder.color,
            folder.parentId || null,
            folder.userId,
            folder.sortOrder || 0,
            folder.createdAt, // Store as ISO string
            folder.updatedAt, // Store as ISO string
            1, // is_synced
            0, // is_dirty
            now, // synced_at
          ]
        );
      } catch (folderError) {
        // Skip individual folder errors, continue with others
        console.warn(`[DatabaseCache] Failed to store folder ${folder.id}:`, folderError);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping folders write');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to store cached folders:', error);
  }
}

/**
 * Clear all cached folders from database
 * Called when invalidating folder cache to ensure stale data is removed
 */
export async function clearCachedFolders(): Promise<void> {
  try {
    const db = getDatabase();

    await db.runAsync(`DELETE FROM folders`);

    if (__DEV__) {
      console.log('[DatabaseCache] Cleared all cached folders');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping folders clear');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to clear cached folders:', error);
  }
}

/**
 * Clear all cached notes from database
 * Called when clearing all caches from settings
 * IMPORTANT: Preserves unsynced notes to prevent data loss
 */
export async function clearCachedNotes(clearAll = false): Promise<void> {
  try {
    const db = getDatabase();

    if (clearAll) {
      // Clear ALL notes (used when user manually clears cache)
      await db.runAsync(`DELETE FROM notes`);
      if (__DEV__) {
        console.log('[DatabaseCache] Cleared ALL cached notes (including unsynced)');
      }
    } else {
      // Only delete synced notes to preserve unsynced offline changes
      await db.runAsync(`DELETE FROM notes WHERE is_synced = 1`);
      if (__DEV__) {
        console.log('[DatabaseCache] Cleared synced cached notes (preserved unsynced notes)');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping notes clear');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to clear cached notes:', error);
  }
}

/**
 * Clear all cache metadata
 * Called when clearing all caches
 */
export async function clearAllCacheMetadata(): Promise<void> {
  try {
    const db = getDatabase();

    await db.runAsync(`DELETE FROM cache_metadata`);

    if (__DEV__) {
      console.log('[DatabaseCache] Cleared all cache metadata');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, skipping metadata clear');
      }
      return;
    }
    console.error('[DatabaseCache] Failed to clear cache metadata:', error);
  }
}

// ============================================================================
// Cache Statistics
// ============================================================================

export interface CacheStats {
  noteCount: number;
  folderCount: number;
  cacheSizeBytes: number;
  cacheSizeMB: number;
  hasDecryptedContent: boolean;
}

/**
 * Get cache statistics for display in settings
 * Returns information about cached notes, folders, and cache size
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = getDatabase();

    // Get note count
    const noteCountResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes'
    );
    const noteCount = noteCountResult?.count || 0;

    // Get folder count
    const folderCountResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM folders'
    );
    const folderCount = folderCountResult?.count || 0;

    // Check if any notes have decrypted content (non-empty title/content)
    const decryptedCheck = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE title != "" OR content != ""'
    );
    const hasDecryptedContent = (decryptedCheck?.count || 0) > 0;

    // Calculate approximate cache size by getting total length of all cached data
    const sizeResult = await db.getFirstAsync<{ total_size: number }>(
      `SELECT
        COALESCE((SELECT SUM(
          COALESCE(LENGTH(title), 0) +
          COALESCE(LENGTH(content), 0) +
          COALESCE(LENGTH(encrypted_title), 0) +
          COALESCE(LENGTH(encrypted_content), 0)
        ) FROM notes), 0) +
        COALESCE((SELECT SUM(COALESCE(LENGTH(name), 0)) FROM folders), 0) +
        COALESCE((SELECT SUM(COALESCE(LENGTH(e_tag), 0) + COALESCE(LENGTH(id), 0)) FROM cache_metadata), 0)
        as total_size`
    );

    const cacheSizeBytes = sizeResult?.total_size || 0;
    const cacheSizeMB = Number((cacheSizeBytes / (1024 * 1024)).toFixed(2));

    return {
      noteCount,
      folderCount,
      cacheSizeBytes,
      cacheSizeMB,
      hasDecryptedContent,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database not initialized')) {
      if (__DEV__) {
        console.log('[DatabaseCache] Database not ready yet, returning empty stats');
      }
    } else {
      console.error('[DatabaseCache] Failed to get cache stats:', error);
    }

    // Return empty stats on error
    return {
      noteCount: 0,
      folderCount: 0,
      cacheSizeBytes: 0,
      cacheSizeMB: 0,
      hasDecryptedContent: false,
    };
  }
}
