import {
  ENCRYPTION_CONFIG,
  STORAGE_KEYS,
  CACHE_LIMITS,
  ENCODING,
} from './constants';

export interface EncryptedNote {
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
}

// Type guard interface for checking if an object has encrypted fields
interface PotentiallyEncrypted {
  encryptedTitle?: unknown;
  encryptedContent?: unknown;
  iv?: unknown;
  salt?: unknown;
}

class EncryptionService {
  private decryptCache = new Map<string, { title: string; content: string }>();
  private userSecrets = new Map<string, string>();

  constructor() {
    if (typeof window !== 'undefined' && !window.crypto?.subtle) {
      throw new Error(
        'Web Crypto API not available. HTTPS required for encryption.'
      );
    }
  }

  private getUserSecret(userId: string): string {
    if (this.userSecrets.has(userId)) {
      return this.userSecrets.get(userId)!;
    }

    const storageKey = STORAGE_KEYS.USER_SECRET(userId);
    let secret = localStorage.getItem(storageKey);

    if (!secret) {
      const randomBytes = crypto.getRandomValues(new Uint8Array(64));
      secret = this.arrayBufferToBase64(randomBytes);
      localStorage.setItem(storageKey, secret);
    }

    this.userSecrets.set(userId, secret);
    return secret;
  }

  async deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const userSecret = this.getUserSecret(userId);

    const keyMaterialString = `${userId}-${userSecret}-secure-v2`;

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keyMaterialString),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: ENCRYPTION_CONFIG.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        length: ENCRYPTION_CONFIG.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptNote(
    userId: string,
    title: string,
    content: string
  ): Promise<EncryptedNote> {
    if (!userId) {
      throw new Error('User ID is required for encryption');
    }

    const salt = crypto.getRandomValues(
      new Uint8Array(ENCRYPTION_CONFIG.SALT_LENGTH)
    );
    const iv = crypto.getRandomValues(
      new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH)
    );
    const key = await this.deriveKey(userId, salt);

    const encoder = new TextEncoder();
    const titleBytes = encoder.encode(title || '');
    const contentBytes = encoder.encode(content || '');

    const encryptedTitleBuffer = await crypto.subtle.encrypt(
      { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
      key,
      titleBytes
    );

    const encryptedContentBuffer = await crypto.subtle.encrypt(
      { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
      key,
      contentBytes
    );

    return {
      encryptedTitle: this.arrayBufferToBase64(encryptedTitleBuffer),
      encryptedContent: this.arrayBufferToBase64(encryptedContentBuffer),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
    };
  }

  async decryptNote(
    userId: string,
    encryptedTitle: string,
    encryptedContent: string,
    ivBase64: string,
    saltBase64: string
  ): Promise<{ title: string; content: string }> {
    const cacheKey = `${userId}-${encryptedTitle}-${ivBase64}`;

    if (this.decryptCache.has(cacheKey)) {
      return this.decryptCache.get(cacheKey)!;
    }

    try {
      const salt = this.base64ToUint8Array(saltBase64);
      const iv = this.base64ToUint8Array(ivBase64);
      const key = await this.deriveKey(userId, salt);

      const titleBuffer = this.base64ToArrayBuffer(encryptedTitle);
      const contentBuffer = this.base64ToArrayBuffer(encryptedContent);

      const decryptedTitleBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
        key,
        titleBuffer
      );

      const decryptedContentBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
        key,
        contentBuffer
      );

      const decoder = new TextDecoder();
      const title = decoder.decode(decryptedTitleBuffer);
      const content = decoder.decode(decryptedContentBuffer);

      const result = { title, content };

      if (this.decryptCache.size > CACHE_LIMITS.DECRYPT_CACHE_SIZE) {
        const firstKey = this.decryptCache.keys().next().value;
        if (typeof firstKey === 'string') {
          this.decryptCache.delete(firstKey);
        }
      }

      this.decryptCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt note.');
    }
  }

  isEncrypted(note: PotentiallyEncrypted): boolean {
    return !!(
      note.encryptedTitle &&
      note.encryptedContent &&
      note.iv &&
      note.salt
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const chunks: string[] = [];

    for (let i = 0; i < bytes.length; i += ENCODING.CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + ENCODING.CHUNK_SIZE);
      chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    return btoa(chunks.join(''));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const bytes = this.base64ToUint8Array(base64);
    return bytes.buffer;
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  clearKeys(): void {
    this.decryptCache.clear();
  }
}

export const encryptionService = new EncryptionService();

export async function encryptNoteData(
  userId: string,
  title: string,
  content: string
): Promise<EncryptedNote> {
  return encryptionService.encryptNote(userId, title, content);
}

export async function decryptNoteData(
  userId: string,
  encryptedTitle: string,
  encryptedContent: string,
  iv: string,
  salt: string
): Promise<{ title: string; content: string }> {
  return encryptionService.decryptNote(
    userId,
    encryptedTitle,
    encryptedContent,
    iv,
    salt
  );
}

export function isNoteEncrypted(note: PotentiallyEncrypted): boolean {
  return encryptionService.isEncrypted(note);
}

export function clearEncryptionKeys(): void {
  encryptionService.clearKeys();
}
