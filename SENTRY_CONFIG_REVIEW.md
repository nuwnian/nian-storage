# Sentry Configuration Review

## Status: ⚠️ **CONFIGURED BUT NOT INTEGRATED**

The Sentry configuration files are well-written, but they are **not being used** in the actual application. The entry points don't initialize Sentry.

---

## Current State

### ✅ What's Been Done

#### 1. **Config Files Created (Ready to Use)**

**Frontend Config** ([frontend/src/config/sentry.js](frontend/src/config/sentry.js)):
- ✅ `initSentry()` - Full initialization with React + BrowserTracing
- ✅ `captureError(error, context)` - Manual error reporting
- ✅ `captureMessage(message, level)` - Message logging
- ✅ `setUserContext(user)` - User tracking
- ✅ Proper sampling rates (100% dev, 10% prod)
- ✅ Replay recording for session debugging
- ✅ Error filtering (ignores extensions, aborts)

**Backend Config** ([backend/config/sentry.js](backend/config/sentry.js)):
- ✅ `initSentry()` - Node.js + profiling integration
- ✅ Middleware handlers (`sentryRequestHandler()`, `sentryErrorHandler()`)
- ✅ `captureError()` and `captureMessage()` utilities
- ✅ `setUserContext()` for user identification
- ✅ Profiling enabled (100% dev, 10% prod)

#### 2. **Documentation**
- ✅ [SENTRY_COMPLETE_SETUP.md](SENTRY_COMPLETE_SETUP.md) - Comprehensive setup guide
- ✅ Environment variable structure documented
- ✅ Testing procedures outlined

---

### ❌ What's Missing

#### 1. **Frontend Not Initialized**

**Current** [frontend/src/main.jsx](frontend/src/main.jsx):
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class AppErrorBoundary extends React.Component {
  // ... error boundary
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
```

**Issues:**
- ❌ Sentry is not imported
- ❌ `initSentry()` is never called
- ❌ Only a React error boundary, not Sentry tracking
- ❌ No performance monitoring active
- ❌ User errors won't be tracked

**Should be:**
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Initialize Sentry BEFORE rendering
import { initSentry } from './config/sentry.js'
initSentry()

class AppErrorBoundary extends React.Component {
  // ... rest unchanged
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
```

---

#### 2. **Backend Not Initialized**

**Current** [backend/server.js](backend/server.js):
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (no Sentry)
app.use(cors({ ... }));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Route handlers...
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Error handling (basic, no Sentry)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

**Issues:**
- ❌ Sentry config not imported
- ❌ `initSentry()` never called
- ❌ No request handler (won't track requests)
- ❌ No error handler (errors won't be reported)
- ❌ No performance profiling
- ❌ Uncaught exceptions won't be captured

**Should be:**
```javascript
import dotenv from 'dotenv';
dotenv.config();

// Initialize Sentry FIRST (before other imports)
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js';
initSentry();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ ... }));
app.use(express.json({ limit: '500mb' }));

// Sentry request handler (EARLY in chain)
app.use(sentryRequestHandler());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Sentry error handler (AFTER all routes)
app.use(sentryErrorHandler());

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

---

#### 3. **Environment Variables Not Set**

**Missing in** [backend/.env](backend/.env):
```env
SENTRY_DSN=https://your-key@sentry.io/your-project-id  # ❌ NOT PRESENT
APP_VERSION=1.0.0
NODE_ENV=development
```

**Missing in** [frontend/.env.local](frontend/.env.local) (or `.env`):
```env
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id  # ❌ NOT PRESENT
VITE_APP_VERSION=1.0.0
```

---

#### 4. **User Context Not Set**

**In Frontend** ([frontend/src/pages/NianLogin.jsx](frontend/src/pages/NianLogin.jsx)):
- ❌ No import of `setUserContext` from Sentry config
- ❌ Not calling `setUserContext()` after login
- ❌ Not clearing context on logout

**In Backend** ([backend/routes/auth.js](backend/routes/auth.js)):
- ❌ No Sentry integration in auth routes
- ❌ User context not set after authentication

---

## Configuration Quality Assessment

### ✅ **Strengths of Existing Config**

| Feature | Status | Details |
|---------|--------|---------|
| **Frontend Sampling** | ✅ Good | 100% in dev, 10% in prod (balanced) |
| **Backend Sampling** | ✅ Good | Same as frontend (consistent) |
| **Replay Recording** | ✅ Good | 50% dev, 10% prod (useful for debugging) |
| **Error Filtering** | ✅ Good | Filters browser extensions, aborts |
| **Performance Tracing** | ✅ Good | Configured for React + Node integrations |
| **Profiling** | ✅ Good | Backend profiling enabled |
| **User Tracking** | ✅ Good | Context functions ready |
| **Integrations** | ✅ Good | Express, HTTP, Postgres, uncaught handlers |

### ⚠️ **Issues with Current Config**

| Issue | Severity | Fix |
|-------|----------|-----|
| Not initialized | 🔴 Critical | Must call `initSentry()` in entry points |
| No DSN set | 🔴 Critical | Must set env vars with Sentry project DSN |
| No user context | 🟠 High | Need to call `setUserContext()` after auth |
| Hardcoded API domain | 🟡 Medium | Update `tracingOrigins` with actual domain |

---

## Integration Checklist

### ✅ Frontend Setup

- [ ] **Set Sentry DSN**
  ```bash
  # In frontend/.env.local
  VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
  ```

- [ ] **Initialize in main.jsx**
  - Add import: `import { initSentry } from './config/sentry.js'`
  - Add call: `initSentry()` before React render
  - Keep error boundary (it's complementary)

- [ ] **Set user context after login**
  - In NianLogin.jsx, import `setUserContext`
  - After `await supabase.auth.signUp()` or login, call:
    ```javascript
    setUserContext({
      id: user.id,
      email: user.email,
      username: user.email?.split('@')[0],
    })
    ```
  - On logout: `setUserContext(null)`

- [ ] **Add test error button** (optional)
  - Test Sentry integration before going to production

### ✅ Backend Setup

- [ ] **Set Sentry DSN**
  ```bash
  # In backend/.env
  SENTRY_DSN=https://your-key@sentry.io/your-project-id
  ```

- [ ] **Initialize in server.js**
  - Move `dotenv.config()` to top
  - Import Sentry: `import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js'`
  - Call `initSentry()` immediately after dotenv
  - Add `app.use(sentryRequestHandler())` early in middleware
  - Add `app.use(sentryErrorHandler())` after all routes

- [ ] **Set user context in auth**
  - In routes/auth.js, import `setUserContext`
  - After successful login/register, call `setUserContext({ id, email, ... })`
  - On logout: `setUserContext(null)`

### ✅ Environment Configuration

- [ ] Create Sentry projects at [sentry.io](https://sentry.io)
  - One for Frontend (React)
  - One for Backend (Node.js)
  - Copy DSNs to .env files

- [ ] Test integrations locally
  - frontend: Trigger test error from UI
  - backend: Call test error endpoint
  - Verify errors appear in Sentry dashboard

---

## Example Integration Code

### Frontend (main.jsx)

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Initialize Sentry FIRST
import { initSentry } from './config/sentry.js'
initSentry()

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unknown error',
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div>Frontend error occurred</div>
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
```

### Backend (server.js)

```javascript
import dotenv from 'dotenv'
dotenv.config()

// Initialize Sentry FIRST
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js'
initSentry()

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import fileRoutes from './routes/files.js'

const app = express()

// Middleware
app.use(cors({ /* ... */ }))
app.use(express.json({ limit: '500mb' }))

// Sentry request tracking (early)
app.use(sentryRequestHandler())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/files', fileRoutes)

// Sentry error tracking (late)
app.use(sentryErrorHandler())

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`)
})

server.timeout = 600000
```

### Frontend (after login)

```javascript
import { setUserContext } from '../config/sentry.js'

const handleLoginSuccess = (user) => {
  // Set user context for error tracking
  setUserContext({
    id: user.id,
    email: user.email,
    username: user.email?.split('@')[0],
  })
  // ... rest of login logic
}

const handleLogout = () => {
  // Clear user context
  setUserContext(null)
  // ... rest of logout logic
}
```

---

## Summary

| Component | Status | Action |
|-----------|--------|--------|
| **Config files** | ✅ Ready | No changes needed |
| **Documentation** | ✅ Complete | Reference as-is |
| **Frontend init** | ❌ Missing | Add to main.jsx |
| **Backend init** | ❌ Missing | Add to server.js |
| **Environment DSN** | ❌ Missing | Set in .env |
| **User context** | ❌ Missing | Add after auth |
| **Sample rate** | ✅ Good | No changes needed |

**Priority:** 🔴 **CRITICAL** - Sentry won't capture any errors until frontend/backend are initialized

**Time to integrate:** ~15 minutes
