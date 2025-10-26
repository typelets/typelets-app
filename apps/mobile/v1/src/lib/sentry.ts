import * as Sentry from '@sentry/react-native';

/**
 * Set user context in Sentry for better error tracking
 * Call this after successful authentication
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context in Sentry
 * Call this on logout
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 * Useful for tracking app-specific data like encryption status, note count, etc.
 */
export function setSentryContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context);
}

/**
 * Add tags to Sentry events for better filtering
 * Examples: user_tier, feature_flags, theme_mode
 */
export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Add breadcrumb for tracking user actions
 * Useful for understanding what the user did before an error occurred
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture custom message to Sentry
 * Use for non-error events that you want to track
 */
export function captureSentryMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.captureMessage(message, level);
}

/**
 * Capture exception to Sentry with additional context
 */
export function captureSentryException(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Start a new transaction for performance monitoring
 * Use for tracking specific operations like note loading, encryption, etc.
 */
export function startSentryTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  return Sentry.startSpan({ name, op }, (span) => span);
}
