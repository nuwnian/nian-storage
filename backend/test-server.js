import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Logging middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}\n`);
  next();
});

// Test upload endpoint
app.post('/api/files', upload.single('file'), (req, res) => {
  console.log('✅ Upload POST received');
  console.log('   File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
  console.log('   Auth header:', req.headers.authorization ? 'Present' : 'MISSING');
  
  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log('✅ Sending success response');
  res.json({ 
    message: 'File uploaded successfully',
    file: {
      id: 'test-123',
      name: req.file.originalname,
      size: req.file.size
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(5000, () => {
  console.log('🚀 TEST SERVER running on http://localhost:5000');
  console.log('   Ready for uploads to /api/files');
});
