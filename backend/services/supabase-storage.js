import { supabaseAdmin } from '../config/supabase.js';

const BUCKET_NAME = 'user-files';

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type of the file
 * @param {string} userId - User ID for organizing storage
 * @returns {Promise<{key: string, url: string}>} The storage key and public URL
 */
export const uploadToSupabaseStorage = async (fileBuffer, fileName, mimeType, userId) => {
  try {
    // Create a unique file path: users/{userId}/{timestamp}-{fileName}
    const timestamp = Date.now();
    const fileKey = `users/${userId}/${timestamp}-${fileName}`;

    console.log('[SUPABASE STORAGE] Uploading file:', { fileKey, size: fileBuffer.length, mimeType });

    // Upload file to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileKey, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[SUPABASE STORAGE] Upload failed:', error);
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileKey);

    console.log('[SUPABASE STORAGE] ✅ Upload successful:', { key: fileKey, url: urlData.publicUrl });

    return {
      key: fileKey,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('[SUPABASE STORAGE] Exception during upload:', error);
    throw error;
  }
};

/**
 * Download a file from Supabase Storage
 * @param {string} fileKey - The storage key of the file
 * @returns {Promise<Buffer>} The file buffer
 */
export const downloadFromSupabaseStorage = async (fileKey) => {
  try {
    console.log('[SUPABASE STORAGE] Downloading file:', { fileKey });

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(fileKey);

    if (error) {
      console.error('[SUPABASE STORAGE] Download failed:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    console.log('[SUPABASE STORAGE] ✅ Download successful:', { key: fileKey, size: data.size });

    return data;
  } catch (error) {
    console.error('[SUPABASE STORAGE] Exception during download:', error);
    throw error;
  }
};

/**
 * Get file metadata from Supabase Storage
 * @param {string} fileKey - The storage key of the file
 * @returns {Promise<Object>} File metadata
 */
export const getFileMetadata = async (fileKey) => {
  try {
    console.log('[SUPABASE STORAGE] Getting metadata:', { fileKey });

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .info();

    if (error) {
      console.error('[SUPABASE STORAGE] Metadata fetch failed:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('[SUPABASE STORAGE] Exception during metadata fetch:', error);
    throw error;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} fileKey - The storage key of the file
 * @returns {Promise<void>}
 */
export const deleteFromSupabaseStorage = async (fileKey) => {
  try {
    console.log('[SUPABASE STORAGE] Deleting file:', { fileKey });

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([fileKey]);

    if (error) {
      console.error('[SUPABASE STORAGE] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log('[SUPABASE STORAGE] ✅ Delete successful:', { key: fileKey });
  } catch (error) {
    console.error('[SUPABASE STORAGE] Exception during delete:', error);
    throw error;
  }
};

/**
 * Extract file key from a Supabase Storage URL
 * @param {string} url - The public URL from Supabase Storage
 * @returns {string} The file key
 */
export const extractKeyFromUrl = (url) => {
  // URL format: https://xxxx.supabase.co/storage/v1/object/public/user-files/users/{userId}/{filename}
  // We need to extract: users/{userId}/{filename}
  try {
    if (!url || typeof url !== 'string') return url;
    
    // Find the bucket name in the URL
    const bucketIndex = url.indexOf(BUCKET_NAME);
    if (bucketIndex === -1) return url;
    
    // Everything after 'bucket-name/' is the key
    const keyStart = bucketIndex + BUCKET_NAME.length + 1;
    const key = url.substring(keyStart);
    
    return key || url;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return url;
  }
};
