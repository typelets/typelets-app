/**
 * Centralized logging utility
 * Integrates with New Relic for production logging
 */

import { Platform } from 'react-native';

let NewRelic: any = null;

// Initialize New Relic reference
try {
  const NewRelicModule = require('newrelic-react-native-agent');
  NewRelic = NewRelicModule.default || NewRelicModule;
} catch (error) {
  console.warn('[Logger] New Relic not available');
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogOptions {
  /** Additional attributes to attach to the log */
  attributes?: Record<string, any>;
  /** Whether to only send to New Relic (skip console) */
  newRelicOnly?: boolean;
}

/**
 * Main logger class
 */
class Logger {
  private isNewRelicAvailable: boolean;
  private userId: string | null = null;
  private sessionAttributes: Record<string, any> = {};

  constructor() {
    this.isNewRelicAvailable = NewRelic !== null;
  }

  /**
   * Set the current user ID for all subsequent logs
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
    if (this.isNewRelicAvailable && userId && NewRelic.setUserId) {
      NewRelic.setUserId(userId);
    }
    if (__DEV__) {
      console.log(`[Logger] User ID set: ${userId}`);
    }
  }

  /**
   * Set session-level attributes that will be included in all logs
   */
  setSessionAttributes(attributes: Record<string, any>): void {
    this.sessionAttributes = { ...this.sessionAttributes, ...attributes };

    // Set each attribute in New Relic
    if (this.isNewRelicAvailable) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (NewRelic.setAttribute) {
          NewRelic.setAttribute(key, value);
        }
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

    // Also record the error in New Relic's error tracking
    if (this.isNewRelicAvailable && error && NewRelic.recordError) {
      NewRelic.recordError(error);
    }
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, options?: LogOptions): void {
    const { attributes = {}, newRelicOnly = false } = options || {};

    // Construct full log message
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] [${level}] ${message}`;

    // Log to console (unless newRelicOnly is true)
    if (!newRelicOnly && __DEV__) {
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

    // Send to New Relic
    if (this.isNewRelicAvailable) {
      const logAttributes = {
        level,
        platform: Platform.OS,
        timestamp,
        userId: this.userId,
        ...this.sessionAttributes,
        ...attributes,
      };

      try {
        switch (level) {
          case LogLevel.DEBUG:
            NewRelic.logDebug?.(message, logAttributes);
            break;
          case LogLevel.INFO:
            NewRelic.logInfo?.(message, logAttributes);
            break;
          case LogLevel.WARN:
            NewRelic.logWarning?.(message, logAttributes);
            break;
          case LogLevel.ERROR:
            NewRelic.logError?.(message, logAttributes);
            break;
        }
      } catch (error) {
        // Fallback if New Relic logging fails
        if (__DEV__) {
          console.error('[Logger] Failed to send log to New Relic:', error);
        }
      }
    }
  }

  /**
   * Record a custom event in New Relic
   */
  recordEvent(eventName: string, attributes?: Record<string, any>): void {
    if (this.isNewRelicAvailable && NewRelic.recordCustomEvent) {
      NewRelic.recordCustomEvent(eventName, attributes);
    }

    if (__DEV__) {
      console.log(`[Event] ${eventName}`, attributes);
    }
  }

  /**
   * Set a custom attribute for the session
   */
  setAttribute(name: string, value: string | number | boolean): void {
    if (this.isNewRelicAvailable && NewRelic.setAttribute) {
      NewRelic.setAttribute(name, value);
    }

    if (__DEV__) {
      console.log(`[Attribute] ${name} = ${value}`);
    }
  }

  /**
   * Record a breadcrumb (useful for tracking user flow)
   */
  breadcrumb(name: string, attributes?: Record<string, any>): void {
    if (this.isNewRelicAvailable && NewRelic.recordBreadcrumb) {
      NewRelic.recordBreadcrumb(name, attributes);
    }

    if (__DEV__) {
      console.log(`[Breadcrumb] ${name}`, attributes);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
