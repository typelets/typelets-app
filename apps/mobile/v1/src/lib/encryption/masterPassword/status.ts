/**
 * Master Password Status Checks
 */

import { hasMasterPasswordFlag, getMasterKey } from '../storage/secureStorage';

/**
 * Check if user has a master password set
 */
export async function hasMasterPassword(userId: string): Promise<boolean> {
  try {
    const result = await hasMasterPasswordFlag(userId);
    if (__DEV__) {
      console.log(`🔍 hasMasterPassword(${userId}): ${result}`);
    }
    return result;
  } catch (error) {
    if (__DEV__) {
      console.log(`❌ hasMasterPassword(${userId}) error:`, error);
    }
    return false;
  }
}

/**
 * Check if master password is currently unlocked
 */
export async function isMasterPasswordUnlocked(userId: string): Promise<boolean> {
  try {
    const masterKey = await getMasterKey(userId);
    const result = masterKey !== null;
    if (__DEV__) {
      console.log(`🔍 isMasterPasswordUnlocked(${userId}): ${result}`);
      if (masterKey) {
        console.log(`🔍 masterKey preview: ${masterKey.substring(0, 10)}...`);
      }
    }
    return result;
  } catch (error) {
    if (__DEV__) {
      console.log(`❌ isMasterPasswordUnlocked(${userId}) error:`, error);
    }
    return false;
  }
}
