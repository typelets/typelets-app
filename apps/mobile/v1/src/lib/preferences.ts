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
  DEFAULT_SHEET_ZOOM: 'default_sheet_zoom',
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

/**
 * Get the default zoom level for sheets
 * @returns Zoom level as a decimal (e.g., 1.0 = 100%, 0.75 = 75%)
 */
export async function getDefaultSheetZoomPreference(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(PREFERENCE_KEYS.DEFAULT_SHEET_ZOOM);

    // Default to 100% if not set
    if (value === null) {
      return 1.0;
    }

    const zoom = parseFloat(value);
    // Validate zoom is within reasonable bounds (50% - 300%)
    if (isNaN(zoom) || zoom < 0.5 || zoom > 3.0) {
      return 1.0;
    }

    return zoom;
  } catch (error) {
    console.error('[Preferences] Failed to get sheet zoom preference:', error);
    return 1.0; // Default to 100% on error
  }
}

/**
 * Set the default zoom level for sheets
 * @param zoom Zoom level as a decimal (e.g., 1.0 = 100%, 0.75 = 75%)
 */
export async function setDefaultSheetZoomPreference(zoom: number): Promise<void> {
  try {
    // Clamp zoom to valid range
    const clampedZoom = Math.max(0.5, Math.min(3.0, zoom));

    await AsyncStorage.setItem(
      PREFERENCE_KEYS.DEFAULT_SHEET_ZOOM,
      clampedZoom.toString()
    );

    console.log(`[Preferences] Default sheet zoom: ${Math.round(clampedZoom * 100)}%`);
  } catch (error) {
    console.error('[Preferences] Failed to set sheet zoom preference:', error);
  }
}
