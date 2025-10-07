/**
 * Main Encryption Service
 * Orchestrates encryption/decryption operations
 */

import * as Crypto from 'expo-crypto';
import { EncryptedNote, DecryptedData, PotentiallyEncrypted } from './types';
import { ENCRYPTION_CONFIG } from './config';
import { encryptWithAESGCM, decryptWithAESGCM } from './core/aes';
import { deriveEncryptionKey } from './core/keyDerivation';
import { arrayBufferToBase64 } from './core/crypto';
import { getUserSecret, getMasterKey, clearUserStorageData } from './storage/secureStorage';
import { DecryptionCache } from './storage/cache';

export class MobileEncryptionService {
  private cache: DecryptionCache;
  private masterPasswordMode = false;

  constructor() {
    this.cache = new DecryptionCache();
  }

  /**
   * Derive encryption key for a user
   */
  private async deriveKey(userId: string, saltBase64: string): Promise<string> {
    if (!userId) {
      throw new Error('Key derivation attempted without user ID');
    }

    try {
      const masterKey = await getMasterKey(userId);

      if (this.masterPasswordMode && masterKey) {
        // In master password mode, return the stored key directly
        return masterKey;
      }

      // For non-master password mode, derive key from user secret and salt
      const userSecret = await getUserSecret(userId);
      return await deriveEncryptionKey(userId, userSecret, saltBase64);
    } catch (error) {
      throw new Error(`Key derivation failed: ${error}`);
    }
  }

  /**
   * Encrypt a note
   */
  async encryptNote(
    userId: string,
    title: string,
    content: string
  ): Promise<EncryptedNote> {
    if (!userId) {
      throw new Error('User ID required for encryption');
    }

    try {
      // Generate random salt and IV
      const saltBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.SALT_LENGTH);
      const ivBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.IV_LENGTH);

      // Convert to base64
      const saltBase64 = arrayBufferToBase64(saltBytes);
      const ivBase64 = arrayBufferToBase64(ivBytes);

      // Derive encryption key
      const key = await this.deriveKey(userId, saltBase64);

      // Encrypt title and content
      const encryptedTitle = await encryptWithAESGCM(title || '', key, ivBase64);
      const encryptedContent = await encryptWithAESGCM(content || '', key, ivBase64);

      return {
        encryptedTitle,
        encryptedContent,
        iv: ivBase64,
        salt: saltBase64,
      };
    } catch (error) {
      throw new Error(`Encryption failed for user ${userId}: ${error}`);
    }
  }

  /**
   * Decrypt a note
   */
  async decryptNote(
    userId: string,
    encryptedTitle: string,
    encryptedContent: string,
    ivBase64: string,
    saltBase64: string
  ): Promise<DecryptedData> {
    // Check cache first
    const cached = this.cache.get(userId, encryptedTitle, ivBase64);
    if (cached) {
      return cached.data;
    }

    try {
      const key = await this.deriveKey(userId, saltBase64);

      // Decrypt title and content
      const title = await decryptWithAESGCM(encryptedTitle, key, ivBase64);
      const content = await decryptWithAESGCM(encryptedContent, key, ivBase64);

      // Validate decryption results
      if (title === null || title === undefined) {
        throw new Error('Title decryption failed');
      }
      if (content === null || content === undefined) {
        throw new Error('Content decryption failed');
      }

      const result = { title, content };

      // Cache the result
      this.cache.set(userId, encryptedTitle, ivBase64, result);

      return result;
    } catch (error) {
      throw new Error(`Decryption failed for user ${userId}: ${error}`);
    }
  }

  /**
   * Check if a note is encrypted
   */
  isEncrypted(note: PotentiallyEncrypted): boolean {
    return !!(
      note.encryptedTitle &&
      note.encryptedContent &&
      note.iv &&
      note.salt &&
      typeof note.encryptedTitle === 'string' &&
      typeof note.encryptedContent === 'string' &&
      typeof note.iv === 'string' &&
      typeof note.salt === 'string'
    );
  }

  /**
   * Clear all caches and keys
   */
  clearKeys(): void {
    this.cache.clearAll();
  }

  /**
   * Clear cache for a specific note
   */
  clearNoteCache(userId: string, encryptedTitle?: string): void {
    this.cache.clearUser(userId, encryptedTitle);
  }

  /**
   * Clear all data for a user
   */
  async clearUserData(userId: string): Promise<void> {
    if (__DEV__) {
      console.log('🗑️ Starting clearUserData for user:', userId);
    }

    // Clear storage
    await clearUserStorageData(userId);

    // Clear cache
    this.cache.clearUser(userId);

    // Reset master password mode
    this.masterPasswordMode = false;

    if (__DEV__) {
      console.log('✅ clearUserData completed');
    }
  }

  /**
   * Enable master password mode
   */
  enableMasterPasswordMode(): void {
    this.masterPasswordMode = true;
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.cache.destroy();
  }
}
