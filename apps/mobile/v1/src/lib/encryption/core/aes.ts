/**
 * AES-GCM Encryption/Decryption
 * Using react-native-quick-crypto when available (fast native implementation)
 * Falls back to node-forge for compatibility
 */

import forge from 'node-forge';

import { ENCRYPTION_CONFIG } from '../config';

// Try to import native crypto, but don't fail if not available (Expo Go)
let createCipheriv: any = null;
let createDecipheriv: any = null;
let QuickCryptoBuffer: any = null;

try {
  const quickCrypto = require('react-native-quick-crypto');

  // Get the cipher functions
  createCipheriv = quickCrypto.createCipheriv;
  createDecipheriv = quickCrypto.createDecipheriv;

  // Get Buffer from @craftzdog/react-native-buffer (same source as react-native-quick-crypto uses)
  try {
    const { Buffer: RNBuffer } = require('@craftzdog/react-native-buffer');
    QuickCryptoBuffer = RNBuffer;
  } catch (e) {
    // Fallback to global Buffer if available
    // @ts-ignore
    QuickCryptoBuffer = global.Buffer;
  }

  if (createCipheriv && createDecipheriv && QuickCryptoBuffer) {
    console.log('[Encryption] Native AES-GCM available - will use fast implementation');
  } else {
    console.log('[Encryption] Native AES-GCM partially available but missing functions');
    if (__DEV__) {
      console.log('[Encryption] Available:', {
        createCipheriv: !!createCipheriv,
        createDecipheriv: !!createDecipheriv,
        Buffer: !!QuickCryptoBuffer
      });
    }
  }
} catch (error) {
  console.log('[Encryption] Native AES-GCM not available - using node-forge');
}

/**
 * Encrypt plaintext using AES-GCM
 */
export async function encryptWithAESGCM(
  plaintext: string,
  keyBase64: string,
  ivBase64: string
): Promise<string> {
  // Try native implementation first (if available)
  if (createCipheriv && QuickCryptoBuffer) {
    try {
      const key = QuickCryptoBuffer.from(keyBase64, 'base64');
      const iv = QuickCryptoBuffer.from(ivBase64, 'base64');

      const cipher = createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = QuickCryptoBuffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();
      const encryptedWithTag = QuickCryptoBuffer.concat([encrypted, authTag]);

      return encryptedWithTag.toString('base64');
    } catch (error) {
      console.warn('[Encryption] Native AES-GCM encryption failed, falling back to node-forge:', error);
    }
  }

  // Fallback to node-forge
  const key = forge.util.decode64(keyBase64);
  const iv = forge.util.decode64(ivBase64);

  const cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: forge.util.createBuffer(iv) });
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));
  cipher.finish();

  const ciphertext = cipher.output.getBytes();
  const authTag = cipher.mode.tag.getBytes();
  const encryptedWithTag = ciphertext + authTag;

  return forge.util.encode64(encryptedWithTag);
}

/**
 * Decrypt ciphertext using AES-GCM
 */
export async function decryptWithAESGCM(
  encryptedBase64: string,
  keyBase64: string,
  ivBase64: string
): Promise<string> {
  // Try native implementation first (if available)
  if (createDecipheriv && QuickCryptoBuffer) {
    try {
      const key = QuickCryptoBuffer.from(keyBase64, 'base64');
      const iv = QuickCryptoBuffer.from(ivBase64, 'base64');
      const encryptedDataWithTag = QuickCryptoBuffer.from(encryptedBase64, 'base64');

      const tagLength = ENCRYPTION_CONFIG.GCM_TAG_LENGTH;

      if (encryptedDataWithTag.length < tagLength) {
        throw new Error(
          `Encrypted data too short for GCM (${encryptedDataWithTag.length} bytes, need at least ${tagLength})`
        );
      }

      // Split the data: ciphertext + auth tag (last 16 bytes)
      const ciphertext = encryptedDataWithTag.subarray(0, -tagLength);
      const authTag = encryptedDataWithTag.subarray(-tagLength);

      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext);
      decrypted = QuickCryptoBuffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (__DEV__) {
        console.error('[Encryption] ❌ Native AES-GCM decryption failed:', error);
        console.error('[Encryption] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
    }
  }

  // Fallback to node-forge
  const key = forge.util.decode64(keyBase64);
  const iv = forge.util.decode64(ivBase64);
  const encryptedDataWithTag = forge.util.decode64(encryptedBase64);

  const tagLength = ENCRYPTION_CONFIG.GCM_TAG_LENGTH;

  if (encryptedDataWithTag.length < tagLength) {
    throw new Error(
      `Encrypted data too short for GCM (${encryptedDataWithTag.length} bytes, need at least ${tagLength})`
    );
  }

  const ciphertext = encryptedDataWithTag.slice(0, -tagLength);
  const authTag = encryptedDataWithTag.slice(-tagLength);

  const decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({
    iv: forge.util.createBuffer(iv),
    tag: forge.util.createBuffer(authTag),
  });

  decipher.update(forge.util.createBuffer(ciphertext));

  const success = decipher.finish();

  if (!success) {
    throw new Error('GCM authentication failed - auth tag verification failed');
  }

  return decipher.output.toString();
}
