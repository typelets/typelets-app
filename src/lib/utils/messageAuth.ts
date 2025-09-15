// WebSocket message authentication utility
// Provides HMAC-based message authentication to prevent tampering

export interface AuthenticatedMessage {
  payload: unknown;
  signature: string;
  timestamp: number;
  nonce: string;
}

class MessageAuthenticator {
  private authKey: CryptoKey | null = null;
  private keyInitialized = false;

  /**
   * Initialize the authenticator with a session key
   * This should be called after WebSocket authentication
   * Can be called multiple times to reinitialize with new session secrets
   */
  async initialize(sessionSecret: string): Promise<void> {
    // Always reinitialize - this handles token refresh scenarios
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    this.authKey = keyMaterial;
    this.keyInitialized = true;
  }

  /**
   * Clear the authentication state
   * Should be called when disconnecting
   */
  clear(): void {
    this.authKey = null;
    this.keyInitialized = false;
  }

  /**
   * Sign a message for WebSocket transmission
   */
  async signMessage(payload: unknown): Promise<AuthenticatedMessage> {
    if (!this.authKey) {
      throw new Error('MessageAuthenticator not initialized');
    }

    const timestamp = Date.now();
    const nonce = this.generateNonce();

    // Create canonical representation for signing
    const messageData = {
      payload,
      timestamp,
      nonce,
    };

    const encoder = new TextEncoder();
    const dataToSign = encoder.encode(JSON.stringify(messageData));

    // Generate HMAC signature
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      this.authKey,
      dataToSign
    );
    const signature = this.arrayBufferToBase64(signatureBuffer);

    return {
      payload,
      signature,
      timestamp,
      nonce,
    };
  }

  /**
   * Verify an incoming authenticated message
   */
  async verifyMessage(message: AuthenticatedMessage): Promise<boolean> {
    if (!this.authKey) {
      throw new Error('MessageAuthenticator not initialized');
    }

    try {
      // Check message age (prevent replay attacks)
      const messageAge = Date.now() - message.timestamp;
      const MAX_MESSAGE_AGE = 5 * 60 * 1000; // 5 minutes

      if (messageAge > MAX_MESSAGE_AGE) {
        // Message too old - potential replay attack
        return false;
      }

      if (messageAge < -60000) {
        // Allow 1 minute clock skew
        // Message timestamp in future - potential attack
        return false;
      }

      // Recreate the signed data
      const messageData = {
        payload: message.payload,
        timestamp: message.timestamp,
        nonce: message.nonce,
      };

      const encoder = new TextEncoder();
      const dataToVerify = encoder.encode(JSON.stringify(messageData));
      const signatureBuffer = this.base64ToArrayBuffer(message.signature);

      // Verify HMAC signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        this.authKey,
        signatureBuffer,
        dataToVerify
      );

      return isValid;
    } catch {
      // Message verification failed - silent fail for security
      return false;
    }
  }

  /**
   * Generate a random nonce for replay protection
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array);
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
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Singleton instance for the application
export const messageAuthenticator = new MessageAuthenticator();

/**
 * Utility functions for easy integration
 */
export async function initializeMessageAuth(
  sessionSecret: string
): Promise<void> {
  await messageAuthenticator.initialize(sessionSecret);
}

export function clearMessageAuth(): void {
  messageAuthenticator.clear();
}

export async function signWebSocketMessage(
  payload: unknown
): Promise<AuthenticatedMessage> {
  return messageAuthenticator.signMessage(payload);
}

export async function verifyWebSocketMessage(
  message: AuthenticatedMessage
): Promise<boolean> {
  return messageAuthenticator.verifyMessage(message);
}
