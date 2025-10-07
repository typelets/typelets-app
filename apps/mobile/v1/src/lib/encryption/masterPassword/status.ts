/**
 * Master Password Status Checks
 */

import { hasMasterPasswordFlag, getMasterKey } from '../storage/secureStorage';

/**
 * Check if user has a master password set
 */
export async function hasMasterPassword(userId: string): Promise<boolean> {
  try {
    return await hasMasterPasswordFlag(userId);
  } catch (error) {
    if (__DEV__) {
      console.error('hasMasterPassword error:', error);
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
    return masterKey !== null;
  } catch (error) {
    if (__DEV__) {
      console.error('isMasterPasswordUnlocked error:', error);
    }
    return false;
  }
}
