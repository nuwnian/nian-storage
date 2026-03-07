import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Validate R2 configuration
const validateR2Config = () => {
  const required = {
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      console.error(`❌ Missing R2 configuration: ${key}`);
      throw new Error(`Missing R2 configuration: ${key}`);
    }
  }

  console.log('✅ R2 configuration loaded:');
  console.log(`   Endpoint: ${required.R2_ENDPOINT}`);
  console.log(`   Bucket: ${required.R2_BUCKET_NAME}`);
  console.log(`   Access Key ID: ${required.R2_ACCESS_KEY_ID.substring(0, 4)}...`);
  console.log(`   Secret Key Length: ${required.R2_SECRET_ACCESS_KEY.length} chars`);
  
  if (required.R2_SECRET_ACCESS_KEY.length !== 64) {
    console.error(`⚠️  WARNING: R2 Secret Key has ${required.R2_SECRET_ACCESS_KEY.length} characters, expected 64`);
  }
};

validateR2Config();

// Cloudflare R2 uses S3-compatible API
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for R2
  requestTimeout: 600000, // 10 minutes for large video uploads
  requestChecksumCalculation: 'WHEN_REQUIRED', // Disable auto checksum — R2 doesn't support x-amz-checksum-mode
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
