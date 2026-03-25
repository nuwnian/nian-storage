# File Serving & Upload - 500 Error Diagnostics

## Error Summary
You're receiving **500 Internal Server Error** when:
- Uploading files: POST `/api/files`
- Serving uploaded files: GET `/api/files/{id}/serve`

## Root Causes (Priority Order)

### 1. ❌ R2 Credentials Invalid or Expired (MOST LIKELY)
**Symptoms**: All R2 operations fail with 500 error

**Check Your Backend .env for:**
```env
R2_ENDPOINT=https://3d94c104569308dcd57a6c5c20773de2.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=66386e668b6b10a38e6f10cb21938134
R2_SECRET_ACCESS_KEY=741e36adedcb663b6d79dae73aa5f717e1a94a0cf20419891ea0430add0aa101
R2_BUCKET_NAME=nian-storage
R2_PUBLIC_URL=https://pub-6ca52f8da1a24578a07a77c1a8c3766b.r2.dev
```

**Verify Credentials:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **API Tokens**
3. Check if your existing token is still valid
4. If expired, regenerate a new one
5. Update `.env` with new credentials
6. Restart backend server

**How to Generate New R2 Token:**
1. Cloudflare Dashboard → R2 → Settings
2. Click **Create API Token**
3. Select **Edit (All)** permissions
4. Copy the credentials to `.env`
5. Verify bucket name is correct

### 2. ❌ R2 Bucket Not Accessible
**Symptoms**: 403 Forbidden or NoSuchBucket errors in logs

**Check:**
```bash
# Verify bucket exists
- R2_BUCKET_NAME must be: nian-storage (case-sensitive)
- Check R2 dashboard for bucket existence
- Ensure API token has permissions to this bucket
```

**Fix:**
- Regenerate API token with **Admin Read** and **Admin Write** permissions
- Update `.env` and restart

### 3. ❌ Files Have Malformed URLs in Database
**Symptoms**: Upload succeeds but serving fails with "Failed to retrieve file"

**Check Database:**
```sql
-- In Supabase SQL Editor
SELECT id, name, url, size_bytes FROM files LIMIT 5;

-- URL should look like:
-- https://pub-6ca52f8da1a24578a07a77c1a8c3766b.r2.dev/users/<user-id>/uuid.extension
```

**Fix if URLs are broken:**
```sql
-- See if a pattern of broken URLs exists
SELECT DISTINCT url FROM files WHERE url NOT LIKE '%/users/%';
```

### 4. ❌ Supabase Connection Issues
**Symptoms**: 400 errors, "User not found" messages

**Check .env in backend:**
```env
SUPABASE_URL=https://zozvtmmtqgrsdyautisy.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Test Supabase Connection:**
```bash
# From backend directory
npm test  # If test script queries Supabase
```

### 5. ⚠️ Network/Firewall Issues
**Symptoms**: Timeouts or connection refused errors

**Check:**
- Backend can reach R2 endpoint (`R2_ENDPOINT`)
- Backend can reach Supabase (`SUPABASE_URL`)
- No corporate firewall blocking external connections

## Debugging Steps

### Step 1: Check Backend Logs
Enable detailed logging:
```javascript
// Already added in latest fix - logs show:
// - R2 upload: key, bucket, file size
// - R2 fetch: key reconstruction logic
// - Error details: code, status, message
```

**Look for log lines like:**
```
Uploading to R2...
R2 upload starting: { bucket: 'nian-storage', key: 'users/xxx/uuid.png', fileSize: 138000 }
✅ File uploaded to R2: { key: '...', url: 'https://pub-...' }

// OR for errors:
R2 upload error: { message: 'Invalid credentials', code: 'InvalidAccessKeyId' }
```

### Step 2: Test R2 Connection Directly
Create `test-r2.js`:
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const cmd = new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: 'test/connection-check.txt',
  Body: Buffer.from('Connection OK'),
  ContentType: 'text/plain',
});

try {
  await s3Client.send(cmd);
  console.log('✅ R2 connection successful');
} catch (err) {
  console.error('❌ R2 connection failed:', err.message);
}
```

Run: `node test-r2.js`

### Step 3: Verify File URLs in Database
```sql
-- In Supabase SQL Editor
SELECT 
  id, 
  name, 
  url, 
  size_bytes,
  created_at 
FROM files 
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC 
LIMIT 5;
```

**All URLs should:**
- Start with `https://pub-6ca52f8da1a24578a07a77c1a8c3766b.r2.dev/`
- Contain `users/<user-id>/` in path
- End with file extension (`.png`, `.jpg`, etc.)

### Step 4: Test Upload → Serve Flow

**Upload Test:**
```bash
# Terminal test using curl
curl -X POST http://localhost:5000/api/files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.png"

# Should return:
# { "message": "File uploaded successfully", "file": { "id": "...", "url": "..." } }
```

**Note the file ID and URL, then test serving:**
```bash
curl http://localhost:5000/api/files/{file-id}/serve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded-file.png
```

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `InvalidAccessKeyId` | R2 credentials wrong | Regenerate R2 API token |
| `AccessDenied` | Insufficient permissions | Grant Admin permissions to token |
| `NoSuchBucket` | Bucket doesn't exist or name wrong | Verify R2_BUCKET_NAME |
| `EntityTooLarge` | File exceeds 500MB limit | Reduce file size |
| `Failed to retrieve file: Timeout` | Network issue | Check R2 endpoint reachability |
| `File URL not found` | Files table has null URL | Check database schema |

## Quick Fix Checklist

- [ ] R2 credentials are current (not expired)
- [ ] R2_BUCKET_NAME matches actual bucket name
- [ ] R2_PUBLIC_URL is correct
- [ ] Backend .env file has all R2 variables
- [ ] Redis/cache not interfering  
- [ ] Backend restarted after .env changes
- [ ] Files in database have valid URLs
- [ ] Supabase connection working

## Verify Latest Fixes

The backend now includes:
1. ✅ Better R2 error logging
2. ✅ File URL validation
3. ✅ Detailed error messages for debugging
4. ✅ Proper key reconstruction from stored URLs
5. ✅ Auto-user-creation on upload/profile fetch

## Next Steps

1. **Check R2 credentials** - this is the most common cause
2. **Review backend logs** for specific error messages
3. **Test R2 directly** with `test-r2.js` script above
4. **Verify database URLs** are correctly formatted
5. **Restart backend** after any `.env` changes

## Still Stuck?

Provide these details:
1. Backend logs from: `npm run dev:backend`
2. Output from: `node test-r2.js`
3. R2 dashboard screenshot showing bucket exists
4. Result of: `SELECT COUNT(*) FROM files`
5. Sample file URL from database
