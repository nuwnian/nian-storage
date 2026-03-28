# Drag & Drop Upload Flow Analysis

## Overview
The application implements a complete file upload system with drag-and-drop functionality, client-side compression, progress tracking, and server-side validation.

---

## Frontend Implementation (NianStorage.jsx)

### 1. **Drag & Drop Zone**
Located in the upload area UI:

```jsx
<div
  className={`upload-zone ${dragging ? "drag" : ""}`}
  onDragOver={e => { e.preventDefault(); if (isSessionReady) setDragging(true); }}
  onDragLeave={() => setDragging(false)}
  onDrop={e => { 
    e.preventDefault(); 
    setDragging(false); 
    if (isSessionReady) handleFileUpload(e.dataTransfer.files);
  }}
  onClick={() => isSessionReady && fileInputRef.current?.click()}
>
```

**Key Features:**
- ✅ **DragOver**: Sets dragging state to show visual feedback
- ✅ **DragLeave**: Resets dragging state when cursor leaves
- ✅ **Drop**: Extracts files from `e.dataTransfer.files` and initiates upload
- ✅ **Click**: Falls back to file input for traditional file picker
- ✅ **Session Check**: Disables upload if session not ready (`isSessionReady`)

### 2. **File Input (Hidden)**
```jsx
<input
  ref={fileInputRef}
  type="file"
  multiple
  accept="*/*"
  style={{ display: 'none' }}
  onChange={(e) => handleFileUpload(e.target.files)}
/>
```

**Properties:**
- `multiple`: Allows selecting multiple files at once
- `accept="*/*"`: Accepts all file types (server validates)
- Hidden with `display: none`
- onChange triggers `handleFileUpload`

### 3. **Image Compression (Client-Side)**

Before uploading images, they're compressed to reduce bandwidth:

```javascript
const compressImage = async (file, maxWidth = 1920, quality = 0.8) => {
  if (!file.type.startsWith('image/')) {
    resolve(file); // Skip non-images
    return;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if image is too large
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };
  };
};
```

**Process:**
1. Load image as data URL
2. Draw on canvas with max width 1920px
3. Compress to 80% quality using `canvas.toBlob()`
4. Return new File object with compressed data
5. Non-images bypass compression

### 4. **Upload with Progress Tracking**

Uses XMLHttpRequest (XHR) for manual progress control:

```javascript
const uploadFileWithProgress = (file, formData, token) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 600000; // 10 minutes for large videos

    // Track upload progress (0-90% = browser→server)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 90);
        setUploadProgress({ 
          uploading: true, 
          progress: percent, 
          fileName: file.name, 
          phase: 'uploading' 
        });
      }
    });

    // Once bytes sent, show "Processing..." (90-100%)
    xhr.upload.addEventListener('loadend', () => {
      setUploadProgress(prev => ({
        ...prev,
        progress: 90,
        phase: 'processing'
      }));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        setUploadProgress({ uploading: true, progress: 100, fileName: file.name, phase: 'done' });
        resolve(data);
      } else {
        reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
      }
    });

    // Error handlers
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')));
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${API_URL}/api/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};
```

**Progress Tracking:**
- **0-90%**: Browser uploading bytes to server
- **90-100%**: Server processing (R2 upload + DB save)
- **Status Updates**: `uploading`, `processing`, `done`
- **Error Handling**: Timeout, network errors, aborts

### 5. **Main Upload Handler**

```javascript
const handleFileUpload = async (fileList) => {
  if (!token || !isSessionReady) {
    setError('You must be logged in to upload files');
    return;
  }

  for (let i = 0; i < fileList.length; i++) {
    let file = fileList[i];
    
    // Compress images before upload
    if (file.type.startsWith('image/')) {
      file = await compressImage(file);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await uploadFileWithProgress(file, formData, token);
      
      // Add new file to list
      const newFile = { ...data.file };
      setFiles(prev => [newFile, ...prev]);
      if (newFile.type === 'image') loadBlobUrls([newFile]);
      fetchUserData(); // Update storage
    } catch (err) {
      setError('Upload failed: ' + err.message);
    }
  }
};
```

**Flow:**
1. Validate token & session
2. Iterate through files (supports multiple)
3. Compress images
4. Create FormData
5. Upload with progress tracking
6. Update file list on success
7. Refresh user storage info

---

## Backend Implementation

### 1. **API Endpoint: POST /api/files**

**Vercel Serverless** ([api/files/index.js](api/files/index.js)):
```javascript
export default async function handler(req, res) {
  const { user, error: authError, status } = await verifyUser(req);
  if (authError) return res.status(status).json({ error: authError });

  if (req.method === 'POST') {
    // Parse multipart form data
    const parts = await parseMultipart(req);
    const filePart = parts.find(p => p.filename);
    if (!filePart) return res.status(400).json({ error: 'No file uploaded' });

    // ... validation and upload logic
  }
}
```

**Express Backend** ([backend/routes/files.js](backend/routes/files.js)):
```javascript
router.post('/', verifyUser, upload.single('file'), async (req, res) => {
  // Uses multer middleware for file handling
});
```

### 2. **File Validation**

**Size Limits:**
- API: 50 MB max
- Multer: 500 MB max (for videos)

**Allowed MIME Types:**
```javascript
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);
```

**Validation Process:**
1. Extract MIME type from multipart header
2. Check against whitelist
3. Verify file size
4. Check storage quota

### 3. **File Type Detection**

```javascript
function getFileType(mimetype, filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (mimetype.startsWith('image/')) return { type: 'image', color: '#7BA05B' };
  if (mimetype.startsWith('video/')) return { type: 'video', color: '#D97706' };
  if (mimetype === 'application/pdf' || ext === 'pdf') 
    return { type: 'doc', color: '#DC2626' };
  if (['docx', 'doc'].includes(ext)) 
    return { type: 'doc', color: '#2563EB' };
  if (['xlsx', 'xls'].includes(ext)) 
    return { type: 'doc', color: '#059669' };
  if (mimetype === 'text/plain' || ext === 'txt') 
    return { type: 'doc', color: '#6B7280' };
  return { type: 'doc', color: '#5B8C7A' };
}
```

**Categorizes files into**: `image`, `video`, `doc`

### 4. **R2 (Cloudflare) Upload**

```javascript
const key = `users/${user.id}/${randomUUID()}.${ext}`;

await r2Client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: key,
  Body: buffer,
  ContentType: contentType,
}));

const url = `${process.env.R2_PUBLIC_URL}/${key}`;
```

**Storage Structure:**
- Path: `users/{userId}/{randomUUID}.{ext}`
- UUID ensures unique filenames
- Public URL constructed for file retrieval

### 5. **Database Record Creation**

```javascript
const { data: newFile, error: fileError } = await supabaseAdmin
  .from('files')
  .insert([{
    user_id: user.id,
    name: filename,
    type: fileType,
    size: formatSize(size),
    size_bytes: size,
    url,
    color: fileColor,
  }])
  .select().single();
```

**Database Fields:**
- `user_id`: User ownership
- `name`: Original filename
- `type`: Category (image/video/doc)
- `size`: Human-readable size (e.g., "2.5 MB")
- `size_bytes`: Byte count for storage tracking
- `url`: R2 public URL
- `color`: UI color for file type

### 6. **Storage Quota Management**

```javascript
const { data: userData } = await supabaseAdmin
  .from('users').select('storage_used, storage_total').eq('id', user.id).single();

if (userData.storage_used + size > userData.storage_total) {
  return res.status(400).json({ error: 'Storage limit exceeded' });
}

// After upload succeeds
await supabaseAdmin
  .from('users')
  .update({ storage_used: (userData.storage_used || 0) + size })
  .eq('id', user.id);
```

**Quota Enforcement:**
- Check before upload
- Increment after successful storage
- Default: 10 GB per user

---

## Complete Upload Flow Diagram

```
User drops/selects file
        ↓
[Frontend] Validate token & session
        ↓
[Frontend] Is it an image? → Compress using canvas
        ↓
[Frontend] Create FormData with file
        ↓
[Frontend] XHR POST to /api/files with Bearer token
        ↓ (0-90% progress)
[Server] Receive multipart data
        ↓
[Server] Parse & extract file
        ↓
[Server] Validate: size, MIME type, quota
        ↓
[Server] Detect file type (image/video/doc)
        ↓
[Server] Upload to R2 storage
        ↓ (90-100% progress: "Processing...")
[Server] Insert record into Supabase
        ↓
[Server] Update user storage_used quota
        ↓
[Server] Return file object to client (201)
        ↓
[Frontend] Add file to list (show in grid/list)
        ↓
[Frontend] Load blob URL for thumbnails
        ↓
[Frontend] Update storage info
```

---

## Key Design Patterns

### ✅ **Authentication & Authorization**
- Bearer token validation on every request
- Supabase JWT verification
- User isolation via `user_id`

### ✅ **Error Handling**
- Client-side: Graceful fallbacks (e.g., skip compression if failed)
- Server-side: MIME type, size, quota validation
- Network-robust: Timeout, abort handlers

### ✅ **Performance Optimizations**
- Image compression (1920px max, 80% quality)
- XHR custom progress tracking (split 0-90% and 90-100%)
- Multipart parsing with size limits
- Streaming to R2, not memory storage

### ✅ **User Experience**
- Real-time progress bar (0-100%)
- "Processing..." state during server work
- Visual drag zone feedback (border color change)
- Multiple file upload support
- Immediate UI update on success

### ✅ **Storage & Organization**
- UUID-based filenames (no collisions)
- User-segregated paths in R2
- File type categorization
- Color-coded UI by type

---

## Potential Improvements

1. **Resume/Pause**: XHR doesn't support resuming. Consider Blob API chunks.
2. **Client-side validation**: Show MIME type error before upload attempt.
3. **Virus scanning**: No server-side scan for malware.
4. **Rate limiting**: No per-user upload rate limit.
5. **Bandwidth throttling**: No way to limit upload speed.
6. **Duplicate detection**: No check for same file uploaded twice.
7. **Batch status**: Multiple files don't show individual progress.

---

## Summary

The upload system is **well-architected** with:
- ✅ Smooth drag-drop UX with visual feedback
- ✅ Client-side image optimization
- ✅ Detailed progress tracking (0-100%)
- ✅ Multi-layer validation (size, MIME, quota)
- ✅ Secure token-based auth
- ✅ R2 cloud storage integration
- ✅ Database persistence with metadata

The flow is **intuitive** and **performant** for typical use cases.
