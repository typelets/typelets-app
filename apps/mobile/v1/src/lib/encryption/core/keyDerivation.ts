/**
 * Key Derivation Functions
 * PBKDF2 implementation using node-forge
 */

import forge from 'node-forge';
import { ENCRYPTION_CONFIG } from '../config';


/**
 * PBKDF2 implementation using node-forge to match web app
 */
export async function pbkdf2(
  password: string,
  salt: string,
  iterations: number = ENCRYPTION_CONFIG.ITERATIONS,
  keyLength: number = ENCRYPTION_CONFIG.KEY_LENGTH
): Promise<string> {
  try {
    // Convert inputs to proper format to match web app
    const passwordBytes = forge.util.encodeUtf8(password);

    // Salt is already a string, use it directly
    const saltBytes = forge.util.encodeUtf8(salt);

    // Perform PBKDF2 computation (will block for ~2 minutes with 250k iterations)
    const derivedKey = forge.pkcs5.pbkdf2(
      passwordBytes,
      saltBytes,
      iterations,
      keyLength / 8, // Convert bits to bytes
      'sha256'
    );

    return forge.util.encode64(derivedKey);
  } catch (error) {
    throw new Error(`PBKDF2 key derivation failed: ${error}`);
  }
}

/**
 * Derive encryption key from user secret and salt
 */
export async function deriveEncryptionKey(
  userId: string,
  userSecret: string,
  saltBase64: string
): Promise<string> {
  const keyMaterialString = `${userId}-${userSecret}-typelets-secure-v2`;
  return pbkdf2(keyMaterialString, saltBase64);
}
