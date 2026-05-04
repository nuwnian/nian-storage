import express from 'express';
import request from 'supertest';
import filesRouter from '../routes/files.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

// Mock dependencies
jest.mock('../config/supabase.js');
jest.mock('../services/supabase-storage.js', () => ({
  uploadToSupabaseStorage: jest.fn().mockResolvedValue({
    key: 'users/123/1234567890-test.txt',
    url: 'https://example.supabase.co/storage/v1/object/public/user-files/users/123/1234567890-test.txt',
  }),
  downloadFromSupabaseStorage: jest.fn().mockResolvedValue(Buffer.from('file content')),
  deleteFromSupabaseStorage: jest.fn().mockResolvedValue(undefined),
  extractKeyFromUrl: jest.fn((url) => {
    const idx = url.indexOf('user-files/');
    return idx !== -1 ? url.substring(idx + 11) : url;
  }),
}));

describe('File Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/files', filesRouter);

    // Default mock implementations
    supabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });
  });

  describe('GET /api/files - List files', () => {
    it('should reject list without token', async () => {
      const response = await request(app)
        .get('/api/files');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject list with invalid token', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/files/:id/serve - Download file', () => {
    it('should reject serve without token', async () => {
      const response = await request(app)
        .get('/api/files/file-123/serve');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token');
    });

    it('should reject serve with invalid token', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/files/file-123/serve')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/files/:id/content - Get text content', () => {
    it('should reject content request without token', async () => {
      const response = await request(app)
        .get('/api/files/file-123/content');

      expect(response.status).toBe(401);
    });

    it('should reject content request with invalid token', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .get('/api/files/file-123/content')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/files/:id - Delete file', () => {
    it('should reject delete without token', async () => {
      const response = await request(app)
        .delete('/api/files/file-123');

      expect(response.status).toBe(401);
    });

    it('should reject delete with invalid token', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .delete('/api/files/file-123')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/files - Upload file', () => {
    it('should reject upload without token', async () => {
      const fileBuffer = Buffer.from('test file content');

      const response = await request(app)
        .post('/api/files')
        .attach('file', fileBuffer, 'test.txt');

      expect(response.status).toBe(401);
    });

    it('should reject upload with invalid token', async () => {
      const fileBuffer = Buffer.from('test file content');

      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const response = await request(app)
        .post('/api/files')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', fileBuffer, 'test.txt');

      expect(response.status).toBe(401);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/files')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file uploaded');
    });
  });
});
