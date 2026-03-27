# 🐛 File Upload Troubleshooting Guide

## Current Status ✅
- **Backend**: Fixed and running on port 5000
- **Frontend**: Running on port 3000  
- **Upload Endpoint**: Receiving requests and validating tokens properly
- **Bug Fixed**: All undefined variable references in backend/routes/files.js

## The Real Issue Found 🔍

After testing, we discovered:

1. ✅ **Backend upload endpoint IS working** - it receives requests and validates tokens
2. ✅ **Frontend code IS correct** - it has proper upload handlers and drag-drop
3. ✅ **Database & R2 ARE connected** - credentials verified
4. ❌ **But uploads are arriving WITHOUT token**

This means the **frontend is not sending the token in the Authorization header** when a user is logged in.

## How to Test & Debug

### Option 1: Quick Browser Console Test (RECOMMENDED)

1. Go to **http://localhost:3000**
2. **Log in** with: `yulfa.anni531@gmail.com`
3. Press **F12** to open Developer Tools
4. Click on **Console** tab
5. Copy this code and paste it in console, then press Enter:

```javascript
// Check if token exists
const token = localStorage.getItem('supabase.auth.token');
console.log('Token found:', !!token);
console.log('Token value (first 50 chars):', token?.substring(0, 50));

// Try upload
const formData = new FormData();
formData.append('file', new Blob(['test'], {type: 'text/plain'}), 'test.txt');
fetch('http://localhost:5000/api/files', {
  method: 'POST',
  headers: token ? {'Authorization': `Bearer ${token}`} : {},
  body: formData
}).then(r => r.json()).then(d => console.log('Response:', d));
```

### Option 2: Check Network Tab

1. Log in to http://localhost:3000
2. Open DevTools (F12) → **Network** tab
3. Try uploading a file via drag-and-drop or file picker
4. Look for **POST /api/files** request
5. Click on it and check:
   - **Headers** tab:  Look for `Authorization: Bearer ...`
   - **Response** tab: See error message

### Option 3: Check Backend Logs

The backend terminal should show logs like:
```
POST /api/files
[AUTH] [Token status here]
[UPLOAD] [Upload details or errors]
```

If you don't see `[AUTH]` logs, the request isn't reaching the backend.
If you see `[AUTH] No token provided`, check **Option 1** above.

## Common Issues & Solutions

### Issue 1: Upload shows "401 Unauthorized"
**Cause**: Token not being sent
**Solution**: 
- Log in again  
- Check token in localStorage: `localStorage.getItem('supabase.auth.token')`
- Refresh the page after logging in

### Issue 2: Upload shows "500 Internal Server Error"  
**Cause**: Backend error processing the file
**Solution**:
- Check backend terminal for `[UPLOAD] ❌` error messages
- Verify file size isn't too large
- Confirm R2 credentials (already verified ✅)

### Issue 3: Upload appears to work but file doesn't show up
**Cause**: File saved but frontend not updated
**Solution**:
- Refresh page with F5
- Check database directly if needed

### Issue 4: No "POST /api/files" requests in DevTools Network tab
**Cause**: Frontend not sending request at all
**Solution**:
- Check frontend console (`F12 → Console`) for JavaScript errors
- Verify `[UPLOAD DEBUG]` and `[UPLOAD XHR]` logs appear when trying to upload
- Check if upload zone is displaying correctly

## Quick Fix Checklist ✓

- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] User is logged in (check localStorage for token)
- [ ] Token exists and has length >100 characters
- [ ] Try uploading a small text file first (no images)
- [ ] Check browser console for `[UPLOAD XHR]` messages
- [ ] Check backend terminal for `[UPLOAD]` or `[AUTH]` logs

## Files Modified in Recent Fix

The backend file upload handler was fixed:
- **File**: `backend/routes/files.js`
- **Lines**: 247-360
- **Issue**: Variables `originalname`, `mimetype`, `buffer`, `size` were undefined
- **Fix**: Changed to `req.file.originalname`, `req.file.mimetype`, etc.

## Next Steps

1. **Test upload immediately** using Option 1 above
2. **Share what happens**:
   - Does console show token? (✅ or ❌)
   - What error does upload return? (401/400/500/201?)
   - What backend logs appear?
3. **Based on results**, we'll know exactly what to fix next

---

**Note**: The infrastructure is solid! The issue is now about getting the token properly transmitted from frontend to backend when uploading.
