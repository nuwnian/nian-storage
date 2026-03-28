import dotenv from 'dotenv';
dotenv.config();

// Initialize Sentry FIRST (before other imports)
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js';
initSentry();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim());
    if (!origin || allowed.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Sentry request handler (early in chain - after body parsing)
app.use(sentryRequestHandler());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nian Storage API is running' });
});

// Test error endpoint - for verifying Sentry integration
app.get('/api/test-error', (req, res) => {
  throw new Error('Test error from backend - Sentry should capture this');
});

// Sentry error handler (after all routes)
app.use(sentryErrorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Increase timeout to 10 minutes for large video uploads
server.timeout = 600000;
server.keepAliveTimeout = 620000;

export default app;
