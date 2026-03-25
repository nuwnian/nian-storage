/**
 * R2 Connection Test Script
 * Run this to verify R2 credentials and connectivity
 * 
 * Usage: node backend/test-r2-connection.js
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
};

// Validate config
console.log('📋 Configuration Check:');
for (const [key, value] of Object.entries(config)) {
  if (!value) {
    console.error(`❌ Missing: ${key}`);
  } else if (key.includes('SECRET')) {
    console.log(`✅ ${key}: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
  } else {
    console.log(`✅ ${key}: ${value}`);
  }
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: config.R2_ENDPOINT,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function testConnection() {
  try {
    console.log('\n🧪 Test 1: Listing bucket contents...');
    const listCmd = new ListObjectsV2Command({
      Bucket: config.R2_BUCKET_NAME,
      MaxKeys: 5,
    });
    const listResult = await s3Client.send(listCmd);
    console.log(`✅ Bucket accessible. Contains ${listResult.KeyCount || 0} objects.`);
    
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('   Sample files:');
      listResult.Contents.slice(0, 3).forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes, ${new Date(obj.LastModified).toLocaleString()})`);
      });
    }
  } catch (err) {
    console.error(`❌ List failed: ${err.message}`);
    return false;
  }

  try {
    console.log('\n🧪 Test 2: Upload test file...');
    const testKey = `test/${Date.now()}-connection-test.txt`;
    const uploadCmd = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: testKey,
      Body: Buffer.from(`Test upload at ${new Date().toISOString()}`),
      ContentType: 'text/plain',
    });
    await s3Client.send(uploadCmd);
    console.log(`✅ Upload successful: ${testKey}`);
    
    console.log('\n🧪 Test 3: Retrieve uploaded file...');
    const getCmd = new GetObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: testKey,
    });
    const getResult = await s3Client.send(getCmd);
    const body = await getResult.Body.transformToString('utf-8');
    console.log(`✅ Download successful: "${body}"`);
    console.log(`   Public URL: ${config.R2_PUBLIC_URL}/${testKey}`);
    
    return true;
  } catch (err) {
    console.error(`❌ Operations failed: ${err.message}`);
    if (err.code) console.error(`   Code: ${err.code}`);
    if (err.$metadata) console.error(`   HTTP Status: ${err.$metadata.httpStatusCode}`);
    return false;
  }
}

async function main() {
  console.log('🚀 R2 Connection Diagnostic Tool\n');
  
  // Validate required config
  const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  const missing = required.filter(k => !config[k]);
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing configuration: ${missing.join(', ')}`);
    console.error('Add these to backend/.env and try again.');
    process.exit(1);
  }

  const success = await testConnection();
  
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ R2 is working correctly!');
    console.log('If upload still fails, check:');
    console.log('  1. Frontend auth token is valid');
    console.log('  2. Database user record exists');
    console.log('  3. Backend logs for detailed errors');
  } else {
    console.log('❌ R2 connection failed.');
    console.log('Common causes:');
    console.log('  1. Invalid or expired R2 API credentials');
    console.log('  2. Bucket name incorrect or inaccessible');
    console.log('  3. API token missing required permissions');
    console.log('  4. Network/firewall blocking R2 endpoint');
  }
}

main().catch(console.error);
