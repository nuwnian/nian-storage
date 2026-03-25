# Debug: 401 Invalid Token Error

## Understanding the Error

**Error Location:** `index-BZzwZftW.js:271` (minified JavaScript)  
**Error Type:** XMLHttpRequest failed with 401  
**Message:** "Invalid token"  
**Context:** Upload operation

---

## Quick Diagnosis Checklist

### 1. Frontend - Check Token Storage
```javascript
// Run in browser console (F12)
// Check if token exists
localStorage.getItem('supabase.auth.token')

// Output should look like:
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// If empty or null => TOKEN NOT STORED
```

### 2. Frontend - Check Token in Request
```javascript
// In DevTools Network tab:
1. Initiate upload
2. Click on failed request
3. Go to "Headers" tab
4. Look for: Authorization: Bearer {token}

// Should show:
// Authorization: Bearer eyJhbG...

// If missing => NOT BEING SENT
```

### 3. Backend - Check Auth Middleware
```javascript
// In backend/server.js
// Verify middleware order:

app.use(cors())
app.use(express.json())
app.use(sentryRequestHandler())  // ← Sentry first

// Then BEFORE routes:
app.use(authenticateToken)  // ← This missing?

app.use('/api/files', filesRoutes)
app.use('/api/auth', authRoutes)

// If auth middleware missing => 401 not checked
```

### 4. Check Token Format
Your token should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...`

```javascript
// In console:
const token = localStorage.getItem('supabase.auth.token')
const parts = token.split('.')
console.log(`Prefix: ${parts[0].substring(0, 20)}...`)
console.log(`Parts: ${parts.length}`)  // Should be 3 for JWT

// Valid JWT must have 3 parts separated by dots
```

---

## Common Solutions

### ❌ Problem 1: Token Not Being Retrieved After Login

**Symptom:** 
```javascript
localStorage.getItem('supabase.auth.token') // Returns null
```

**Fix in `frontend/src/pages/NianLogin.jsx`:**
```javascript
import { setUserContext } from '../config/sentry.js'

const handleLoginSuccess = async (user, session) => {
  // Store token BEFORE redirect
  if (session?.access_token) {
    localStorage.setItem('supabase.auth.token', session.access_token)
    
    // Set user context for Sentry
    setUserContext({
      id: user.id,
      email: user.email,
    })
  }
  
  // Then redirect
  window.location.href = '/dashboard'
}
```

---

### ❌ Problem 2: Token Not Sent in Upload Request

**Symptom:** 
```
Authorization header missing in Network tab
```

**Fix in upload code:**
```javascript
const uploadFile = async (file) => {
  const token = localStorage.getItem('supabase.auth.token')
  
  if (!token) {
    throw new Error('Not authenticated')
  }
  
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,  // ← MUST INCLUDE
    },
    body: formData,
  })
  
  if (response.status === 401) {
    console.error('Token invalid or expired')
    // Redirect to login
  }
  
  return response.json()
}
```

---

### ❌ Problem 3: Backend Not Checking Auth

**Symptom:** 
```
Backend accepts requests without token
```

**Fix in `backend/routes/files.js`:**
```javascript
import express from 'express'

const router = express.Router()

// Middleware to check token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1]  // Extract "Bearer {token}"
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  // Verify token with Supabase
  try {
    const user = verifyToken(token)  // Your verification logic
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Apply middleware to protected routes
router.post('/upload', authenticateToken, async (req, res) => {
  // This will only run if token is valid
  // req.user contains authenticated user
})

export default router
```

---

### ❌ Problem 4: Token Expired

**Symptom:** 
```javascript
Token valid at login, but 401 after 1 hour
```

**Fix - Add Token Refresh:**
```javascript
// Check if token expired
const isTokenExpired = (token) => {
  try {
    const parts = token.split('.')
    const payload = JSON.parse(atob(parts[1]))
    const expiryTime = payload.exp * 1000  // Convert to ms
    return Date.now() >= expiryTime
  } catch {
    return true
  }
}

// Before making request:
let token = localStorage.getItem('supabase.auth.token')

if (isTokenExpired(token)) {
  // Call refresh endpoint
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (response.ok) {
    const { access_token } = await response.json()
    localStorage.setItem('supabase.auth.token', access_token)
    token = access_token
  } else {
    // Redirect to login
    window.location.href = '/login'
  }
}

// Now use fresh token
return fetch('/api/files/upload', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

---

### ❌ Problem 5: Google OAuth Token Not Handled

**Symptom:** 
```
Login with Google works, but upload fails
```

**Fix in OAuth callback:**
```javascript
const handleGoogleOAuthCallback = async (googleToken) => {
  // Google returns different token format
  // Exchange it for Supabase session token
  
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: googleToken,
  })
  
  if (error) throw error
  
  // Store SUPABASE token, not Google token
  localStorage.setItem('supabase.auth.token', data.session.access_token)
}
```

---

## Sentry Integration for Better Error Logging

Your error shows up in browser, but backend doesn't see it. Enable Sentry error capture:

### Frontend (React)
```javascript
import { captureError } from '../config/sentry.js'

const uploadFile = async (file) => {
  try {
    const token = localStorage.getItem('supabase.auth.token')
    
    const response = await fetch('/api/files/upload', {
      headers: { 'Authorization': `Bearer ${token}` },
      body: file,
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }
  } catch (error) {
    // THIS SENDS ERROR TO SENTRY
    captureError(error, {
      file_name: file.name,
      operation: 'upload',
      has_token: !!localStorage.getItem('supabase.auth.token'),
    })
    throw error
  }
}
```

### Backend (Node.js)
```javascript
import { captureError } from '../config/sentry.js'

router.post('/upload', authenticateToken, async (req, res) => {
  try {
    // Upload logic
  } catch (error) {
    captureError(error, {
      user_id: req.user?.id,
      endpoint: '/api/files/upload',
      token_valid: !!req.user,
    })
    res.status(500).json({ error: 'Upload failed' })
  }
})
```

---

## Step-by-Step Debugging

### Step 1: Open Browser DevTools (F12)
1. Go to "Console" tab
2. Run: `localStorage.getItem('supabase.auth.token')`
3. Check if token exists

### Step 2: Network Tab Analysis
1. Click "Network" tab
2. Attempt upload
3. Find failed request (red)
4. Click it
5. Go to "Headers" section
6. Look for `Authorization: Bearer ...`
7. If missing → problem is frontend not sending token

### Step 3: Check Backend Logs
1. Look at backend console output
2. Check Sentry dashboard for errors
3. Should show 401 errors

### Step 4: Verify Token Validity
1. Copy token from localStorage
2. Go to https://jwt.io
3. Paste token in "Encoded" field
4. Check `exp` field (expiration timestamp)
5. If past current time → token expired

---

## Most Likely Causes (in order)

1. ✅ **60%** - Token not being stored after login
2. ✅ **20%** - Token not sent in request headers
3. ✅ **10%** - Backend middleware missing auth check
4. ✅ **5%** - Token expired
5. ✅ **5%** - OAuth token format issue

---

## Quick Fix Summary

**Do These 3 Things:**

1. **Check DevTools Console:**
   ```javascript
   // Copy/paste this in console
   console.log('Token:', localStorage.getItem('supabase.auth.token')?.substring(0, 20) + '...')
   ```

2. **Check Network Tab:**
   - Try upload
   - Look for failed request
   - Check if Authorization header present

3. **Enable Sentry Logging:**
   - Make sure SENTRY_DSN is set in `.env.local`
   - Check Sentry dashboard for detailed error info
   - Look for `captureError` calls in error handlers

---

## Next Steps

1. Run the diagnostic checks above
2. Share which check fails
3. I'll help you fix the specific issue

Which of these would you like me to help debug first?
- [ ] Check if token is stored?
- [ ] Check if token is sent in requests?
- [ ] Fix backend auth middleware?
- [ ] Add token refresh logic?
- [ ] Enable better error logging with Sentry?
