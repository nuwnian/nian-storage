import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Configure this before importing your App component
 */
export const initSentry = () => {
  const environment = import.meta.env.MODE || "production";
  const isDevelopment = environment === "development";

  Sentry.init({
    // Replace with your actual DSN from https://sentry.io/
    dsn: import.meta.env.VITE_SENTRY_DSN,
    
    // Set environment for filtering in Sentry dashboard
    environment,
    
    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.1, // Full tracing in dev, 10% in production
    
    // Release version (optional - helps track which version has issues)
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",
    
    // Integrations for enhanced tracking
    integrations: [
      new BrowserTracing({
        // Set sampling rate for performance transactions
        tracingOrigins: [
          "localhost",
          /^\//,
          // Add your API domain here
          /^https:\/\/api\.yourapp\.com/,
        ],
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Replay configuration
    replaysSessionSampleRate: isDevelopment ? 0.5 : 0.1, // Record 50% in dev, 10% in production
    replaysOnErrorSampleRate: 1.0, // If there's an error, record 100% of replays
    
    // Before sending error to Sentry
    beforeSend(event, hint) {
      // Filter out certain errors if needed
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send aborted requests or network errors
        if (error?.message?.includes("abort")) {
          return null;
        }
      }
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      // Various plugins
      "chrome-extension://",
      "moz-extension://",
      // Random plugins/extensions
      "Can't find variable: ZiteReader",
      "jigsaw is not defined",
      "ComboSearch is not defined",
      "cancelled",
    ],
    
    // Enable debug mode in development
    debug: isDevelopment,
    
    // Attach stack traces
    attachStacktrace: true,
  });
};

/**
 * Capture a custom error or message
 */
export const captureError = (error, context = {}) => {
  Sentry.captureException(error, { extra: context });
};

/**
 * Capture a custom message
 */
export const captureMessage = (message, level = "info") => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add custom breadcrumb for debugging
 */
export const addBreadcrumb = (message, category = "user-action", level = "info") => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};
