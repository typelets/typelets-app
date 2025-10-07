import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import forge from 'node-forge';

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

const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-CBC' as const, // Changed to CBC for React Native compatibility
  KEY_LENGTH: 256,
  IV_LENGTH: 16,
  ITERATIONS: 250000, // Match web app for compatibility
  SALT_LENGTH: 32,
} as const;

const STORAGE_KEYS = {
  USER_SECRET: (userId: string) => `enc_secret_${userId}`,
} as const;

const CACHE_LIMITS = {
  DECRYPT_CACHE_SIZE: 100,
} as const;

const ENCODING = {
  CHUNK_SIZE: 0x8000,
} as const;

class MobileEncryptionService {
  private decryptCache = new Map<string, CacheEntry>();
  private userSecrets = new Map<string, string>();
  private cacheTTL = 1000 * 60 * 15;
  private masterPasswordMode = false;

  constructor() {
    // Clean expired cache every 5 minutes
    setInterval(() => this.cleanExpiredCache(), 1000 * 60 * 5);
  }

  // PBKDF2 implementation using node-forge to match web app
  private async pbkdf2WithForge(
    password: string,
    salt: string,
    iterations: number,
    keyLength: number
  ): Promise<string> {
    try {
      // Convert inputs to proper format to match web app
      const passwordBytes = forge.util.encodeUtf8(password);

      // Convert salt string to bytes using TextEncoder equivalent
      const saltUint8Array = new TextEncoder().encode(salt);
      const saltBytes = forge.util.createBuffer(saltUint8Array).data;

      // Perform PBKDF2 computation (will block for ~2 minutes)
      const derivedKey = forge.pkcs5.pbkdf2(
        passwordBytes,
        saltBytes,
        iterations,
        keyLength / 8, // Convert bits to bytes
        'sha256'
      );

      return forge.util.encode64(derivedKey);
    } catch (error) {
      throw error;
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

  async hasMasterPassword(userId: string): Promise<boolean> {
    try {
      const hasMasterPassword = await SecureStore.getItemAsync(`has_master_password_${userId}`);
      const result = hasMasterPassword === 'true';
      if (__DEV__) {
        console.log(`🔍 hasMasterPassword(${userId}): stored="${hasMasterPassword}" result=${result}`);
      }
      return result;
    } catch (error) {
      if (__DEV__) {
        console.log(`❌ hasMasterPassword(${userId}) error:`, error);
      }
      return false;
    }
  }

  async isMasterPasswordUnlocked(userId: string): Promise<boolean> {
    try {
      const masterKey = await SecureStore.getItemAsync(`enc_master_key_${userId}`);
      const result = masterKey !== null;
      if (__DEV__) {
        console.log(`🔍 isMasterPasswordUnlocked(${userId}): masterKey exists=${result}`);
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

  async setupMasterPassword(
    masterPassword: string,
    userId: string
  ): Promise<void> {
    if (__DEV__) {
      console.log('🔒 setupMasterPassword called for user:', userId);
    }

    if (!userId) {
      throw new Error('Master password setup attempted without user ID');
    }

    try {
      const userSalt = `typelets-salt-${userId}-v1`;

      if (__DEV__) {
        console.log('🔒 Starting PBKDF2 key derivation...');
      }

      // Use PBKDF2 implementation (will block for ~2 minutes)
      const keyString = await this.pbkdf2WithForge(
        masterPassword,
        userSalt,
        ENCRYPTION_CONFIG.ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH
      );

      if (__DEV__) {
        console.log('🔒 PBKDF2 completed, storing keys...');
      }

      await SecureStore.setItemAsync(`enc_master_key_${userId}`, keyString);

      if (__DEV__) {
        console.log('🔒 Master key stored');
      }

      await SecureStore.setItemAsync(`has_master_password_${userId}`, 'true');

      if (__DEV__) {
        console.log('🔒 Has master password flag stored');
      }

      this.masterPasswordMode = true;

      // Remove old key if exists
      const oldKey = STORAGE_KEYS.USER_SECRET(userId);
      try {
        await SecureStore.deleteItemAsync(oldKey);
        if (__DEV__) {
          console.log('🔒 Old key deleted');
        }
      } catch {
        // Ignore if doesn't exist
        if (__DEV__) {
          console.log('🔒 No old key to delete');
        }
      }

      if (__DEV__) {
        console.log('🔒 setupMasterPassword completed successfully');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('🔒 setupMasterPassword error:', error);
      }
      throw new Error(`Master password setup failed: ${error}`);
    }
  }

  async unlockWithMasterPassword(masterPassword: string, userId: string): Promise<boolean> {
    try {
      const userSalt = `typelets-salt-${userId}-v1`;

      // Use PBKDF2 implementation
      const keyString = await this.pbkdf2WithForge(
        masterPassword,
        userSalt,
        ENCRYPTION_CONFIG.ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH
      );

      // Test if we can decrypt existing data (if any)
      const testKey = `test_encryption_${userId}`;
      try {
        const testData = await SecureStore.getItemAsync(testKey);
        if (testData) {
          const testObj = JSON.parse(testData);

          // Try to decrypt test data with generated key
          await this.decryptWithAESGCM(testObj.data, keyString, testObj.iv);
        }
      } catch {
        return false; // Decryption failed, wrong password
      }

      await SecureStore.setItemAsync(`enc_master_key_${userId}`, keyString);
      await SecureStore.setItemAsync(`has_master_password_${userId}`, 'true');
      this.masterPasswordMode = true;

      // Remove old key if exists
      const oldKey = STORAGE_KEYS.USER_SECRET(userId);
      try {
        await SecureStore.deleteItemAsync(oldKey);
      } catch {
        // Ignore if doesn't exist
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async getUserSecret(userId: string): Promise<string> {
    // Master password mode takes precedence
    try {
      const masterKey = await SecureStore.getItemAsync(`enc_master_key_${userId}`);
      if (masterKey) {
        this.masterPasswordMode = true;
        return masterKey;
      }
    } catch {
      // Continue to fallback
    }

    // Check memory cache first
    if (this.userSecrets.has(userId)) {
      return this.userSecrets.get(userId)!;
    }

    // Use secure storage for fallback user secrets
    const storageKey = STORAGE_KEYS.USER_SECRET(userId);
    try {
      let secret = await SecureStore.getItemAsync(storageKey);

      if (!secret) {
        // Generate new random secret and store it securely
        const randomBytes = await Crypto.getRandomBytesAsync(64);
        secret = this.arrayBufferToBase64(randomBytes);
        await SecureStore.setItemAsync(storageKey, secret);
      }

      // Cache in memory for performance
      this.userSecrets.set(userId, secret);
      return secret;
    } catch (error) {
      throw new Error(`Failed to get user secret: ${error}`);
    }
  }

  private async deriveKey(userId: string, saltBase64: string): Promise<string> {
    if (!userId) {
      throw new Error('Key derivation attempted without user ID');
    }

    try {
      const userSecret = await this.getUserSecret(userId);
      const masterKey = await SecureStore.getItemAsync(`enc_master_key_${userId}`);

      if (this.masterPasswordMode && masterKey) {
        // In master password mode, return the stored key directly
        return userSecret;
      }
      // For non-master password mode, derive key from user secret and salt
      const keyMaterialString = `${userId}-${userSecret}-typelets-secure-v2`;
      const salt = saltBase64;

      return await this.pbkdf2WithForge(
        keyMaterialString,
        salt,
        ENCRYPTION_CONFIG.ITERATIONS,
        ENCRYPTION_CONFIG.KEY_LENGTH
      );
    } catch (error) {
      throw new Error(`Key derivation failed: ${error}`);
    }
  }

  async encryptNote(
    userId: string,
    title: string,
    content: string
  ): Promise<EncryptedNote> {
    if (!userId) {
      throw new Error('User ID required for encryption');
    }

    try {
      // Generate random salt and IV
      const saltBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.SALT_LENGTH);
      const ivBytes = await Crypto.getRandomBytesAsync(ENCRYPTION_CONFIG.IV_LENGTH);

      // Convert to base64
      const saltBase64 = this.arrayBufferToBase64(saltBytes);
      const ivBase64 = this.arrayBufferToBase64(ivBytes);

      // Derive encryption key
      const key = await this.deriveKey(userId, saltBase64);

      // Encrypt title and content
      const encryptedTitle = await this.encryptWithAESGCM(title || '', key, ivBase64);
      const encryptedContent = await this.encryptWithAESGCM(content || '', key, ivBase64);

      return {
        encryptedTitle,
        encryptedContent,
        iv: ivBase64,
        salt: saltBase64,
      };
    } catch (error) {
      throw new Error(`Encryption failed for user ${userId}: ${error}`);
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
      const key = await this.deriveKey(userId, saltBase64);

      // Decrypt title and content
      const title = await this.decryptWithAESGCM(encryptedTitle, key, ivBase64);
      const content = await this.decryptWithAESGCM(encryptedContent, key, ivBase64);

      // Allow empty content but require title to exist (can be empty string)
      if (title === null || title === undefined) {
        throw new Error('Title decryption failed');
      }
      if (content === null || content === undefined) {
        throw new Error('Content decryption failed');
      }

      const result = { title, content };

      // Cache management
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
      throw new Error(`Decryption failed for user ${userId}: ${error}`);
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private uint8ArrayToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  }

  private async encryptWithAESGCM(plaintext: string, keyBase64: string, ivBase64: string): Promise<string> {
    try {
      // Convert base64 to forge-compatible format
      const key = forge.util.decode64(keyBase64);
      const iv = forge.util.decode64(ivBase64);

      // Create AES-GCM cipher
      const cipher = forge.cipher.createCipher('AES-GCM', key);

      // Start encryption with IV
      cipher.start({
        iv: iv
      });

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
    } catch (error) {
      throw error;
    }
  }

  private async decryptWithAESGCM(encryptedBase64: string, keyBase64: string, ivBase64: string): Promise<string> {
    try {
      // Convert base64 to forge-compatible format
      const key = forge.util.decode64(keyBase64);
      const iv = forge.util.decode64(ivBase64);
      const encryptedDataWithTag = forge.util.decode64(encryptedBase64);

      // For node-forge GCM, we need to manually handle the auth tag
      // Web Crypto API embeds the auth tag at the end of the encrypted data
      const tagLength = 16; // GCM auth tag is 16 bytes

      if (encryptedDataWithTag.length < tagLength) {
        throw new Error(`Encrypted data too short for GCM (${encryptedDataWithTag.length} bytes, need at least ${tagLength})`);
      }

      // Split the data: ciphertext + auth tag (last 16 bytes)
      const ciphertext = encryptedDataWithTag.slice(0, -tagLength);
      const authTag = encryptedDataWithTag.slice(-tagLength);

      // Create AES-GCM decipher
      const decipher = forge.cipher.createDecipher('AES-GCM', key);

      // Start decryption with IV and auth tag
      decipher.start({
        iv: iv,
        tag: authTag
      });

      // Update with ciphertext
      decipher.update(forge.util.createBuffer(ciphertext));

      // Finish and verify auth tag
      const success = decipher.finish();

      if (!success) {
        throw new Error('GCM authentication failed - auth tag verification failed');
      }

      const decryptedText = decipher.output.toString('utf8');
      return decryptedText;
    } catch (error) {
      throw error;
    }
  }

  clearKeys(): void {
    this.decryptCache.clear();
    this.userSecrets.clear();
  }

  // Clear cache entries for a specific note
  clearNoteCache(userId: string, encryptedTitle?: string): void {
    if (!encryptedTitle) {
      // If no specific title, clear all cache for this user
      const keysToDelete: string[] = [];
      this.decryptCache.forEach((_, key) => {
        if (key.startsWith(userId)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.decryptCache.delete(key));
    } else {
      // Clear cache entries that match this user and encrypted title
      const keysToDelete: string[] = [];
      this.decryptCache.forEach((_, key) => {
        if (key.startsWith(userId) && key.includes(encryptedTitle)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.decryptCache.delete(key));
    }
  }

  async clearUserData(userId: string): Promise<void> {
    if (__DEV__) {
      console.log('🗑️ Starting clearUserData for user:', userId);
    }

    // Clear all encryption keys from secure storage
    try {
      await SecureStore.deleteItemAsync(`enc_master_key_${userId}`);
      if (__DEV__) {
        console.log('✅ Deleted enc_master_key');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('❌ Failed to delete enc_master_key:', error);
      }
    }

    try {
      await SecureStore.deleteItemAsync(`has_master_password_${userId}`);
      if (__DEV__) {
        console.log('✅ Deleted has_master_password');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('❌ Failed to delete has_master_password:', error);
      }
    }

    try {
      await SecureStore.deleteItemAsync(`test_encryption_${userId}`);
      if (__DEV__) {
        console.log('✅ Deleted test_encryption');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('❌ Failed to delete test_encryption:', error);
      }
    }

    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_SECRET(userId));
      if (__DEV__) {
        console.log('✅ Deleted user secret');
      }
    } catch (error) {
      if (__DEV__) {
        console.log('❌ Failed to delete user secret:', error);
      }
    }

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

    if (__DEV__) {
      console.log('🧹 Cleared', keysToDelete.length, 'cache entries');
      console.log('✅ clearUserData completed');
      console.log('🔄 FORCING master password reset due to iteration count mismatch');
    }
  }
}

export const encryptionService = new MobileEncryptionService();

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

export async function clearUserEncryptionData(userId: string): Promise<void> {
  return encryptionService.clearUserData(userId);
}

export function clearNoteCacheForUser(userId: string, encryptedTitle?: string): void {
  return encryptionService.clearNoteCache(userId, encryptedTitle);
}

export async function hasMasterPassword(userId: string): Promise<boolean> {
  return encryptionService.hasMasterPassword(userId);
}

export async function isMasterPasswordUnlocked(userId: string): Promise<boolean> {
  return encryptionService.isMasterPasswordUnlocked(userId);
}

export async function setupMasterPassword(
  masterPassword: string,
  userId: string
): Promise<void> {
  return encryptionService.setupMasterPassword(masterPassword, userId);
}

export async function unlockWithMasterPassword(
  masterPassword: string,
  userId: string
): Promise<boolean> {
  return encryptionService.unlockWithMasterPassword(masterPassword, userId);
}

