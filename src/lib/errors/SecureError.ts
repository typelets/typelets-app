/**
 * Secure error handling system to prevent information disclosure
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ErrorCode =
  | 'AUTH_001' | 'AUTH_002' | 'AUTH_003'  // Authentication errors
  | 'CRYPTO_001' | 'CRYPTO_002' | 'CRYPTO_003'  // Encryption errors
  | 'NETWORK_001' | 'NETWORK_002' | 'NETWORK_003'  // Network errors
  | 'STORAGE_001' | 'STORAGE_002' | 'STORAGE_003'  // Storage errors
  | 'WS_001' | 'WS_002' | 'WS_003'  // WebSocket errors
  | 'FILE_001' | 'FILE_002' | 'FILE_003'  // File operation errors
  | 'VALIDATION_001' | 'VALIDATION_002'  // Validation errors
  | 'UNKNOWN_ERROR';  // Fallback

export class SecureError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly code: ErrorCode,
    public readonly severity: ErrorSeverity = 'medium',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'SecureError';
  }

  /**
   * Get safe error details for logging (excludes sensitive data)
   */
  getLogDetails(): Record<string, unknown> {
    return {
      code: this.code,
      severity: this.severity,
      userMessage: this.userMessage,
      timestamp: new Date().toISOString(),
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && {
        message: this.message,
        stack: this.stack
      })
    };
  }

  /**
   * Get safe error details for client response
   */
  getClientDetails(): { message: string; code: ErrorCode } {
    return {
      message: this.userMessage,
      code: this.code
    };
  }
}

/**
 * Sanitize any error into a SecureError
 */
export function sanitizeError(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): SecureError {
  if (error instanceof SecureError) {
    return error;
  }

  if (error instanceof Error) {
    // Don't expose internal error messages to users
    return new SecureError(
      error.message, // Internal logging
      fallbackMessage, // User sees this
      'UNKNOWN_ERROR',
      'medium',
      error
    );
  }

  // Handle non-Error objects
  return new SecureError(
    String(error),
    fallbackMessage,
    'UNKNOWN_ERROR',
    'medium',
    error
  );
}

/**
 * Secure logger that handles SecureError objects
 */
export function logSecureError(error: SecureError, context?: string): void {
  const logData = {
    ...error.getLogDetails(),
    ...(context && { context })
  };

  // Use appropriate log level based on severity
  switch (error.severity) {
    case 'critical':
    case 'high':
      console.error('[SECURITY]', logData);
      break;
    case 'medium':
      console.warn('[SECURITY]', logData);
      break;
    case 'low':
      console.info('[SECURITY]', logData);
      break;
  }
}

/**
 * Predefined secure errors for common scenarios
 */
export const SECURE_ERRORS = {
  // Authentication
  INVALID_CREDENTIALS: new SecureError(
    'Authentication failed with provided credentials',
    'Invalid username or password',
    'AUTH_001',
    'high'
  ),

  SESSION_EXPIRED: new SecureError(
    'User session has expired',
    'Your session has expired. Please log in again.',
    'AUTH_002',
    'medium'
  ),

  UNAUTHORIZED_ACCESS: new SecureError(
    'Unauthorized access attempt',
    'You do not have permission to access this resource',
    'AUTH_003',
    'high'
  ),

  // Encryption
  ENCRYPTION_FAILED: new SecureError(
    'Data encryption operation failed',
    'Unable to encrypt data. Please try again.',
    'CRYPTO_001',
    'high'
  ),

  DECRYPTION_FAILED: new SecureError(
    'Data decryption operation failed',
    'Unable to decrypt data. Please check your password.',
    'CRYPTO_002',
    'high'
  ),

  KEY_DERIVATION_FAILED: new SecureError(
    'Key derivation process failed',
    'Password verification failed. Please try again.',
    'CRYPTO_003',
    'high'
  ),

  // Network
  CONNECTION_FAILED: new SecureError(
    'Network connection failed',
    'Unable to connect to server. Please check your internet connection.',
    'NETWORK_001',
    'medium'
  ),

  REQUEST_TIMEOUT: new SecureError(
    'Request timed out',
    'Request timed out. Please try again.',
    'NETWORK_002',
    'medium'
  ),

  SERVER_ERROR: new SecureError(
    'Server returned error response',
    'Server error occurred. Please try again later.',
    'NETWORK_003',
    'medium'
  ),

  // Storage
  STORAGE_QUOTA_EXCEEDED: new SecureError(
    'Storage quota exceeded',
    'Storage limit reached. Please free up space.',
    'STORAGE_001',
    'medium'
  ),

  STORAGE_ACCESS_DENIED: new SecureError(
    'Storage access denied',
    'Unable to access local storage.',
    'STORAGE_002',
    'medium'
  ),

  // WebSocket
  WEBSOCKET_CONNECTION_FAILED: new SecureError(
    'WebSocket connection failed',
    'Real-time sync unavailable. Working in offline mode.',
    'WS_001',
    'medium'
  ),

  WEBSOCKET_AUTH_FAILED: new SecureError(
    'WebSocket authentication failed',
    'Unable to establish secure connection.',
    'WS_002',
    'high'
  ),

  // File operations
  FILE_TOO_LARGE: new SecureError(
    'File size exceeds limit',
    'File is too large. Maximum size is 10MB.',
    'FILE_001',
    'medium'
  ),

  FILE_TYPE_NOT_SUPPORTED: new SecureError(
    'Unsupported file type',
    'File type not supported.',
    'FILE_002',
    'medium'
  ),

  FILE_UPLOAD_FAILED: new SecureError(
    'File upload operation failed',
    'File upload failed. Please try again.',
    'FILE_003',
    'medium'
  ),

  // Validation
  INVALID_INPUT: new SecureError(
    'Input validation failed',
    'Invalid input provided.',
    'VALIDATION_001',
    'low'
  ),

  MISSING_REQUIRED_FIELD: new SecureError(
    'Required field missing',
    'Please fill in all required fields.',
    'VALIDATION_002',
    'low'
  )
} as const;