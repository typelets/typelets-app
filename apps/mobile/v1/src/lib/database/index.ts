import * as SQLite from 'expo-sqlite';

/**
 * Offline-first SQLite database using expo-sqlite
 *
 * Provides caching layer for notes and folders with:
 * - Instant reads from local SQLite database
 * - HTTP cache metadata (ETag, Last-Modified)
 * - Sync queue for offline changes
 * - Network error resilience
 */

let database: SQLite.SQLiteDatabase | null = null;

const DB_NAME = 'typelets_mobile.db';
const DB_VERSION = 5;

/**
 * Migrate database schema to latest version
 */
async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Get current schema version
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version || 0;

  console.log(`[SQLite] Current database version: ${currentVersion}`);

  if (currentVersion < DB_VERSION) {
    console.log(`[SQLite] Migrating database from v${currentVersion} to v${DB_VERSION}`);

    if (currentVersion < 3) {
      // Migration to v3: Add hidden_at column and update timestamp columns
      console.log('[SQLite] Running migration to v3...');

      try {
        // Drop and recreate tables with correct schema
        await db.execAsync(`
          -- Drop and recreate notes table with correct schema
          DROP TABLE IF EXISTS notes;

          CREATE TABLE notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            folder_id TEXT,
            user_id TEXT NOT NULL,
            starred INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            deleted INTEGER DEFAULT 0,
            hidden INTEGER DEFAULT 0,
            hidden_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at INTEGER,
            e_tag TEXT,
            is_synced INTEGER DEFAULT 1,
            is_dirty INTEGER DEFAULT 0,
            encrypted_title TEXT,
            encrypted_content TEXT,
            iv TEXT,
            salt TEXT
          );

          -- Drop and recreate folders table with correct schema
          DROP TABLE IF EXISTS folders;

          CREATE TABLE folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            parent_id TEXT,
            user_id TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced_at INTEGER,
            e_tag TEXT,
            is_synced INTEGER DEFAULT 1,
            is_dirty INTEGER DEFAULT 0
          );

          -- Recreate indexes
          CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
          CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(starred);
          CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
          CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);
          CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

          -- Composite indexes for optimized count queries
          CREATE INDEX IF NOT EXISTS idx_notes_status_composite ON notes(deleted, archived, starred);
          CREATE INDEX IF NOT EXISTS idx_notes_folder_status ON notes(folder_id, deleted, archived) WHERE folder_id IS NOT NULL;
        `);

        console.log('[SQLite] Migration to v3 completed');
      } catch (error) {
        console.error('[SQLite] Migration failed:', error);
        throw error;
      }
    }

    if (currentVersion < 4) {
      // Migration to v4: Add attachment_count column to notes table
      console.log('[SQLite] Running migration to v4...');

      try {
        await db.execAsync(`
          -- Add attachment_count column to notes table
          ALTER TABLE notes ADD COLUMN attachment_count INTEGER DEFAULT 0;
        `);

        console.log('[SQLite] Migration to v4 completed');
      } catch (error) {
        console.error('[SQLite] Migration to v4 failed:', error);
        throw error;
      }
    }

    if (currentVersion < 5) {
      // Migration to v5: Add public notes columns
      console.log('[SQLite] Running migration to v5...');

      try {
        await db.execAsync(`
          -- Add public notes columns to notes table
          ALTER TABLE notes ADD COLUMN is_published INTEGER DEFAULT 0;
          ALTER TABLE notes ADD COLUMN public_slug TEXT;
          ALTER TABLE notes ADD COLUMN published_at TEXT;
          ALTER TABLE notes ADD COLUMN public_updated_at TEXT;
        `);

        // Clear notes cache so they get re-fetched with public notes fields
        console.log('[SQLite] Clearing notes cache to refresh with public notes fields...');
        await db.execAsync(`DELETE FROM notes;`);
        await db.execAsync(`DELETE FROM cache_metadata WHERE resource_type = 'notes';`);
        console.log('[SQLite] Notes cache cleared - will be refreshed on next load');

        console.log('[SQLite] Migration to v5 completed');
      } catch (error) {
        console.error('[SQLite] Migration to v5 failed:', error);
        throw error;
      }
    }

    // Update schema version
    await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
    console.log(`[SQLite] Database migrated to v${DB_VERSION}`);
  }

  // Safety check: Ensure attachment_count column exists (runs every time)
  try {
    const columnCheck = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('notes') WHERE name='attachment_count'`
    );

    if (columnCheck && columnCheck.count === 0) {
      console.log('[SQLite] attachment_count column missing, adding it now...');
      await db.execAsync(`
        ALTER TABLE notes ADD COLUMN attachment_count INTEGER DEFAULT 0;
      `);
      console.log('[SQLite] attachment_count column added successfully');

      // Clear notes cache so they get re-fetched with attachment counts
      console.log('[SQLite] Clearing notes cache to refresh with attachment counts...');
      await db.execAsync(`DELETE FROM notes;`);
      await db.execAsync(`DELETE FROM cache_metadata WHERE resource_type = 'notes';`);
      console.log('[SQLite] Notes cache cleared - will be refreshed on next load');
    }
  } catch (error) {
    console.error('[SQLite] Failed to check/add attachment_count column:', error);
  }

  // Safety check: Ensure public notes columns exist (runs every time)
  try {
    const columnCheck = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pragma_table_info('notes') WHERE name='is_published'`
    );

    if (columnCheck && columnCheck.count === 0) {
      console.log('[SQLite] Public notes columns missing, adding them now...');
      await db.execAsync(`
        ALTER TABLE notes ADD COLUMN is_published INTEGER DEFAULT 0;
        ALTER TABLE notes ADD COLUMN public_slug TEXT;
        ALTER TABLE notes ADD COLUMN published_at TEXT;
        ALTER TABLE notes ADD COLUMN public_updated_at TEXT;
      `);
      console.log('[SQLite] Public notes columns added successfully');

      // Clear notes cache so they get re-fetched with public notes fields
      console.log('[SQLite] Clearing notes cache to refresh with public notes fields...');
      await db.execAsync(`DELETE FROM notes;`);
      await db.execAsync(`DELETE FROM cache_metadata WHERE resource_type = 'notes';`);
      console.log('[SQLite] Notes cache cleared - will be refreshed on next load');
    }
  } catch (error) {
    console.error('[SQLite] Failed to check/add public notes columns:', error);
  }
}

/**
 * Initialize the SQLite database and create tables
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    console.log('[SQLite] Database already initialized');
    return database;
  }

  console.log('[SQLite] Initializing database...');

  try {
    // Open database
    database = await SQLite.openDatabaseAsync(DB_NAME);

    // Run migrations first
    await migrateDatabase(database);

    // Create tables (if they don't exist)
    await database.execAsync(`
      PRAGMA journal_mode = WAL;

      -- Notes table with end-to-end encryption and cache fields
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        folder_id TEXT,
        user_id TEXT NOT NULL,
        starred INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        hidden INTEGER DEFAULT 0,
        hidden_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at INTEGER,
        e_tag TEXT,
        is_synced INTEGER DEFAULT 1,
        is_dirty INTEGER DEFAULT 0,
        encrypted_title TEXT,
        encrypted_content TEXT,
        iv TEXT,
        salt TEXT,
        attachment_count INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 0,
        public_slug TEXT,
        published_at TEXT,
        public_updated_at TEXT
      );

      -- Folders table with cache fields
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        parent_id TEXT,
        user_id TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at INTEGER,
        e_tag TEXT,
        is_synced INTEGER DEFAULT 1,
        is_dirty INTEGER DEFAULT 0
      );

      -- HTTP cache metadata for conditional requests
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        e_tag TEXT,
        last_modified INTEGER,
        cached_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      -- Sync queue for offline changes
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
      CREATE INDEX IF NOT EXISTS idx_notes_starred ON notes(starred);
      CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
      CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted);
      CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
      CREATE INDEX IF NOT EXISTS idx_cache_resource ON cache_metadata(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);

      -- Composite indexes for optimized count queries
      CREATE INDEX IF NOT EXISTS idx_notes_status_composite ON notes(deleted, archived, starred);
      CREATE INDEX IF NOT EXISTS idx_notes_folder_status ON notes(folder_id, deleted, archived) WHERE folder_id IS NOT NULL;
    `);

    console.log('[SQLite] Database initialized successfully');
    return database;
  } catch (error) {
    console.error('[SQLite] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the database instance
 * @throws Error if database hasn't been initialized yet
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error(
      '[SQLite] Database not initialized. Call initializeDatabase() first.'
    );
  }
  return database;
}

/**
 * Reset the database (useful for testing or logout)
 * WARNING: This will delete all local data
 */
export async function resetDatabase(): Promise<void> {
  if (!database) {
    console.warn('[SQLite] Cannot reset database - not initialized');
    return;
  }

  console.log('[SQLite] Resetting database...');

  try {
    await database.execAsync(`
      DROP TABLE IF EXISTS notes;
      DROP TABLE IF EXISTS folders;
      DROP TABLE IF EXISTS cache_metadata;
      DROP TABLE IF EXISTS sync_queue;
    `);

    // Reinitialize tables
    await initializeDatabase();

    console.log('[SQLite] Database reset successfully');
  } catch (error) {
    console.error('[SQLite] Failed to reset database:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
    console.log('[SQLite] Database closed');
  }
}
