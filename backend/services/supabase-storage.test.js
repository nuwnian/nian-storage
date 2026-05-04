import { 
  uploadToSupabaseStorage, 
  downloadFromSupabaseStorage, 
  deleteFromSupabaseStorage,
  extractKeyFromUrl 
} from '../services/supabase-storage.js';
import { supabaseAdmin } from '../config/supabase.js';

// Mock Supabase
jest.mock('../config/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('Supabase Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadToSupabaseStorage', () => {
    it('should upload file successfully', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'users/123/1234567890-test.txt' },
        error: null,
      });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/user-files/users/123/1234567890-test.txt' },
      });

      supabaseAdmin.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const result = await uploadToSupabaseStorage(mockBuffer, 'test.txt', 'text/plain', '123');

      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('user-files');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('users/123/'),
        mockBuffer,
        expect.objectContaining({
          contentType: 'text/plain',
          cacheControl: '3600',
          upsert: false,
        })
      );
      expect(result.url).toContain('user-files');
      expect(result.key).toContain('users/123/');
    });

    it('should handle upload errors', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      supabaseAdmin.storage.from.mockReturnValue({
        upload: mockUpload,
      });

      await expect(uploadToSupabaseStorage(mockBuffer, 'test.txt', 'text/plain', '123'))
        .rejects
        .toThrow('Storage quota exceeded');
    });

    it('should include timestamp in file key to avoid conflicts', async () => {
      const mockBuffer = Buffer.from('test');
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'users/123/timestamp-test.txt' },
        error: null,
      });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/users/123/timestamp-test.txt' },
      });

      supabaseAdmin.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      await uploadToSupabaseStorage(mockBuffer, 'test.txt', 'text/plain', '123');

      const uploadCall = mockUpload.mock.calls[0][0];
      expect(uploadCall).toMatch(/users\/123\/\d+-test\.txt/);
    });
  });

  describe('downloadFromSupabaseStorage', () => {
    it('should download file successfully', async () => {
      const mockBuffer = Buffer.from('file content');
      const mockDownload = jest.fn().mockResolvedValue({
        data: mockBuffer,
        error: null,
      });

      supabaseAdmin.storage.from.mockReturnValue({
        download: mockDownload,
      });

      const result = await downloadFromSupabaseStorage('users/123/test.txt');

      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('user-files');
      expect(mockDownload).toHaveBeenCalledWith('users/123/test.txt');
      expect(result).toEqual(mockBuffer);
    });

    it('should handle download errors', async () => {
      const mockDownload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      });

      supabaseAdmin.storage.from.mockReturnValue({
        download: mockDownload,
      });

      await expect(downloadFromSupabaseStorage('users/123/missing.txt'))
        .rejects
        .toThrow('File not found');
    });
  });

  describe('deleteFromSupabaseStorage', () => {
    it('should delete file successfully', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      supabaseAdmin.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      await deleteFromSupabaseStorage('users/123/test.txt');

      expect(supabaseAdmin.storage.from).toHaveBeenCalledWith('user-files');
      expect(mockRemove).toHaveBeenCalledWith(['users/123/test.txt']);
    });

    it('should handle delete errors', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      });

      supabaseAdmin.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      await expect(deleteFromSupabaseStorage('users/123/missing.txt'))
        .rejects
        .toThrow('File not found');
    });

    it('should handle multiple file deletion', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      supabaseAdmin.storage.from.mockReturnValue({
        remove: mockRemove,
      });

      await deleteFromSupabaseStorage('users/123/test1.txt');
      await deleteFromSupabaseStorage('users/123/test2.txt');

      expect(mockRemove).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractKeyFromUrl', () => {
    it('should extract key from Supabase Storage URL', () => {
      const url = 'https://xxxx.supabase.co/storage/v1/object/public/user-files/users/123/test.txt';
      const key = extractKeyFromUrl(url);
      
      expect(key).toBe('users/123/test.txt');
    });

    it('should handle URLs with nested paths', () => {
      const url = 'https://xxxx.supabase.co/storage/v1/object/public/user-files/users/456/2024-05-04-document.pdf';
      const key = extractKeyFromUrl(url);
      
      expect(key).toBe('users/456/2024-05-04-document.pdf');
    });

    it('should handle URLs with special characters in filename', () => {
      const url = 'https://xxxx.supabase.co/storage/v1/object/public/user-files/users/789/my%20file%20(1).txt';
      const key = extractKeyFromUrl(url);
      
      expect(key).toContain('users/789/');
      expect(key).toContain('file');
    });

    it('should return URL if bucket not found', () => {
      const url = 'https://example.com/some/random/path';
      const key = extractKeyFromUrl(url);
      
      expect(key).toBe(url);
    });

    it('should handle relative paths', () => {
      const url = 'users/123/test.txt';
      const key = extractKeyFromUrl(url);
      
      // Should return the URL as-is since bucket name not found
      expect(key).toBe(url);
    });
  });
});
