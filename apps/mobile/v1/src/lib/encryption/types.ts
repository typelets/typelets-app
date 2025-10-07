/**
 * Encryption Type Definitions
 */

export interface EncryptedNote {
  encryptedTitle: string;
  encryptedContent: string;
  iv: string;
  salt: string;
}

export interface PotentiallyEncrypted {
  encryptedTitle?: unknown;
  encryptedContent?: unknown;
  iv?: unknown;
  salt?: unknown;
}

export interface CacheEntry {
  data: { title: string; content: string };
  timestamp: number;
}

export interface DecryptedData {
  title: string;
  content: string;
}
