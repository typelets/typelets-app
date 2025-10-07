/**
 * Encryption Module - Main Exports
 * Provides the same API as the old monolithic encryption.ts
 */

import { MobileEncryptionService } from './EncryptionService';
import { setupMasterPassword as setupMP } from './masterPassword/setup';
import { unlockWithMasterPassword as unlockMP } from './masterPassword/unlock';
import {
  hasMasterPassword as hasMP,
  isMasterPasswordUnlocked as isMPUnlocked,
} from './masterPassword/status';
import type { PotentiallyEncrypted } from './types';

// Re-export types
export type { EncryptedNote, PotentiallyEncrypted, DecryptedData } from './types';

// Create singleton instance
export const encryptionService = new MobileEncryptionService();

/**
 * Encrypt note data
 */
export async function encryptNoteData(
  userId: string,
  title: string,
  content: string
) {
  return encryptionService.encryptNote(userId, title, content);
}

/**
 * Decrypt note data
 */
export async function decryptNoteData(
  userId: string,
  encryptedTitle: string,
  encryptedContent: string,
  iv: string,
  salt: string
) {
  return encryptionService.decryptNote(
    userId,
    encryptedTitle,
    encryptedContent,
    iv,
    salt
  );
}

/**
 * Check if note is encrypted
 */
export function isNoteEncrypted(note: unknown) {
  return encryptionService.isEncrypted(note as PotentiallyEncrypted);
}

/**
 * Clear all encryption keys
 */
export function clearEncryptionKeys(): void {
  encryptionService.clearKeys();
}

/**
 * Clear user encryption data
 */
export async function clearUserEncryptionData(userId: string): Promise<void> {
  return encryptionService.clearUserData(userId);
}

/**
 * Clear note cache for user
 */
export function clearNoteCacheForUser(userId: string, encryptedTitle?: string): void {
  return encryptionService.clearNoteCache(userId, encryptedTitle);
}

/**
 * Check if user has master password
 */
export async function hasMasterPassword(userId: string): Promise<boolean> {
  return hasMP(userId);
}

/**
 * Check if master password is unlocked
 */
export async function isMasterPasswordUnlocked(userId: string): Promise<boolean> {
  return isMPUnlocked(userId);
}

/**
 * Setup master password
 */
export async function setupMasterPassword(
  masterPassword: string,
  userId: string
): Promise<void> {
  await setupMP(masterPassword, userId);
  encryptionService.enableMasterPasswordMode();
}

/**
 * Unlock with master password
 */
export async function unlockWithMasterPassword(
  masterPassword: string,
  userId: string
): Promise<boolean> {
  const result = await unlockMP(masterPassword, userId);
  if (result) {
    encryptionService.enableMasterPasswordMode();
  }
  return result;
}
