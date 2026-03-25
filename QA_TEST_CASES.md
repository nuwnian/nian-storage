# Nian Storage - Enterprise QA Test Cases

**Application:** Nian Storage v1.0.0  
**Test Type:** Functional, Security, Performance, Integration  
**Platform:** Web (React) + Backend (Node.js)  
**Date:** March 25, 2026

---

## Test Suite Overview

| Category | Test Cases | Priority | Status |
|----------|-----------|----------|--------|
| Authentication | 8 | P0 | To Test |
| File Operations | 12 | P0 | To Test |
| Search & Filter | 6 | P1 | To Test |
| Performance | 5 | P1 | To Test |
| Security | 8 | P0 | To Test |
| Error Handling | 6 | P1 | To Test |
| **Total** | **45** | - | - |

---

## 1. AUTHENTICATION TEST CASES

### TC-AUTH-001: Valid Email/Password Login
**Objective:** Verify user can login with valid credentials  
**Precondition:** User account exists in Supabase  
**Steps:**
1. Navigate to login page
2. Enter valid email
3. Enter valid password
4. Click "Login" button
**Expected Result:**
- ✅ User authenticated successfully
- ✅ Redirected to storage dashboard
- ✅ Auth token stored in localStorage
- ✅ User profile displayed
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-002: Invalid Password Login
**Objective:** Verify system rejects invalid password  
**Precondition:** Valid user account exists  
**Steps:**
1. Navigate to login page
2. Enter valid email
3. Enter wrong password
4. Click "Login" button
**Expected Result:**
- ✅ Error message: "Invalid credentials"
- ✅ User NOT authenticated
- ✅ Remains on login page
- ✅ No token stored
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-003: Non-existent Email Login
**Objective:** Verify system handles non-existent user  
**Steps:**
1. Navigate to login page
2. Enter non-existent email
3. Enter any password
4. Click "Login"
**Expected Result:**
- ✅ Error message displayed
- ✅ Login fails gracefully
- ✅ No sensitive data leakage
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-004: Google OAuth Login
**Objective:** Verify Google OAuth authentication works  
**Steps:**
1. Click "Login with Google"
2. Complete Google OAuth flow
3. Authorize app access
**Expected Result:**
- ✅ User authenticated
- ✅ Profile synced from Google
- ✅ Redirected to dashboard
- ✅ User data stored in Supabase
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-005: Session Persistence
**Objective:** Verify user session persists after page refresh  
**Precondition:** User logged in  
**Steps:**
1. Login with valid credentials
2. Refresh page (F5)
3. Wait for page load
**Expected Result:**
- ✅ User still authenticated
- ✅ Dashboard loads without re-login
- ✅ Token valid and refreshed
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-006: Session Expiration
**Objective:** Verify expired sessions are handled  
**Precondition:** User logged in  
**Steps:**
1. Login with valid credentials
2. Wait 60+ minutes (or simulate token expiration)
3. Attempt to access protected resource
**Expected Result:**
- ✅ Session expired gracefully
- ✅ Redirected to login page
- ✅ Error message: "Session expired"
- ✅ Can re-login without issues
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-007: Logout Functionality
**Objective:** Verify logout clears session  
**Precondition:** User logged in  
**Steps:**
1. Navigate to dashboard
2. Click logout/hamburger menu
3. Click "Logout"
**Expected Result:**
- ✅ Token removed from localStorage
- ✅ Redirected to login page
- ✅ Cannot access dashboard without login
- ✅ New login required
**Priority:** P0 | **Status:** To Test

---

### TC-AUTH-008: Multiple Tab Session
**Objective:** Verify multiple tabs share same session  
**Precondition:** User logged in one tab  
**Steps:**
1. Login in Tab 1
2. Open app in Tab 2
3. Verify both tabs authenticated
4. Logout in Tab 1
5. Check Tab 2
**Expected Result:**
- ✅ Both tabs share auth state
- ✅ Logout in one tab affects others
- ✅ No cross-tab conflicts
**Priority:** P1 | **Status:** To Test

---

## 2. FILE OPERATIONS TEST CASES

### TC-FILE-001: Single File Upload
**Objective:** Verify user can upload single file  
**Precondition:** User logged in, file < 100MB  
**Steps:**
1. Click "Upload" or drag file
2. Select image file (e.g., 5MB)
3. Confirm upload
4. Wait for completion
**Expected Result:**
- ✅ File uploaded successfully
- ✅ Progress bar shows 100%
- ✅ File appears in dashboard
- ✅ File metadata correct (name, size, date)
- ✅ File stored in Cloudflare R2
**Priority:** P0 | **Status:** To Test

---

### TC-FILE-002: Multiple File Upload
**Objective:** Verify batch file upload works  
**Precondition:** User logged in  
**Steps:**
1. Select multiple files (3-5 files)
2. Drag and drop to upload area
3. Wait for all uploads complete
**Expected Result:**
- ✅ All files uploaded
- ✅ Progress shown for each file
- ✅ All files appear in list
- ✅ No conflicts or overwrite
**Priority:** P0 | **Status:** To Test

---

### TC-FILE-003: File Download
**Objective:** Verify user can download file  
**Precondition:** File uploaded, user logged in  
**Steps:**
1. Click on file in dashboard
2. Click download button
3. Save file locally
**Expected Result:**
- ✅ Download initiated
- ✅ File saved with correct name
- ✅ File integrity matches original
- ✅ No corrupted data
**Priority:** P0 | **Status:** To Test

---

### TC-FILE-004: File Preview/View
**Objective:** Verify inline file viewer works  
**Precondition:** Image file uploaded  
**Steps:**
1. Click file in dashboard
2. File preview opens
3. View image inline
4. Close preview
**Expected Result:**
- ✅ Preview modal opens
- ✅ Image displays correctly
- ✅ No quality loss
- ✅ Modal closes cleanly
**Priority:** P0 | **Status:** To Test

---

### TC-FILE-005: File Delete
**Objective:** Verify file deletion works correctly  
**Precondition:** File uploaded  
**Steps:**
1. Right-click file or click delete button
2. Confirm deletion
3. Wait for completion
**Expected Result:**
- ✅ File removed from dashboard
- ✅ File removed from R2 storage
- ✅ Database metadata deleted
- ✅ Cannot download deleted file
- ✅ Confirmation toast/message
**Priority:** P0 | **Status:** To Test

---

### TC-FILE-006: File Rename
**Objective:** Verify file rename functionality  
**Precondition:** File uploaded  
**Steps:**
1. Click file options
2. Select "Rename"
3. Enter new name
4. Click save
**Expected Result:**
- ✅ File renamed in dashboard
- ✅ Metadata updated in Supabase
- ✅ File accessible with new name
**Priority:** P1 | **Status:** To Test

---

### TC-FILE-007: File Compression
**Objective:** Verify image compression on upload  
**Precondition:** Large image file (e.g., 50MB)  
**Steps:**
1. Upload large image
2. Monitor file size
3. Check R2 storage size
**Expected Result:**
- ✅ File compressed automatically
- ✅ Compressed size < original
- ✅ Quality acceptable
- ✅ Reduced storage cost
**Priority:** P1 | **Status:** To Test

---

### TC-FILE-008: Large File Upload (Edge Case)
**Objective:** Verify system handles large files  
**Precondition:** Large file 100MB+  
**Steps:**
1. Attempt to upload 100MB+ file
2. Monitor progress
3. Check for timeout/error handling
**Expected Result:**
- ✅ Upload succeeds or gracefully fails
- ✅ Clear error message if unsupported
- ✅ No system crash
- ✅ User feedback on limitation
**Priority:** P2 | **Status:** To Test

---

### TC-FILE-009: Duplicate File Upload
**Objective:** Verify system handles duplicate files  
**Precondition:** File already uploaded  
**Steps:**
1. Upload same file again
2. Check dashboard
**Expected Result:**
- ✅ New version uploaded OR
- ✅ User prompted for action (overwrite/rename)
- ✅ Consistent behavior
**Priority:** P1 | **Status:** To Test

---

### TC-FILE-010: Upload with Special Characters
**Objective:** Verify files with special names upload  
**Precondition:** User logged in  
**Steps:**
1. Upload file: "Test-file_@2024 (1).txt"
2. Check metadata
**Expected Result:**
- ✅ File uploads with full name
- ✅ Special characters preserved
- ✅ URL encoded correctly
- ✅ No sanitization issues
**Priority:** P1 | **Status:** To Test

---

### TC-FILE-011: Upload with No FileType Extension
**Objective:** Verify system handles files without extension  
**Steps:**
1. Upload file without extension
2. Verify handling
**Expected Result:**
- ✅ File accepted
- ✅ Type detected correctly
- ✅ No errors
**Priority:** P2 | **Status:** To Test

---

### TC-FILE-012: Bulk Delete
**Objective:** Verify deleting multiple files at once  
**Precondition:** Multiple files uploaded  
**Steps:**
1. Select multiple files (checkbox)
2. Click "Delete Selected"
3. Confirm deletion
**Expected Result:**
- ✅ All selected files deleted
- ✅ Dashboard updated
- ✅ R2 storage cleared
- ✅ Single confirmation enough
**Priority:** P1 | **Status:** To Test

---

## 3. SEARCH & FILTER TEST CASES

### TC-SEARCH-001: Search by Filename
**Objective:** Verify filename search works  
**Precondition:** Multiple files uploaded  
**Steps:**
1. Type filename in search box
2. View results
**Expected Result:**
- ✅ Matching files displayed
- ✅ Case-insensitive search
- ✅ Partial match works
- ✅ Real-time results
**Priority:** P1 | **Status:** To Test

---

### TC-SEARCH-002: Filter by File Type
**Objective:** Verify file type filtering  
**Steps:**
1. Click filter dropdown
2. Select "Images" or file type
3. View results
**Expected Result:**
- ✅ Only matching type shown
- ✅ Count updates
- ✅ Multiple filters work
**Priority:** P1 | **Status:** To Test

---

### TC-SEARCH-003: Filter by Date Range
**Objective:** Verify date range filter  
**Steps:**
1. Click date filter
2. Select start and end date
3. Apply
**Expected Result:**
- ✅ Files within range shown
- ✅ Others hidden
- ✅ Count accurate
**Priority:** P1 | **Status:** To Test

---

### TC-SEARCH-004: Combined Search & Filters
**Objective:** Verify multiple filters together  
**Steps:**
1. Search by name
2. Filter by type
3. Filter by date
**Expected Result:**
- ✅ All filters applied
- ✅ Results correct intersection
- ✅ No conflicts
**Priority:** P1 | **Status:** To Test

---

### TC-SEARCH-005: Clear All Filters
**Objective:** Verify filter reset  
**Steps:**
1. Apply multiple filters
2. Click "Clear All"
3. Check results
**Expected Result:**
- ✅ All filters removed
- ✅ All files visible again
- ✅ One-click clear works
**Priority:** P2 | **Status:** To Test

---

### TC-SEARCH-006: Empty Search Results
**Objective:** Verify handling of no results  
**Steps:**
1. Search for non-existent file
2. Check UI
**Expected Result:**
- ✅ Empty state message shown
- ✅ "No files found" displayed
- ✅ User can clear search
- ✅ UI doesn't break
**Priority:** P2 | **Status:** To Test

---

## 4. PERFORMANCE TEST CASES

### TC-PERF-001: Dashboard Load Time
**Objective:** Verify dashboard loads quickly  
**Precondition:** User logged in, 100+ files in storage  
**Steps:**
1. Measure page load time
2. Check Time to Interactive
3. Verify smooth rendering
**Expected Result:**
- ✅ Load time < 3 seconds
- ✅ TTI < 4 seconds
- ✅ Smooth scrolling
- ✅ No lag on interaction
**Priority:** P1 | **Status:** To Test

---

### TC-PERF-002: Search Response Time
**Objective:** Verify search performs well  
**Steps:**
1. Search with 1000+ files
2. Measure response time
**Expected Result:**
- ✅ Results appear < 1 second
- ✅ No UI freeze
- ✅ Debouncing works
**Priority:** P1 | **Status:** To Test

---

### TC-PERF-003: Concurrent Uploads
**Objective:** Verify system handles multiple simultaneous uploads  
**Steps:**
1. Upload 10 files simultaneously
2. Monitor server response
3. Check for conflicts
**Expected Result:**
- ✅ All files upload successfully
- ✅ No race conditions
- ✅ Server handles load
- ✅ All files complete
**Priority:** P1 | **Status:** To Test

---

### TC-PERF-004: Large Metadata Load
**Objective:** Verify system scales with large datasets  
**Precondition:** 10,000+ files in system  
**Steps:**
1. Load dashboard with many files
2. Measure rendering time
3. Check pagination/virtualization
**Expected Result:**
- ✅ Loads within 5 seconds
- ✅ Pagination works
- ✅ Virtual scrolling efficient
- ✅ No memory leak
**Priority:** P2 | **Status:** To Test

---

### TC-PERF-005: Slow Network Simulation
**Objective:** Verify app works on slow connections  
**Prerequisites:** Use browser DevTools throttling (3G)  
**Steps:**
1. Enable 3G throttling in DevTools
2. Perform normal operations
3. Upload file
4. Check UX
**Expected Result:**
- ✅ App still usable
- ✅ Clear loading states
- ✅ Graceful degradation
- ✅ No timeout errors
**Priority:** P1 | **Status:** To Test

---

## 5. SECURITY TEST CASES

### TC-SEC-001: SQL Injection Prevention
**Objective:** Verify SQL injection attacks blocked  
**Steps:**
1. Attempt SQL injection in search: `'; DROP TABLE files;--`
2. Try in username field: `admin' OR '1'='1`
**Expected Result:**
- ✅ Input sanitized
- ✅ Error handled safely
- ✅ No data loss
- ✅ Attack logged
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-002: XSS Prevention
**Objective:** Verify XSS attacks blocked  
**Steps:**
1. Try XSS in filename: `<img src=x onerror=alert('XSS')>`
2. Upload and view
**Expected Result:**
- ✅ Script not executed
- ✅ HTML escaped
- ✅ File displays safely
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-003: CSRF Protection
**Objective:** Verify CSRF tokens work  
**Steps:**
1. Check requests for CSRF token
2. Modify token in request
3. Submit
**Expected Result:**
- ✅ Token present in forms
- ✅ Invalid token rejected
- ✅ Error message clear
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-004: Authentication Bypass
**Objective:** Verify cannot bypass auth  
**Steps:**
1. Try accessing `/dashboard` without auth
2. Try modifying JWT token
3. Try accessing other user's files
**Expected Result:**
- ✅ Redirected to login
- ✅ Invalid JWT rejected
- ✅ 403 Forbidden on unauthorized
- ✅ Audit logged
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-005: File Access Control
**Objective:** Verify users only access own files  
**Precondition:** Multiple users in system  
**Steps:**
1. Get file ID from another user
2. Try direct API call to download
3. Check response
**Expected Result:**
- ✅ Access denied (403)
- ✅ User owns file check
- ✅ No data leakage
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-006: Password Security
**Objective:** Verify passwords handled securely  
**Steps:**
1. Login
2. Check network tab for password
3. Check localStorage
**Expected Result:**
- ✅ Password never sent in plaintext
- ✅ HTTPS used
- ✅ Password not stored
- ✅ Token stored encrypted
**Priority:** P0 | **Status:** To Test

---

### TC-SEC-007: API Rate Limiting
**Objective:** Verify rate limiting works  
**Steps:**
1. Send 100 rapid requests
2. Check response
**Expected Result:**
- ✅ Requests throttled after limit
- ✅ 429 Too Many Requests returned
- ✅ User-friendly error
- ✅ Limits protect against DoS
**Priority:** P1 | **Status:** To Test

---

### TC-SEC-008: Sentry Security Logging
**Objective:** Verify errors logged securely  
**Steps:**
1. Trigger error by unauthorized access
2. Check Sentry dashboard
3. Verify logs don't contain sensitive data
**Expected Result:**
- ✅ Errors logged
- ✅ No passwords in logs
- ✅ No API keys exposed
- ✅ User context captured safely
**Priority:** P1 | **Status:** To Test

---

## 6. ERROR HANDLING TEST CASES

### TC-ERR-001: Network Timeout on Upload
**Objective:** Verify graceful handling of upload failure  
**Precondition:** Simulate slow/failing network  
**Steps:**
1. Start upload
2. Kill network (DevTools)
3. Wait for timeout
**Expected Result:**
- ✅ Error message displayed
- ✅ "Upload failed, retry?" option
- ✅ Can retry upload
- ✅ Partial upload cleaned up
**Priority:** P1 | **Status:** To Test

---

### TC-ERR-002: Server Error (500)
**Objective:** Verify handling of server errors  
**Steps:**
1. Trigger API endpoint that errors
2. Check user feedback
**Expected Result:**
- ✅ Friendly error message
- ✅ Technical details in logs
- ✅ Error ID for support
- ✅ User can retry
**Priority:** P1 | **Status:** To Test

---

### TC-ERR-003: Database Connection Error
**Objective:** Verify app handles DB down  
**Steps:**
1. Simulate DB connection failure
2. Try to login/upload
**Expected Result:**
- ✅ Error message (not backend error)
- ✅ App doesn't crash
- ✅ Graceful fallback
- ✅ Logged in Sentry
**Priority:** P1 | **Status:** To Test

---

### TC-ERR-004: R2 Storage Unavailable
**Objective:** Verify app handles storage failure  
**Steps:**
1. Simulate R2 API failure
2. Try upload
**Expected Result:**
- ✅ Error: "Storage unavailable"
- ✅ Transaction rolled back
- ✅ No orphaned records
- ✅ User can retry later
**Priority:** P1 | **Status:** To Test

---

### TC-ERR-005: Invalid File Type
**Objective:** Verify unsupported files rejected  
**Steps:**
1. Upload .exe, .bat, .cmd file
2. Check validation
**Expected Result:**
- ✅ File rejected
- ✅ Error message clear
- ✅ Accepted types listed
- ✅ No security risk
**Priority:** P1 | **Status:** To Test

---

### TC-ERR-006: Disk Quota Exceeded
**Objective:** Verify when user hits storage limit  
**Precondition:** User at 100% quota  
**Steps:**
1. Try upload new file
2. Check response
**Expected Result:**
- ✅ Error: "Storage quota exceeded"
- ✅ Upgrade prompt shown
- ✅ User can delete to free space
- ✅ Graceful degradation
**Priority:** P1 | **Status:** To Test

---

## Test Execution Strategy

### Phase 1: Unit & Integration (Week 1)
- Authentication flows
- File CRUD operations
- Search & filter logic
- Error handling

### Phase 2: Performance (Week 2)
- Load testing with 1000+ files
- Concurrent operation testing
- Network throttling scenarios

### Phase 3: Security (Week 2)
- OWASP Top 10 vulnerability scanning
- Penetration testing
- Security audit

### Phase 4: UAT (Week 3)
- Real user scenarios
- Cross-browser testing
- Mobile responsiveness

---

## Test Data Requirements

**Test Users:**
- User 1: Standard free account
- User 2: Premium account
- User 3: Admin account

**Test Files:**
- Small images (< 1MB)
- Large images (50-100MB)
- Documents (PDF, DOC, XLSX)
- Videos (mp4, webm)
- Special characters in names
- Unicode filenames

**Test Coverage Target:** 80%+ code coverage

---

## Success Criteria

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Test Pass Rate | 95%+ | - | TBD |
| Critical Bugs | 0 | - | TBD |
| Performance (load) | < 3s | - | TBD |
| Code Coverage | 80%+ | - | TBD |
| Security Audit | Pass | - | TBD |
| User Acceptance | 4.5+/5 | - | TBD |

---

## Defect Tracking Template

```
Bug ID: BUG-XXX
Title: [Clear description]
Severity: Critical/High/Medium/Low
Steps to Reproduce:
1. 
2. 
3. 
Expected Result:
Actual Result:
Attachment: [Screenshot/Video]
Assigned to: [Developer]
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | - | - | - |
| Dev Lead | - | - | - |
| Product Owner | - | - | - |
| Release Manager | - | - | - |

---

**End of QA Test Case Document**
