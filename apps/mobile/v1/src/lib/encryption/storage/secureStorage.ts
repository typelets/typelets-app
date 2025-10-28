/**
 * Secure Storage Wrapper
 * Abstraction layer over expo-secure-store
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import forge from 'node-forge';

import { STORAGE_KEYS } from './storageKeys';

/**
 * User secret management - in-memory cache
 */
const userSecretsCache = new Map<string, string>();

/**
 * Get or generate a user-specific secret
 */
export async function getUserSecret(userId: string): Promise<string> {
  // Check master key first - if it exists, we're in master password mode
  try {
    const masterKey = await SecureStore.getItemAsync(STORAGE_KEYS.MASTER_KEY(userId));
    if (masterKey) {
      // Import here to avoid circular dependency
      const { encryptionService } = await import('../index');
      encryptionService.enableMasterPasswordMode();
      return masterKey;
    }
  } catch {
    // Continue to fallback
  }

  // Check memory cache
  const cachedSecret = userSecretsCache.get(userId);
  if (cachedSecret) {
    return cachedSecret;
  }

  // Use secure storage for user secrets
  const storageKey = STORAGE_KEYS.USER_SECRET(userId);
  try {
    let secret = await SecureStore.getItemAsync(storageKey);

    if (!secret) {
      // Generate new random secret and store it securely
      const randomBytes = await Crypto.getRandomBytesAsync(64);
      // Convert Uint8Array to base64 using node-forge
      const randomString = String.fromCharCode.apply(null, Array.from(randomBytes));
      secret = forge.util.encode64(randomString);
      await SecureStore.setItemAsync(storageKey, secret);
    }

    // Cache in memory for performance
    userSecretsCache.set(userId, secret);
    return secret;
  } catch (error) {
    throw new Error(`Failed to get user secret: ${error}`);
  }
}

/**
 * Store master key in secure storage
 */
export async function storeMasterKey(userId: string, keyString: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.MASTER_KEY(userId), keyString);
  await SecureStore.setItemAsync(STORAGE_KEYS.HAS_MASTER_PASSWORD(userId), 'true');
}

/**
 * Get master key from secure storage
 */
export async function getMasterKey(userId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.MASTER_KEY(userId));
  } catch {
    return null;
  }
}

/**
 * Check if user has master password set
 */
export async function hasMasterPasswordFlag(userId: string): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(STORAGE_KEYS.HAS_MASTER_PASSWORD(userId));
    return flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Clear all encryption data for a user
 */
export async function clearUserStorageData(userId: string): Promise<void> {
  const keysToDelete = [
    STORAGE_KEYS.MASTER_KEY(userId),
    STORAGE_KEYS.HAS_MASTER_PASSWORD(userId),
    STORAGE_KEYS.TEST_ENCRYPTION(userId),
    STORAGE_KEYS.USER_SECRET(userId),
  ];

  for (const key of keysToDelete) {
    try {
      await SecureStore.deleteItemAsync(key);
      if (__DEV__) {
        console.log(`✅ Deleted ${key}`);
      }
    } catch (error) {
      if (__DEV__) {
        console.log(`❌ Failed to delete ${key}:`, error);
      }
    }
  }

  // Clear from memory cache
  userSecretsCache.delete(userId);
}

/**
 * Delete old user secret key
 */
export async function deleteOldUserSecret(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_SECRET(userId));
  } catch {
    // Ignore if doesn't exist
  }
}
