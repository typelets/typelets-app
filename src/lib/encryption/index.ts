import {
  ENCRYPTION_CONFIG,
  STORAGE_KEYS,
  CACHE_LIMITS,
  ENCODING,
} from './constants';
import { secureStorage } from './secureStorage';
import { SecureString } from '../utils/secureString';
import { SecureError, logSecureError } from '../errors/SecureError';

export interface EncryptedNote {
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
}

interface PotentiallyEncrypted {
  encryptedTitle?: unknown;
  encryptedContent?: unknown;
  iv?: unknown;
  salt?: unknown;
}

interface CacheEntry {
  data: { title: string; content: string };
  timestamp: number;
}

class EncryptionService {
  private decryptCache = new Map<string, CacheEntry>();
  private userSecrets = new Map<string, string>();
  private cacheTTL = 1000 * 60 * 15;
  private masterPasswordMode = false;

  constructor() {
    if (typeof window !== 'undefined' && !window.crypto?.subtle) {
      throw new SecureError(
        'Web Crypto API not available in current environment',
        'Encryption not available. Please use HTTPS.',
        'CRYPTO_001',
        'critical'
      );
    }

    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpiredCache(), 1000 * 60 * 5);
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.decryptCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.cacheTTL) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.decryptCache.delete(key));
  }

  hasMasterPassword(userId: string): boolean {
    return localStorage.getItem(`has_master_password_${userId}`) === 'true';
  }

  isMasterPasswordUnlocked(userId: string): boolean {
    return localStorage.getItem(`enc_master_key_${userId}`) !== null;
  }

  async setupMasterPassword(
    masterPassword: string | SecureString,
    userId: string
  ): Promise<void> {
    if (!userId) {
      throw new SecureError(
        'Master password setup attempted without user ID',
        'Authentication required',
        'AUTH_001',
        'high'
      );
    }

    const securePassword =
      typeof masterPassword === 'string'
        ? new SecureString(masterPassword)
        : masterPassword;

    try {
      const encoder = new TextEncoder();
      const userSalt = encoder.encode(`typelets-salt-${userId}-v1`);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        securePassword.getBytes().buffer as ArrayBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: userSalt.buffer as ArrayBuffer,
          iterations: ENCRYPTION_CONFIG.ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        {
          name: ENCRYPTION_CONFIG.ALGORITHM,
          length: ENCRYPTION_CONFIG.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyString = this.arrayBufferToBase64(new Uint8Array(exportedKey));

      localStorage.setItem(`enc_master_key_${userId}`, keyString);
      localStorage.setItem(`has_master_password_${userId}`, 'true');
      this.masterPasswordMode = true;

      const oldKey = STORAGE_KEYS.USER_SECRET(userId);
      if (localStorage.getItem(oldKey)) {
        localStorage.removeItem(oldKey);
      }
    } catch (error) {
      throw new SecureError(
        `Master password setup failed: ${error}`,
        'Failed to setup master password. Please try again.',
        'CRYPTO_003',
        'high',
        error
      );
    } finally {
      // Always clear the secure password from memory
      if (typeof masterPassword === 'string') {
        securePassword.clear();
      }
    }
  }

  async unlockWithMasterPassword(
    masterPassword: string | SecureString,
    userId: string
  ): Promise<boolean> {
    const securePassword =
      typeof masterPassword === 'string'
        ? new SecureString(masterPassword)
        : masterPassword;

    try {
      const encoder = new TextEncoder();
      const userSalt = encoder.encode(`typelets-salt-${userId}-v1`);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        securePassword.getBytes().buffer as ArrayBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: userSalt.buffer as ArrayBuffer,
          iterations: ENCRYPTION_CONFIG.ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        {
          name: ENCRYPTION_CONFIG.ALGORITHM,
          length: ENCRYPTION_CONFIG.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyString = this.arrayBufferToBase64(new Uint8Array(exportedKey));

      const testKey = `test_encryption_${userId}`;
      const testData = localStorage.getItem(testKey);

      if (testData) {
        try {
          const testObj = JSON.parse(testData);
          const iv = this.base64ToUint8Array(testObj.iv);
          const encryptedData = this.base64ToArrayBuffer(testObj.data);

          await crypto.subtle.decrypt(
            { name: ENCRYPTION_CONFIG.ALGORITHM, iv: iv.buffer as ArrayBuffer },
            key,
            encryptedData
          );
        } catch {
          return false;
        }
      }

      localStorage.setItem(`enc_master_key_${userId}`, keyString);
      localStorage.setItem(`has_master_password_${userId}`, 'true');
      this.masterPasswordMode = true;

      const oldKey = STORAGE_KEYS.USER_SECRET(userId);
      if (localStorage.getItem(oldKey)) {
        localStorage.removeItem(oldKey);
      }

      return true;
    } catch (error) {
      logSecureError(
        new SecureError(
          `Master password unlock failed: ${error}`,
          'Invalid password. Please try again.',
          'CRYPTO_003',
          'high',
          error
        ),
        'unlockWithMasterPassword'
      );
      return false;
    } finally {
      // Always clear the secure password from memory
      if (typeof masterPassword === 'string') {
        securePassword.clear();
      }
    }
  }

  private async getUserSecret(userId: string): Promise<string> {
    // Master password mode takes precedence - these are already derived keys
    const masterKey = localStorage.getItem(`enc_master_key_${userId}`);
    if (masterKey) {
      this.masterPasswordMode = true;
      return masterKey;
    }

    // Check memory cache first (for performance)
    if (this.userSecrets.has(userId)) {
      return this.userSecrets.get(userId)!;
    }

    // Use secure storage for fallback user secrets (when no master password)
    const storageKey = STORAGE_KEYS.USER_SECRET(userId);
    let secret = await secureStorage.getSecureItem(storageKey);

    if (!secret) {
      // Generate new random secret and store it securely
      const randomBytes = crypto.getRandomValues(new Uint8Array(64));
      secret = this.arrayBufferToBase64(randomBytes);
      await secureStorage.setSecureItem(storageKey, secret);
    }

    // Cache in memory for performance (cleared on page reload for security)
    this.userSecrets.set(userId, secret);
    return secret;
  }

  async deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
    if (!userId) {
      throw new SecureError(
        'Key derivation attempted without user ID',
        'Authentication required',
        'CRYPTO_003',
        'high'
      );
    }

    try {
      const encoder = new TextEncoder();
      const userSecret = await this.getUserSecret(userId);

    if (
      this.masterPasswordMode &&
      localStorage.getItem(`enc_master_key_${userId}`)
    ) {
      const keyData = this.base64ToUint8Array(userSecret);
      return crypto.subtle.importKey(
        'raw',
        keyData.buffer as ArrayBuffer,
        { name: ENCRYPTION_CONFIG.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );
    }

    const keyMaterialString = `${userId}-${userSecret}-typelets-secure-v2`;

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
        salt: salt.buffer as ArrayBuffer,
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
    } catch (error) {
      throw new SecureError(
        `Key derivation failed: ${error}`,
        'Failed to generate encryption key',
        'CRYPTO_003',
        'high',
        error
      );
    }
  }

  async encryptNote(
    userId: string,
    title: string,
    content: string
  ): Promise<EncryptedNote> {
    if (!userId) {
      throw new SecureError(
        'Encryption attempted without user ID',
        'Authentication required for encryption',
        'CRYPTO_001',
        'high'
      );
    }

    try {
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

      if (
        this.masterPasswordMode &&
        !localStorage.getItem(`test_encryption_${userId}`)
      ) {
        const testData = await crypto.subtle.encrypt(
          { name: ENCRYPTION_CONFIG.ALGORITHM, iv },
          key,
          encoder.encode('test')
        );
        localStorage.setItem(
          `test_encryption_${userId}`,
          JSON.stringify({
            data: this.arrayBufferToBase64(testData),
            iv: this.arrayBufferToBase64(iv),
          })
        );
      }

      return {
        encryptedTitle: this.arrayBufferToBase64(encryptedTitleBuffer),
        encryptedContent: this.arrayBufferToBase64(encryptedContentBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
      };
    } catch (error) {
      throw new SecureError(
        `Encryption failed for user ${userId}: ${error}`,
        'Failed to encrypt note. Please try again.',
        'CRYPTO_001',
        'high',
        error
      );
    }
  }

  async decryptNote(
    userId: string,
    encryptedTitle: string,
    encryptedContent: string,
    ivBase64: string,
    saltBase64: string
  ): Promise<{ title: string; content: string }> {
    const cacheKey = `${userId}-${encryptedTitle}-${ivBase64}`;

    const cached = this.decryptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const salt = this.base64ToUint8Array(saltBase64);
      const iv = this.base64ToUint8Array(ivBase64);
      const key = await this.deriveKey(userId, salt);

      const titleBuffer = this.base64ToArrayBuffer(encryptedTitle);
      const contentBuffer = this.base64ToArrayBuffer(encryptedContent);

      const decryptedTitleBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv: iv.buffer as ArrayBuffer },
        key,
        titleBuffer
      );

      const decryptedContentBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_CONFIG.ALGORITHM, iv: iv.buffer as ArrayBuffer },
        key,
        contentBuffer
      );

      const decoder = new TextDecoder();
      const title = decoder.decode(decryptedTitleBuffer);
      const content = decoder.decode(decryptedContentBuffer);

      const result = { title, content };

      if (this.decryptCache.size >= CACHE_LIMITS.DECRYPT_CACHE_SIZE) {
        const firstKey = this.decryptCache.keys().next().value;
        if (typeof firstKey === 'string') {
          this.decryptCache.delete(firstKey);
        }
      }

      this.decryptCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      throw new SecureError(
        `Decryption failed for user ${userId}: ${error}`,
        'Unable to decrypt note. Please check your password.',
        'CRYPTO_002',
        'high',
        error
      );
    }
  }

  isEncrypted(note: PotentiallyEncrypted): boolean {
    return !!(
      note.encryptedTitle &&
      note.encryptedContent &&
      note.iv &&
      note.salt &&
      typeof note.encryptedTitle === 'string' &&
      typeof note.encryptedContent === 'string' &&
      typeof note.iv === 'string' &&
      typeof note.salt === 'string'
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const chunks: string[] = [];

    for (let i = 0; i < bytes.length; i += ENCODING.CHUNK_SIZE) {
      const chunk = bytes.subarray(
        i,
        Math.min(i + ENCODING.CHUNK_SIZE, bytes.length)
      );
      chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }

    return btoa(chunks.join(''));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const bytes = this.base64ToUint8Array(base64);
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
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
    this.userSecrets.clear();
    // Clear secure storage session for additional security
    secureStorage.clearSession();
  }

  clearUserData(userId: string): void {
    // Clear all encryption keys from regular localStorage
    localStorage.removeItem(`enc_master_key_${userId}`);
    localStorage.removeItem(`has_master_password_${userId}`);
    localStorage.removeItem(`test_encryption_${userId}`);

    // Clear secure storage (encrypted user secrets)
    secureStorage.removeSecureItem(STORAGE_KEYS.USER_SECRET(userId));

    // Also remove any legacy plain-text secrets
    localStorage.removeItem(STORAGE_KEYS.USER_SECRET(userId));

    // Clear from memory
    this.userSecrets.delete(userId);
    this.masterPasswordMode = false;

    // Clear cache entries for this user
    const keysToDelete: string[] = [];
    this.decryptCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.decryptCache.delete(key));
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

export function clearUserEncryptionData(userId: string): void {
  encryptionService.clearUserData(userId);
}

export function hasMasterPassword(userId: string): boolean {
  return encryptionService.hasMasterPassword(userId);
}

export function isMasterPasswordUnlocked(userId: string): boolean {
  return encryptionService.isMasterPasswordUnlocked(userId);
}

export async function setupMasterPassword(
  masterPassword: string | SecureString,
  userId: string
): Promise<void> {
  return encryptionService.setupMasterPassword(masterPassword, userId);
}

export async function unlockWithMasterPassword(
  masterPassword: string | SecureString,
  userId: string
): Promise<boolean> {
  return encryptionService.unlockWithMasterPassword(masterPassword, userId);
}
