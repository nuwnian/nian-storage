import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../config/r2.js';
import crypto from 'crypto';

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} fileBuffer - File data
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{key: string, url: string}>}
 */
export async function uploadToR2(fileBuffer, fileName, mimeType, userId) {
  try {
    // Generate unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueId = crypto.randomUUID();
    const key = `users/${userId}/${uniqueId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        originalName: fileName,
        uploadedBy: userId,
      },
    });

    await r2Client.send(command);

    // Return public URL
    const url = `${R2_PUBLIC_URL}/${key}`;
    console.log('✅ File uploaded to R2:', { key, url });

    return { key, url };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to storage');
  }
}

/**
 * Delete file from Cloudflare R2
 * @param {string} key - File key in R2
 * @returns {Promise<void>}
 */
export async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error('Failed to delete file from storage');
  }
}

/**
 * Generate presigned URL for temporary file access
 * @param {string} key - File key in R2
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('R2 presigned URL error:', error);
    throw new Error('Failed to generate file access URL');
  }
}
