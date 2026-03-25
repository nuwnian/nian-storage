# Sentry Setup Checklist

Quick reference for integrating Sentry into your Nian Storage app.

## Quick Setup (10 minutes)

### 1. Create Sentry Account
```
https://sentry.io → Sign Up → Create 2 projects (Frontend + Backend)
```

### 2. Get Your DSNs
- Frontend: `https://xxxxx@sentry.io/123456`
- Backend: `https://xxxxx@sentry.io/789012`

### 3. Install Dependencies

**Frontend:**
```bash
cd frontend && npm install @sentry/react @sentry/tracing
```

**Backend:**
```bash
cd backend && npm install @sentry/node @sentry/profiling-node
```

### 4. Configure Environment Variables

**Frontend - Create `frontend/.env.local`:**
```env
VITE_SENTRY_DSN=<your-frontend-dsn>
VITE_APP_VERSION=1.0.0-dev
```

**Backend - Add to `backend/.env`:**
```env
SENTRY_DSN=<your-backend-dsn>
APP_VERSION=1.0.0-dev
```

### 5. Update main.jsx

Add at top of `frontend/src/main.jsx`:
```javascript
import { initSentry } from './config/sentry.js'
initSentry()
```

### 6. Update server.js

At top of `backend/server.js` (before imports):
```javascript
import dotenv from 'dotenv'
dotenv.config()
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './config/sentry.js'
initSentry()
```

After middleware setup:
```javascript
app.use(sentryRequestHandler())
// ... your routes ...
app.use(sentryErrorHandler())
```

### 7. Set User Context (Optional but Recommended)

In `frontend/src/pages/NianLogin.jsx` after login:
```javascript
import { setUserContext } from '../config/sentry.js'
setUserContext({ id: user.id, email: user.email })
```

In `backend/routes/auth.js`:
```javascript
import { setUserContext } from '../config/sentry.js'
setUserContext({ id: user.id, email: user.email })
```

### 8. Test
```bash
# Frontend: Click error button or throw exception in console
# Backend: Curl test-error endpoint
# Check Sentry dashboard for errors
```

---

## Files Created ✅

| File | Purpose |
|------|---------|
| `frontend/src/config/sentry.js` | Frontend Sentry configuration & helpers |
| `backend/config/sentry.js` | Backend Sentry configuration & helpers |
| `FRONTEND_SENTRY_SETUP.md` | Detailed frontend setup guide |
| `BACKEND_SENTRY_SETUP.md` | Detailed backend setup guide |
| `SENTRY_COMPLETE_SETUP.md` | Complete step-by-step guide |
| `.env.example.sentry` | Environment variable examples |

---

## Configuration Features Enabled

✅ Error Tracking - Captures all unhandled exceptions
✅ Performance Monitoring - Tracks request times, page loads
✅ Session Replay - Records user actions before errors (with privacy)
✅ Environment Isolation - Separates dev/prod errors
✅ User Context - Links errors to specific users
✅ Breadcrumbs - Tracks user actions leading to errors
✅ Multiple Integrations - Express, HTTP, Database tracking

---

## Environment-Specific Settings

| Setting | Development | Production |
|---------|------------|-----------|
| Sample Rate | 100% (1.0) | 10% (0.1) |
| Session Replay | 50% | 10% |
| Profile Rate | 100% (1.0) | 10% (0.1) |
| Debug Mode | Enabled | Disabled |

---

## Useful Commands

```bash
# Verify Sentry config is loaded (check console/logs)
npm run dev

# Test frontend error
# Open browser console → execute: throw new Error('test')

# Test backend error
curl http://localhost:3000/api/test-error

# View errors in Sentry dashboard
# https://sentry.io → Your Organization → Projects
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "DSN is invalid" | Copy correct DSN from Sentry dashboard |
| No errors appearing | Check DSN in .env files, restart dev server |
| Too many errors | Increase filtering in `beforeSend` function |
| Performance metrics missing | Ensure Performance Monitoring enabled in Sentry |
| Session replays not recording | Set `replaysSessionSampleRate > 0` |

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Set environment variables
3. ✅ Initialize Sentry in main.jsx and server.js
4. ✅ Test with a sample error
5. ✅ Add user context after login
6. ⏳ Deploy to production
7. ⏳ Set up Sentry alerts
8. ⏳ Monitor issues dashboard

---

## More Information

📖 Full Guide: [SENTRY_COMPLETE_SETUP.md](SENTRY_COMPLETE_SETUP.md)
🎯 Frontend Details: [FRONTEND_SENTRY_SETUP.md](FRONTEND_SENTRY_SETUP.md)
🎯 Backend Details: [BACKEND_SENTRY_SETUP.md](BACKEND_SENTRY_SETUP.md)
🔗 Sentry Docs: https://docs.sentry.io/
