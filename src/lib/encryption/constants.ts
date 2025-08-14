// src/lib/encryption/constants.ts
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM' as const,
  KEY_LENGTH: 256,
  IV_LENGTH: 16,
  ITERATIONS: 250000,
  SALT_LENGTH: 32,
} as const;

export const STORAGE_KEYS = {
  USER_SECRET: (userId: string) => `enc_secret_${userId}`,
} as const;

export const CACHE_LIMITS = {
  DECRYPT_CACHE_SIZE: 100,
} as const;

export const ENCODING = {
  CHUNK_SIZE: 0x8000,
} as const;
