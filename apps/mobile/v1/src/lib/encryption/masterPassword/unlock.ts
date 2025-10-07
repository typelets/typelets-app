/**
 * Master Password Unlock
 */

import * as SecureStore from 'expo-secure-store';
import { pbkdf2 } from '../core/keyDerivation';
import { decryptWithAESGCM } from '../core/aes';
import { storeMasterKey, deleteOldUserSecret } from '../storage/secureStorage';
import { getUserSalt, STORAGE_KEYS } from '../storage/storageKeys';

/**
 * Unlock with master password
 */
export async function unlockWithMasterPassword(
  masterPassword: string,
  userId: string
): Promise<boolean> {
  try {
    const userSalt = getUserSalt(userId);

    // Use PBKDF2 implementation
    const keyString = await pbkdf2(masterPassword, userSalt);

    // Test if we can decrypt existing data (if any)
    const testKey = STORAGE_KEYS.TEST_ENCRYPTION(userId);
    try {
      const testData = await SecureStore.getItemAsync(testKey);
      if (testData) {
        const testObj = JSON.parse(testData);

        // Try to decrypt test data with generated key
        await decryptWithAESGCM(testObj.data, keyString, testObj.iv);
      }
    } catch {
      return false; // Decryption failed, wrong password
    }

    // Store master key
    await storeMasterKey(userId, keyString);

    // Remove old key if exists
    await deleteOldUserSecret(userId);

    return true;
  } catch {
    return false;
  }
}
