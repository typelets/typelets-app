/**
 * AES-GCM Encryption/Decryption
 * Using node-forge for compatibility with web app
 */

import forge from 'node-forge';

import { ENCRYPTION_CONFIG } from '../config';

/**
 * Encrypt plaintext using AES-GCM
 */
export async function encryptWithAESGCM(
  plaintext: string,
  keyBase64: string,
  ivBase64: string
): Promise<string> {
  // Convert base64 to forge-compatible format
  const key = forge.util.decode64(keyBase64);
  const iv = forge.util.decode64(ivBase64);

  // Create AES-GCM cipher
  const cipher = forge.cipher.createCipher('AES-GCM', key);

  // Start encryption with IV
  cipher.start({ iv: forge.util.createBuffer(iv) });

  // Update with plaintext
  cipher.update(forge.util.createBuffer(plaintext, 'utf8'));

  // Finish encryption
  cipher.finish();

  // Get ciphertext and auth tag
  const ciphertext = cipher.output.getBytes();
  const authTag = cipher.mode.tag.getBytes();

  // Combine ciphertext + auth tag (Web Crypto API format)
  const encryptedWithTag = ciphertext + authTag;

  // Convert to base64
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
  // Convert base64 to forge-compatible format
  const key = forge.util.decode64(keyBase64);
  const iv = forge.util.decode64(ivBase64);
  const encryptedDataWithTag = forge.util.decode64(encryptedBase64);

  // For node-forge GCM, we need to manually handle the auth tag
  // Web Crypto API embeds the auth tag at the end of the encrypted data
  const tagLength = ENCRYPTION_CONFIG.GCM_TAG_LENGTH;

  if (encryptedDataWithTag.length < tagLength) {
    throw new Error(
      `Encrypted data too short for GCM (${encryptedDataWithTag.length} bytes, need at least ${tagLength})`
    );
  }

  // Split the data: ciphertext + auth tag (last 16 bytes)
  const ciphertext = encryptedDataWithTag.slice(0, -tagLength);
  const authTag = encryptedDataWithTag.slice(-tagLength);

  // Create AES-GCM decipher
  const decipher = forge.cipher.createDecipher('AES-GCM', key);

  // Start decryption with IV and auth tag
  decipher.start({
    iv: forge.util.createBuffer(iv),
    tag: forge.util.createBuffer(authTag),
  });

  // Update with ciphertext
  decipher.update(forge.util.createBuffer(ciphertext));

  // Finish and verify auth tag
  const success = decipher.finish();

  if (!success) {
    throw new Error('GCM authentication failed - auth tag verification failed');
  }

  return decipher.output.toString();
}
