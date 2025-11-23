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
  if (!userId) {
    throw new Error('Master password setup attempted without user ID');
  }

  try {
    const userSalt = getUserSalt(userId);

    // Use PBKDF2 implementation (will block for ~2 minutes)
    const keyString = await pbkdf2(masterPassword, userSalt);

    // Store master key
    await storeMasterKey(userId, keyString);

    // Remove old key if exists
    await deleteOldUserSecret(userId);
  } catch (error) {
    throw new Error(`Master password setup failed: ${error}`);
  }
}
