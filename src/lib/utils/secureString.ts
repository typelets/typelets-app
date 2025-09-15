// Secure string utility for handling sensitive data in memory
// Provides explicit memory clearing for passwords and secrets

export class SecureString {
  private data: Uint8Array | null = null;
  private isCleared = false;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new Error('SecureString requires a string value');
    }

    // Store as Uint8Array to enable explicit clearing
    const encoder = new TextEncoder();
    this.data = encoder.encode(value);
  }

  /**
   * Get the string value (creates temporary string)
   * Use sparingly and clear immediately after use
   */
  getValue(): string {
    if (this.isCleared || !this.data) {
      throw new Error('SecureString has been cleared');
    }

    const decoder = new TextDecoder();
    return decoder.decode(this.data);
  }

  /**
   * Get the raw bytes for cryptographic operations
   */
  getBytes(): Uint8Array {
    if (this.isCleared || !this.data) {
      throw new Error('SecureString has been cleared');
    }

    // Return a copy to prevent external modification
    return new Uint8Array(this.data);
  }

  /**
   * Check if the string has been cleared
   */
  get cleared(): boolean {
    return this.isCleared;
  }

  /**
   * Get the length without exposing the data
   */
  get length(): number {
    if (this.isCleared || !this.data) {
      return 0;
    }
    return this.data.length;
  }

  /**
   * Explicitly clear the sensitive data from memory
   * This should be called as soon as the data is no longer needed
   */
  clear(): void {
    if (this.data) {
      // Overwrite with random data first, then zeros
      crypto.getRandomValues(this.data);
      this.data.fill(0);
      this.data = null;
    }
    this.isCleared = true;
  }

  /**
   * Use the secure string in a controlled scope
   * Automatically clears after the callback completes
   */
  async use<T>(callback: (value: string) => Promise<T>): Promise<T> {
    try {
      const value = this.getValue();
      return await callback(value);
    } finally {
      this.clear();
    }
  }

  /**
   * Compare with another SecureString in constant time
   */
  equals(other: SecureString): boolean {
    if (this.isCleared || other.isCleared || !this.data || !other.data) {
      return false;
    }

    if (this.data.length !== other.data.length) {
      return false;
    }

    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < this.data.length; i++) {
      result |= this.data[i] ^ other.data[i];
    }

    return result === 0;
  }

  /**
   * Create a derived key using PBKDF2
   * Useful for master password operations
   */
  async deriveKey(
    salt: Uint8Array,
    iterations: number = 250000,
    keyLength: number = 256
  ): Promise<CryptoKey> {
    if (this.isCleared || !this.data) {
      throw new Error('SecureString has been cleared');
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.data,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Destructor - automatically clear when garbage collected
   */
  finalize(): void {
    this.clear();
  }
}

/**
 * Utility function to create a SecureString from user input
 * Immediately clears the input field for security
 */
export function secureInputValue(input: HTMLInputElement): SecureString {
  const value = input.value;
  const secureStr = new SecureString(value);

  // Clear the input field
  input.value = '';

  // Trigger input event to update any React state
  const event = new Event('input', { bubbles: true });
  input.dispatchEvent(event);

  return secureStr;
}

/**
 * Utility for temporary string operations with automatic cleanup
 */
export async function withSecureString<T>(
  value: string,
  callback: (secureStr: SecureString) => Promise<T>
): Promise<T> {
  const secureStr = new SecureString(value);
  try {
    return await callback(secureStr);
  } finally {
    secureStr.clear();
  }
}
