/**
 * Centralized logging utility
 * Integrates with Sentry for production logging
 */

import { Platform } from 'react-native';

// Lazy load Sentry to avoid initialization issues
let Sentry: any = null;

// Initialize Sentry reference (lazy loaded)
function getSentry() {
  if (Sentry === null) {
    try {
      Sentry = require('@sentry/react-native');
    } catch (error) {
      Sentry = false; // Mark as unavailable
      if (__DEV__) {
        console.warn('[Logger] Sentry not available');
      }
    }
  }
  return Sentry || null;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogOptions {
  /** Additional attributes to attach to the log */
  attributes?: Record<string, unknown>;
  /** Whether to only send to Sentry (skip console) */
  sentryOnly?: boolean;
}

/**
 * Main logger class
 */
class Logger {
  private userId: string | null = null;
  private sessionAttributes: Record<string, unknown> = {};

  /**
   * Set the current user ID for all subsequent logs
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
    const sentry = getSentry();
    if (sentry && userId) {
      sentry.setUser({ id: userId });
    } else if (sentry && !userId) {
      sentry.setUser(null);
    }
    if (__DEV__) {
      console.log(`[Logger] User ID set: ${userId}`);
    }
  }

  /**
   * Set session-level attributes that will be included in all logs
   */
  setSessionAttributes(attributes: Record<string, unknown>): void {
    this.sessionAttributes = { ...this.sessionAttributes, ...attributes };

    // Set each attribute as a tag in Sentry
    const sentry = getSentry();
    if (sentry) {
      Object.entries(attributes).forEach(([key, value]) => {
        sentry.setTag(key, String(value));
      });
    }

    if (__DEV__) {
      console.log('[Logger] Session attributes set:', attributes);
    }
  }

  /**
   * Clear session attributes (useful on logout)
   */
  clearSessionAttributes(): void {
    this.userId = null;
    this.sessionAttributes = {};

    const sentry = getSentry();
    if (sentry) {
      sentry.setUser(null);
    }

    if (__DEV__) {
      console.log('[Logger] Session attributes cleared');
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, options?: LogOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  /**
   * Log info message
   */
  info(message: string, options?: LogOptions): void {
    this.log(LogLevel.INFO, message, options);
  }

  /**
   * Log warning message
   */
  warn(message: string, options?: LogOptions): void {
    this.log(LogLevel.WARN, message, options);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, options?: LogOptions): void {
    const errorDetails = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log(LogLevel.ERROR, message, {
      ...options,
      attributes: {
        ...options?.attributes,
        error: errorDetails,
      },
    });

    // Also capture the exception in Sentry
    const sentry = getSentry();
    if (sentry && error) {
      sentry.captureException(error, {
        contexts: {
          additional: {
            message,
            ...options?.attributes,
          },
        },
      });
    }
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, options?: LogOptions): void {
    const { attributes = {}, sentryOnly = false } = options || {};

    // Construct full log message
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] [${level}] ${message}`;

    // Log to console (unless sentryOnly is true)
    if (!sentryOnly && __DEV__) {
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(fullMessage, attributes);
          break;
        case LogLevel.WARN:
          console.warn(fullMessage, attributes);
          break;
        case LogLevel.ERROR:
          console.error(fullMessage, attributes);
          break;
      }
    }

    // Send to Sentry
    const sentry = getSentry();
    if (sentry) {
      const logData = {
        level,
        platform: Platform.OS,
        timestamp,
        userId: this.userId,
        ...this.sessionAttributes,
        ...attributes,
      };

      try {
        // Send logs using Sentry.logger API for proper log ingestion
        switch (level) {
          case LogLevel.DEBUG:
            sentry.logger.debug(message, logData);
            break;
          case LogLevel.INFO:
            sentry.logger.info(message, logData);
            break;
          case LogLevel.WARN:
            sentry.logger.warn(message, logData);
            break;
          case LogLevel.ERROR:
            sentry.logger.error(message, logData);
            break;
        }

        if (__DEV__) {
          console.log(`[Sentry] Sent ${level} log to Sentry: ${message}`);
        }
      } catch (error) {
        // Fallback if Sentry logging fails
        if (__DEV__) {
          console.error('[Logger] Failed to send log to Sentry:', error);
        }
      }
    } else {
      if (__DEV__) {
        console.warn('[Logger] Sentry not available, skipping log');
      }
    }
  }

  /**
   * Record a custom event in Sentry
   */
  recordEvent(eventName: string, attributes?: Record<string, unknown>): void {
    const sentry = getSentry();
    if (sentry) {
      sentry.addBreadcrumb({
        message: eventName,
        level: 'info',
        category: 'custom-event',
        data: attributes,
      });
    }

    if (__DEV__) {
      console.log(`[Event] ${eventName}`, attributes);
    }
  }

  /**
   * Set a custom attribute for the session
   */
  setAttribute(name: string, value: string | number | boolean): void {
    const sentry = getSentry();
    if (sentry) {
      sentry.setTag(name, String(value));
    }

    if (__DEV__) {
      console.log(`[Attribute] ${name} = ${value}`);
    }
  }

  /**
   * Record a breadcrumb (useful for tracking user flow)
   */
  breadcrumb(name: string, attributes?: Record<string, unknown>): void {
    const sentry = getSentry();
    if (sentry) {
      sentry.addBreadcrumb({
        message: name,
        level: 'info',
        data: attributes,
      });
    }

    if (__DEV__) {
      console.log(`[Breadcrumb] ${name}`, attributes);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
