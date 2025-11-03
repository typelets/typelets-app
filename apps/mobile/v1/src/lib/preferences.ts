import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User preferences for offline caching and security
 *
 * Use these functions to:
 * - Get/set whether to cache decrypted content locally
 * - Clear decrypted cache when user disables the feature
 *
 * UI available in Settings screen > Encrypted Cache
 */

const PREFERENCE_KEYS = {
  CACHE_DECRYPTED_CONTENT: 'cache_decrypted_content',
};

/**
 * Get whether to cache decrypted content locally
 *
 * When enabled:
 * - Decrypted notes stored in SQLite for instant loading (~50ms)
 * - Better performance but decrypted data stored locally
 *
 * When disabled (default):
 * - Only encrypted notes stored, decrypt on each load (~550ms)
 * - Better security but slower loading
 */
export async function getCacheDecryptedContentPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PREFERENCE_KEYS.CACHE_DECRYPTED_CONTENT);

    // Default to false (better security) if not set
    if (value === null) {
      return false;
    }

    return value === 'true';
  } catch (error) {
    console.error('[Preferences] Failed to get cache preference:', error);
    return false; // Default to disabled on error
  }
}

/**
 * Set whether to cache decrypted content locally
 */
export async function setCacheDecryptedContentPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREFERENCE_KEYS.CACHE_DECRYPTED_CONTENT,
      enabled ? 'true' : 'false'
    );

    console.log(`[Preferences] Cache decrypted content: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error('[Preferences] Failed to set cache preference:', error);
  }
}

/**
 * Clear all cached decrypted content from SQLite
 * Call this when user disables decrypted caching
 */
export async function clearDecryptedCache(): Promise<void> {
  try {
    const { getDatabase } = await import('./database');
    const db = getDatabase();

    // Clear decrypted content from notes table
    await db.runAsync(`
      UPDATE notes
      SET title = '', content = ''
      WHERE encrypted_title IS NOT NULL
    `);

    console.log('[Preferences] Cleared decrypted cache from SQLite');
  } catch (error) {
    console.error('[Preferences] Failed to clear decrypted cache:', error);
  }
}
