/**
 * Encryption Configuration Constants
 */

export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM' as const,
  KEY_LENGTH: 256,
  IV_LENGTH: 16,
  ITERATIONS: 250000,
  SALT_LENGTH: 32,
  GCM_TAG_LENGTH: 16,
} as const;

export const CACHE_CONFIG = {
  MAX_SIZE: 100,
  TTL_MS: 1000 * 60 * 15,
  CLEANUP_INTERVAL_MS: 1000 * 60 * 5,
} as const;
