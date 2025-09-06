// Secure storage wrapper to encrypt sensitive data before storing in localStorage
import { ENCRYPTION_CONFIG } from './constants';

class SecureStorage {
  private sessionKey: CryptoKey | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Generate a session-based encryption key
    // This key exists only in memory and is lost on page reload
    this.sessionKey = await crypto.subtle.generateKey(
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        length: ENCRYPTION_CONFIG.KEY_LENGTH,
      },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );

    this.isInitialized = true;
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    if (!this.sessionKey) {
      await this.initialize();
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH));
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
        this.sessionKey!,
        data
      );

      // Store encrypted data + IV
      const payload = {
        encrypted: this.arrayBufferToBase64(encryptedData),
        iv: this.arrayBufferToBase64(iv),
      };

      localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to encrypt storage item:', error);
      throw new Error('Secure storage encryption failed');
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    if (!this.sessionKey) {
      await this.initialize();
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const payload = JSON.parse(stored);
      if (!payload.encrypted || !payload.iv) {
        // Handle legacy plain-text storage by removing it
        localStorage.removeItem(key);
        return null;
      }

      // Decrypt the data
      const encryptedData = this.base64ToArrayBuffer(payload.encrypted);
      const iv = this.base64ToUint8Array(payload.iv);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
        this.sessionKey!,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Failed to decrypt storage item:', error);
      // If decryption fails, remove the corrupted item
      localStorage.removeItem(key);
      return null;
    }
  }

  removeSecureItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Clear all session keys on logout/cleanup
  clearSession(): void {
    this.sessionKey = null;
    this.isInitialized = false;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunks: string[] = [];
    const CHUNK_SIZE = 8192;

    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
      chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    return btoa(chunks.join(''));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const bytes = this.base64ToUint8Array(base64);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

export const secureStorage = new SecureStorage();