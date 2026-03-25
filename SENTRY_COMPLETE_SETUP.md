# Sentry Complete Setup Guide

Complete guide to add error tracking and performance monitoring to Nian Storage using Sentry.

## Table of Contents
1. [Create Sentry Account & Projects](#1-create-sentry-account--projects)
2. [Install Dependencies](#2-install-dependencies)
3. [Frontend Setup](#3-frontend-setup)
4. [Backend Setup](#4-backend-setup)
5. [Test Your Setup](#5-test-your-setup)
6. [Deploy to Production](#6-deploy-to-production)
7. [Monitoring Dashboard](#7-monitoring-dashboard)

---

## 1. Create Sentry Account & Projects

### Step 1.1: Create Sentry Account
1. Visit [sentry.io](https://sentry.io)
2. Click "Get Started" or "Sign Up"
3. Create a free account (includes generous free tier: 5,000 events/issues per month)
4. You'll be taken to the onboarding wizard

### Step 1.2: Create Two Projects
**Project 1: Frontend**
- Click "Create Project"
- Select platform: **React**
- Set environment: Select your development environment
- Name: `Nian Storage Frontend`
- Create the project
- Copy the **DSN** (Data Source Name) - looks like: `https://xxxxx@sentry.io/123456`

**Project 2: Backend**
- Create another project
- Select platform: **Node.js**
- Name: `Nian Storage Backend`
- Copy the **DSN** for this project

---

## 2. Install Dependencies

### Frontend
```bash
cd frontend
npm install @sentry/react @sentry/tracing
```

### Backend
```bash
cd backend
npm install @sentry/node @sentry/profiling-node
```

---

## 3. Frontend Setup

### Step 3.1: Create Sentry Config File
File: `frontend/src/config/sentry.js` ✅ (Already created)

### Step 3.2: Update Environment Variables

Create `.env.local` for development:
```env
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_APP_VERSION=1.0.0-dev
```

Create `.env.production` for production:
```env
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_APP_VERSION=1.0.0
```

### Step 3.3: Update main.jsx

Replace your `frontend/src/main.jsx` with:

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Initialize Sentry BEFORE rendering the app
import { initSentry } from './config/sentry.js'
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Step 3.4: Set User Context After Login

In your `NianLogin.jsx` (after successful login):

```javascript
import { setUserContext } from '../config/sentry.js'

// After successful authentication
const handleLoginSuccess = (user) => {
  setUserContext({
    id: user.id,
    email: user.email,
    username: user.email?.split('@')[0],
  })
  // ... rest of your login logic
}

// On logout
const handleLogout = () => {
  setUserContext(null)
  // ... rest of your logout logic
}
```

---

## 4. Backend Setup

### Step 4.1: Create Sentry Config File
File: `backend/config/sentry.js` ✅ (Already created)

### Step 4.2: Update Environment Variables

Add to your `backend/.env`:
```env
NODE_ENV=development
SENTRY_DSN=https://your-key@sentry.io/your-project-id
APP_VERSION=1.0.0-dev
```

### Step 4.3: Update server.js

Replace the beginning of your `backend/server.js` with:

```javascript
import dotenv from 'dotenv'
dotenv.config()

// Initialize Sentry FIRST
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

// Sentry request handler - early in chain
app.use(sentryRequestHandler())

// Your API routes
app.use('/api/auth', authRoutes)
app.use('/api/files', filesRoutes)

// Sentry error handler - after all routes
app.use(sentryErrorHandler())

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### Step 4.4: Add User Context in Auth Routes

Update `backend/routes/auth.js`:

```javascript
import { setUserContext, addBreadcrumb } from '../config/sentry.js'

export const login = async (req, res) => {
  try {
    addBreadcrumb('Login attempt', 'auth')
    
    // Your login logic
    const user = await authenticateUser(req.body.email, req.body.password)
    
    // Set user in Sentry
    setUserContext({
      id: user.id,
      email: user.email,
      username: user.email?.split('@')[0],
    })
    
    res.json({ token: generateToken(user) })
  } catch (error) {
    console.error('Login failed:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export const logout = (req, res) => {
  setUserContext(null)
  res.json({ success: true })
}
```

---

## 5. Test Your Setup

### Test Frontend Errors

Add a test button to `NianStorage.jsx`:

```javascript
import { captureError } from '../config/sentry.js'

const TestSentryError = () => {
  const testError = () => {
    try {
      throw new Error('Test error from frontend')
    } catch (error) {
      captureError(error, { test: true })
    }
  }
  
  return <button onClick={testError}>Test Sentry Error</button>
}
```

### Test Backend Errors

Add a test endpoint:

```javascript
app.get('/api/test-error', (req, res) => {
  const error = new Error('Test error from backend')
  throw error // Will be caught by Sentry error handler
})
```

### Verify in Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Click on your projects
3. You should see the test errors appear within seconds
4. Click on an error to see full stack trace, user context, and performance data

---

## 6. Deploy to Production

### Update Environment Variables

**On Vercel (Frontend):**
1. Go to Vercel project settings
2. Add environment variables:
   - `VITE_SENTRY_DSN` = Your frontend DSN
   - `VITE_APP_VERSION` = Your app version
3. Redeploy

**On Vercel (Backend):**
1. Go to Vercel project settings
2. Add environment variables:
   - `SENTRY_DSN` = Your backend DSN
   - `NODE_ENV` = production
   - `APP_VERSION` = Your app version
3. Redeploy

### Update Package.json Scripts (Optional)

Add scripts to both frontend and backend `package.json`:

```json
{
  "scripts": {
    "release": "sentry-cli releases create --project nian-storage"
  }
}
```

---

## 7. Monitoring Dashboard

### Key Metrics to Track

**In Sentry Dashboard:**
- **Issues**: New errors and exceptions
- **Performance**: API response times, database query times
- **Releases**: Track which version has issues
- **User Feedback**: See errors from user perspective
- **Session Replays**: Watch exact steps before error (useful for bugs)

### Set Up Alerts

In Sentry:
1. Go to "Alerts" → "Create Alert Rule"
2. Set conditions:
   - When: "A new issue is created" or "An issue occurs 10 times in 1 minute"
   - Notify: Email or Slack

### Recommended Alerts

- **Critical**: Any unhandled error in production
- **High**: Database connection errors
- **Medium**: Performance regressions (API > 1s)
- **Low**: Development environment errors

---

## 8. Best Practices

### Do's ✅
- Initialize Sentry BEFORE other imports
- Set user context after login
- Use breadcrumbs for user actions
- Filter sensitive data in `beforeSend`
- Use appropriate sample rates for production

### Don'ts ❌
- Don't commit real DSNs in code
- Don't expose backend DSN to frontend
- Don't send PII (passwords, credit cards) to Sentry
- Don't set error handler before routes (Sentry middleware must be in correct order)

---

## 9. File Reference

**Created Files:**
- ✅ `frontend/src/config/sentry.js` - Frontend configuration
- ✅ `backend/config/sentry.js` - Backend configuration
- ✅ `FRONTEND_SENTRY_SETUP.md` - Detailed frontend guide
- ✅ `BACKEND_SENTRY_SETUP.md` - Detailed backend guide
- ✅ `.env.example.sentry` - Environment variable template
- ✅ `SENTRY_COMPLETE_SETUP.md` - This file

**Files to Update:**
- `frontend/src/main.jsx` - Add `initSentry()`
- `frontend/src/pages/NianLogin.jsx` - Add `setUserContext()`
- `backend/server.js` - Add Sentry middleware
- `backend/routes/auth.js` - Add user context
- `.env.local` (frontend dev) - Add Sentry DSN
- `.env.production` (frontend prod) - Add Sentry DSN
- `backend/.env` - Add Sentry DSN

---

## 10. Quick Checklist

- [ ] Create Sentry account at sentry.io
- [ ] Create frontend project, copy DSN
- [ ] Create backend project, copy DSN
- [ ] Install @sentry/react and @sentry/node
- [ ] Create config files (already done ✅)
- [ ] Update frontend .env files with VITE_SENTRY_DSN
- [ ] Update frontend main.jsx with `initSentry()`
- [ ] Update backend .env with SENTRY_DSN
- [ ] Update backend server.js with Sentry middleware
- [ ] Update backend auth routes with setUserContext()
- [ ] Test errors locally
- [ ] Verify errors in Sentry dashboard
- [ ] Deploy to production
- [ ] Set up alerts
- [ ] Monitor dashboard regularly

---

## Need Help?

- Sentry Docs: https://docs.sentry.io/
- React Integration: https://docs.sentry.io/platforms/javascript/guides/react/
- Node.js Integration: https://docs.sentry.io/platforms/node/
- Community Support: https://forum.sentry.io/

