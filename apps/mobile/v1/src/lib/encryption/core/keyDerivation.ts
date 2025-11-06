/**
 * Key Derivation Functions
 * PBKDF2 implementation using node-forge (for Expo Go compatibility)
 * Can be upgraded to native implementation in development builds
 */

import forge from 'node-forge';
import { InteractionManager } from 'react-native';

import { ENCRYPTION_CONFIG } from '../config';

// Try to import native crypto, but don't fail if not available (Expo Go)
let nativePbkdf2: any = null;
let QuickCryptoBuffer: any = null;
try {
  // Dynamic import - won't crash if module not available
  const quickCrypto = require('react-native-quick-crypto');
  nativePbkdf2 = quickCrypto.pbkdf2;
  QuickCryptoBuffer = quickCrypto.Buffer;
  console.log('[Encryption] Native PBKDF2 available - will use fast implementation');
} catch (error) {
  console.log('[Encryption] Native PBKDF2 not available - using node-forge (slower but compatible with Expo Go)');
}

/**
 * PBKDF2 implementation with automatic native/fallback selection
 * - Uses react-native-quick-crypto if available (development builds)
 * - Falls back to node-forge for Expo Go compatibility
 *
 * Performance:
 * - Native: ~2-5 seconds, non-blocking
 * - Fallback: ~120 seconds, UI responsive after initial delay
 */
export async function pbkdf2(
  password: string,
  salt: string,
  iterations: number = ENCRYPTION_CONFIG.ITERATIONS,
  keyLength: number = ENCRYPTION_CONFIG.KEY_LENGTH
): Promise<string> {
  // Try native implementation first (if available)
  if (nativePbkdf2 && QuickCryptoBuffer) {
    try {
      const passwordBuffer = QuickCryptoBuffer.from(password, 'utf8');
      const saltBuffer = QuickCryptoBuffer.from(salt, 'utf8');

      const derivedKey = await nativePbkdf2(
        passwordBuffer,
        saltBuffer,
        iterations,
        keyLength / 8,
        'sha256'
      );

      return derivedKey.toString('base64');
    } catch (error) {
      console.warn('[Encryption] Native PBKDF2 failed, falling back to node-forge:', error);
    }
  }

  // Fallback to node-forge
  return pbkdf2Fallback(password, salt, iterations, keyLength);
}

/**
 * Fallback PBKDF2 implementation using node-forge
 * Used only if native implementation is not available
 */
async function pbkdf2Fallback(
  password: string,
  salt: string,
  iterations: number,
  keyLength: number
): Promise<string> {
  // Convert inputs to proper format
  const passwordBytes = forge.util.encodeUtf8(password);
  const saltBytes = forge.util.encodeUtf8(salt);

  // Perform PBKDF2 computation (synchronous - will block UI)
  const derivedKey = forge.pkcs5.pbkdf2(
    passwordBytes,
    saltBytes,
    iterations,
    keyLength / 8,
    'sha256'
  );

  return forge.util.encode64(derivedKey);
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
