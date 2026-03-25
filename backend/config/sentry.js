import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

/**
 * Initialize Sentry for backend error tracking and performance monitoring
 * Call this at the very start of your server.js file, before importing routes
 */
export const initSentry = () => {
  const environment = process.env.NODE_ENV || "production";
  const isDevelopment = environment === "development";

  Sentry.init({
    // Replace with your actual DSN from https://sentry.io/
    dsn: process.env.SENTRY_DSN,
    
    // Set environment for filtering in Sentry dashboard
    environment,
    
    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.1, // Full tracing in dev, 10% in production
    
    // Release version (optional - helps track which version has issues)
    release: process.env.APP_VERSION || "1.0.0",
    
    // Enable profiling
    profilesSampleRate: isDevelopment ? 1.0 : 0.1,
    
    // Integrations
    integrations: [
      nodeProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express(),
      new Sentry.Integrations.Postgres(),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    
    // Before sending error to Sentry
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send certain expected errors
      if (error?.message?.includes("ENOENT")) {
        return null; // Don't send file not found errors
      }
      
      return event;
    },
    
    // Enable debug mode in development
    debug: isDevelopment,
  });
};

/**
 * Sentry Express middleware - must be added early in middleware chain
 * Usage: app.use(sentryRequestHandler());
 */
export const sentryRequestHandler = () => {
  return Sentry.Handlers.requestHandler();
};

/**
 * Sentry error handler middleware - must be added after all other middleware/routes
 * Usage: app.use(sentryErrorHandler());
 */
export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler();
};

/**
 * Capture a custom error with context
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
export const addBreadcrumb = (message, category = "http", level = "info") => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Capture exception from async operations
 */
export const captureAsyncError = async (promise, context = {}) => {
  try {
    return await promise;
  } catch (error) {
    captureError(error, context);
    throw error;
  }
};
