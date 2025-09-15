// Secure logging utility for production environments
// Prevents sensitive data leakage in production logs

// LogData interface - currently unused but kept for future extensibility
// interface _LogData {
//   [key: string]: unknown;
// }

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SecureLogger {
  private isProduction: boolean;

  constructor(isProduction: boolean = false) {
    this.isProduction = isProduction;
    // Debug: log the production mode detection (this will only show in dev)
    if (!isProduction) {
      // eslint-disable-next-line no-console
      console.log('[SecureLogger] Initialized in development mode');
    }
  }

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (data instanceof Error) {
      return this.isProduction ? {
        name: data.name,
        message: data.message
        // Stack traces not included in production
      } : {
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive fields
      if (lowerKey.includes('token') ||
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('userid') ||
          lowerKey.includes('id')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (this.isProduction) {
      // In production: only log sanitized message and basic error info
      if (data) {
        const sanitizedData = this.sanitizeData(data);
        // eslint-disable-next-line no-console
        console[level](`[${level.toUpperCase()}] ${message}`, sanitizedData);
      } else {
        // eslint-disable-next-line no-console
        console[level](`[${level.toUpperCase()}] ${message}`);
      }
    } else {
      // In development: log everything for debugging
      if (data) {
        // eslint-disable-next-line no-console
        console[level](`[${level.toUpperCase()}] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console[level](`[${level.toUpperCase()}] ${message}`);
      }
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    // In production: only log critical errors, not transient connection issues
    if (this.isProduction && this.isTransientError(message, data)) {
      return; // Suppress transient errors in production
    }
    this.log('error', message, data);
  }

  // Special method for authentication events
  authEvent(event: 'login' | 'logout' | 'token_refresh' | 'auth_failed', userId?: string): void {
    if (this.isProduction) {
      // In production: no authentication logging for security
      return;
    }
    // In development only: detailed logging for debugging
    // eslint-disable-next-line no-console
    console.info(`[DEV] Authentication event: ${event}`, { userId });
  }

  // Special method for WebSocket events
  wsEvent(event: string, data?: unknown): void {
    if (this.isProduction) {
      // In production: no WebSocket event logging for security
      return;
    }
    // In development only: detailed logging
    // eslint-disable-next-line no-console
    console.info(`[DEV] WebSocket event: ${event}`, data);
  }

  // Helper to identify transient errors that shouldn't appear in production
  private isTransientError(message: string, data?: unknown): boolean {
    const transientPatterns = [
      'WebSocket connection error',
      'WebSocket authentication failed',
      'Token refresh failed',
      'Connection error',
      'Connection closed'
    ];

    // Check if this is a transient connection error
    const isConnectionError = transientPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );

    if (!isConnectionError) {
      return false; // Not a connection error, should be logged
    }

    // Check if it's during app startup (first 10 seconds)
    const isStartupError = Date.now() - window.performance.timeOrigin < 10000;

    // Check if it's a connection close error (normal during page transitions)
    const dataMessage = (data as Record<string, unknown>)?.message;
    const isConnectionClosed = (typeof dataMessage === 'string') && (
      dataMessage.includes('Connection closed') ||
      dataMessage.includes('connection failed') ||
      dataMessage.includes('Unknown reason')
    );

    return isStartupError || isConnectionClosed;
  }

  // Utility method to check current environment
  getEnvironmentInfo(): { isProduction: boolean; hostname: string; env: string } {
    return {
      isProduction: this.isProduction,
      hostname: window.location.hostname,
      env: import.meta.env.NODE_ENV || 'unknown'
    };
  }

  // Method to force log critical errors even in production
  criticalError(message: string, data?: unknown): void {
    // Always log critical errors regardless of environment
    console.error(`[CRITICAL] ${message}`, this.sanitizeData(data));
  }
}

// Create singleton instance with explicit production detection
const isProductionEnvironment = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
export const secureLogger = new SecureLogger(isProductionEnvironment);

// Export for testing with different environments
export { SecureLogger };