# Backend Sentry Configuration

## Environment Variables

Add to your `.env` file:

```env
# Development
NODE_ENV=development
SENTRY_DSN=https://your-key@sentry.io/your-project-id
APP_VERSION=1.0.0-dev

# Production
NODE_ENV=production
SENTRY_DSN=https://your-key@sentry.io/your-project-id
APP_VERSION=1.0.0
```

## Integration with server.js

Initialize Sentry at the **TOP** of your `backend/server.js` (before all other imports):

```javascript
import dotenv from 'dotenv'
dotenv.config()

// Initialize Sentry FIRST, before anything else
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js'
initSentry()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import filesRoutes from './routes/files.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Add Sentry request handler EARLY in middleware chain
app.use(sentryRequestHandler())

// Your routes
app.use('/api/auth', authRoutes)
app.use('/api/files', filesRoutes)

// Add Sentry error handler LAST (after all routes)
app.use(sentryErrorHandler())

// Global error handler (optional - after Sentry error handler)
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

## Dependencies Installation

### Frontend (React)

```bash
cd frontend
npm install @sentry/react @sentry/tracing
npm install --save-dev @sentry/cli
```

### Backend (Node.js)

```bash
cd backend
npm install @sentry/node @sentry/profiling-node
npm install --save-dev @sentry/cli
```

## Setting Up Sentry Project

1. Go to [sentry.io](https://sentry.io) and create free account
2. Create a new organization
3. Create two projects:
   - **Project 1**: Name "Nian Storage Frontend", Platform: React
   - **Project 2**: Name "Nian Storage Backend", Platform: Node.js
4. Copy the DSN for each project
5. Add DSNs to your respective `.env` files

## Usage Examples

### In Route Handlers

```javascript
import { captureError, setUserContext, addBreadcrumb } from '../config/sentry.js'

export const login = async (req, res) => {
  try {
    addBreadcrumb(`Login attempt: ${req.body.email}`, 'auth')
    
    const user = await authenticateUser(req.body.email, req.body.password)
    
    setUserContext({
      id: user.id,
      email: user.email,
      username: user.username,
    })
    
    res.json({ token: generateToken(user) })
  } catch (error) {
    captureError(error, {
      email: req.body.email,
      endpoint: '/auth/login',
    })
    res.status(401).json({ error: 'Authentication failed' })
  }
}
```

### In File Operations

```javascript
import { captureAsyncError, addBreadcrumb } from '../config/sentry.js'

export const uploadFile = async (req, res) => {
  const file = req.file
  
  await captureAsyncError(
    uploadToR2(file),
    {
      file_name: file.originalname,
      file_size: file.size,
      user_id: req.user.id,
    }
  )
  
  addBreadcrumb(`File uploaded: ${file.originalname}`, 'file-operation')
  res.json({ success: true })
}
```

### Manual Error Capture

```javascript
import { captureError, captureMessage } from '../config/sentry.js'

try {
  const result = await someOperation()
} catch (error) {
  captureError(error, { operation: 'someOperation' })
}

// Capture informational messages
captureMessage('Unusual API usage pattern detected', 'warning')
```

## Monitoring Performance

The backend automatically tracks:
- HTTP request duration
- Database queries (PostgreSQL)
- External API calls
- Unhandled exceptions and rejections

View performance data in Sentry dashboard under "Performance" tab.

## Environment-Specific Settings

### Development
- `tracesSampleRate: 1.0` - Track 100% of requests
- `profilesSampleRate: 1.0` - Profile 100% of requests
- `debug: true` - Enable console logging

### Production
- `tracesSampleRate: 0.1` - Track 10% of requests (reduce bandwidth)
- `profilesSampleRate: 0.1` - Profile 10% of requests
- `debug: false` - Disable console logging

## Filtering & Ignoring Errors

Edit the `beforeSend` function in `backend/config/sentry.js` to filter errors:

```javascript
beforeSend(event, hint) {
  const error = hint.originalException;
  
  // Ignore file not found errors
  if (error?.message?.includes("ENOENT")) {
    return null;
  }
  
  // Ignore timeout errors on specific endpoints
  if (event.request?.url?.includes("/health-check")) {
    return null;
  }
  
  return event;
}
```

## Troubleshooting

### "DSN is invalid"
- Verify DSN format: `https://key@sentry.io/project-id`
- Check environment variable name matches: `SENTRY_DSN`

### "Can't connect to sentry.io"
- Check internet connection
- Verify SENTRY_DSN is set correctly
- Check if Sentry service is accessible

### Too many errors
- Increase filtering in `beforeSend`
- Reduce sampling rates
- Check for infinite loops or recursive errors

### No data appearing in frontend/backend
- Verify DSN is correct for each project
- Check browser/server console for initialization errors
- Ensure `initSentry()` is called before app logic
