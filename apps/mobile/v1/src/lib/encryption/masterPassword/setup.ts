/**
 * Master Password Setup
 */

import { pbkdf2 } from '../core/keyDerivation';
import { deleteOldUserSecret,storeMasterKey } from '../storage/secureStorage';
import { getUserSalt } from '../storage/storageKeys';

/**
 * Setup a new master password for a user
 */
export async function setupMasterPassword(
  masterPassword: string,
  userId: string
): Promise<void> {
  if (__DEV__) {
    console.log('🔒 setupMasterPassword called for user:', userId);
  }

  if (!userId) {
    throw new Error('Master password setup attempted without user ID');
  }

  try {
    const userSalt = getUserSalt(userId);

    if (__DEV__) {
      console.log('🔒 Starting PBKDF2 key derivation...');
    }

    // Use PBKDF2 implementation (will block for ~2 minutes)
    const keyString = await pbkdf2(masterPassword, userSalt);

    if (__DEV__) {
      console.log('🔒 PBKDF2 completed, storing keys...');
    }

    // Store master key
    await storeMasterKey(userId, keyString);

    if (__DEV__) {
      console.log('🔒 Master key stored');
    }

    // Remove old key if exists
    await deleteOldUserSecret(userId);

    if (__DEV__) {
      console.log('🔒 setupMasterPassword completed successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.log('🔒 setupMasterPassword error:', error);
    }
    throw new Error(`Master password setup failed: ${error}`);
  }
}
