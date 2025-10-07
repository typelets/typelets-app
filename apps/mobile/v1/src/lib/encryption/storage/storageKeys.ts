/**
 * Storage Key Generators
 * Centralized key naming for SecureStore
 */

export const STORAGE_KEYS = {
  USER_SECRET: (userId: string) => `enc_secret_${userId}`,
  MASTER_KEY: (userId: string) => `enc_master_key_${userId}`,
  HAS_MASTER_PASSWORD: (userId: string) => `has_master_password_${userId}`,
  TEST_ENCRYPTION: (userId: string) => `test_encryption_${userId}`,
} as const;

export const SALT_PREFIX = 'typelets-salt';
export const SALT_VERSION = 'v1';

export function getUserSalt(userId: string): string {
  return `${SALT_PREFIX}-${userId}-${SALT_VERSION}`;
}
