import dotenv from 'dotenv';
dotenv.config();

// Initialize Sentry FIRST (before other imports)
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js';
initSentry();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import { supabase, supabaseAdmin } from './config/supabase.js';
import { r2Client } from './config/r2.js';

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

// Diagnostic endpoint
app.get('/api/diagnostics', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    services: {
      supabase_read: { status: 'unknown', details: '' },
      supabase_write: { status: 'unknown', details: '' },
      r2: { status: 'unknown', details: '' },
      database: { status: 'unknown', details: '' }
    }
  };

  // Test Supabase READ - users table
  try {
    const { data: users, error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (error) throw error;
    diagnostics.services.supabase_read = { status: 'ok', details: `Users table readable (${users?.length || 0} users)` };
  } catch (err) {
    diagnostics.services.supabase_read = { status: 'error', details: err.message };
  }

  // Test Supabase WRITE - try to insert and delete a test record with a real user ID
  try {
    const { randomUUID } = await import('crypto');
    // Get a real user ID
    const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
    if (!users || users.length === 0) {
      throw new Error('No users found in database - cannot test file insert');
    }
    const realUserId = users[0].id;
    
    const testId = randomUUID();
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('files')
      .insert([{ id: testId, user_id: realUserId, name: 'test', type: 'doc', size: '1 KB', size_bytes: 1024, url: 'http://test', color: '#000' }])
      .select();
    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    
    const { error: deleteError } = await supabaseAdmin.from('files').delete().eq('id', testId);
    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    
    diagnostics.services.supabase_write = { status: 'ok', details: 'Write operations working' };
  } catch (err) {
    diagnostics.services.supabase_write = { status: 'error', details: err.message };
  }

  // Test R2
  try {
    if (!r2Client) throw new Error('R2 client not initialized');
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) throw new Error('R2_BUCKET_NAME not set');
    diagnostics.services.r2 = { status: 'ok', details: `Bucket: ${bucketName}` };
  } catch (err) {
    diagnostics.services.r2 = { status: 'error', details: err.message };
  }

  // Test database - files table
  try {
    const { data, error } = await supabaseAdmin.from('files').select('id').limit(1);
    if (error) throw error;
    diagnostics.services.database = { status: 'ok', details: `Files table accessible (${data?.length || 0} files)` };
  } catch (err) {
    diagnostics.services.database = { status: 'error', details: err.message };
  }

  res.json(diagnostics);
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
