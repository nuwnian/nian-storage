# Testing Guide - Nian Storage Backend

## Overview
The Nian Storage backend uses **Jest** for unit and integration testing. All tests are passing with comprehensive coverage of the Supabase Storage integration.

## Test Setup

### Installation
Jest and testing dependencies have been installed:
```bash
npm install --save-dev jest babel-jest @babel/preset-env supertest
```

### Configuration Files
- **jest.config.js** - Jest configuration with Babel transformer
- **babel.config.js** - Babel configuration for ES module transformation

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Suites

### 1. Supabase Storage Service Tests (`services/supabase-storage.test.js`)
Tests the core storage service functions with 12 comprehensive test cases:

**Upload Tests:**
- ✅ Should upload file successfully
- ✅ Should handle upload errors gracefully
- ✅ Should include timestamp in file key to avoid conflicts

**Download Tests:**
- ✅ Should download file successfully
- ✅ Should handle download errors

**Delete Tests:**
- ✅ Should delete file successfully
- ✅ Should handle delete errors
- ✅ Should handle multiple file deletion

**URL Extraction Tests:**
- ✅ Should extract key from Supabase Storage URL
- ✅ Should handle URLs with nested paths
- ✅ Should handle URLs with special characters in filename
- ✅ Should return URL if bucket not found
- ✅ Should handle relative paths

### 2. File Routes Integration Tests (`routes/files.test.js`)
Tests HTTP endpoints with 12 test cases covering authentication and authorization:

**Upload Endpoint (`POST /api/files`):**
- ✅ Should reject upload without token
- ✅ Should reject upload with invalid token
- ✅ Should reject upload without file

**Download/Serve Endpoint (`GET /api/files/:id/serve`):**
- ✅ Should reject serve without token
- ✅ Should reject serve with invalid token

**Text Content Endpoint (`GET /api/files/:id/content`):**
- ✅ Should reject content request without token
- ✅ Should reject content request with invalid token

**Delete Endpoint (`DELETE /api/files/:id`):**
- ✅ Should reject delete without token
- ✅ Should reject delete with invalid token

**List Files Endpoint (`GET /api/files`):**
- ✅ Should reject list without token
- ✅ Should reject list with invalid token

## Test Results

```
Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        ~4 seconds
```

## Mocking Strategy

### Mocked Dependencies
1. **Supabase Configuration** - Mocked auth tokens and database operations
2. **Supabase Storage Service** - Mocked file upload/download/delete operations
3. **URL Extraction** - Mocked to focus on routing logic

### Mocking Example
```javascript
jest.mock('../config/supabase.js');
jest.mock('../services/supabase-storage.js', () => ({
  uploadToSupabaseStorage: jest.fn().mockResolvedValue({
    key: 'users/123/1234567890-test.txt',
    url: 'https://example.supabase.co/...',
  }),
}));
```

## Test Coverage

Current test coverage focuses on:
- ✅ Authentication and authorization
- ✅ Error handling for all storage operations
- ✅ URL extraction and path handling
- ✅ File upload, download, and deletion flow
- ✅ Storage service integration
- ✅ Token validation for protected routes

## Adding New Tests

### Unit Tests
1. Create a new `.test.js` file in the `services/` directory
2. Import the function to test
3. Mock dependencies using `jest.mock()`
4. Write test cases using `describe()` and `it()`

### Integration Tests
1. Create a new `.test.js` file in the `routes/` directory
2. Set up Express app with the router to test
3. Use `supertest` for HTTP requests
4. Mock Supabase operations as needed

### Example Test Template
```javascript
describe('MyFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something specific', async () => {
    const result = await myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle errors', async () => {
    await expect(myFunction('bad-input')).rejects.toThrow('Error message');
  });
});
```

## Debugging Tests

### Run specific test file
```bash
npx jest services/supabase-storage.test.js
```

### Run tests matching a pattern
```bash
npx jest --testNamePattern="upload"
```

### Run with verbose output
```bash
npx jest --verbose
```

### Enable Node debugger
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

To add these tests to CI/CD pipeline, add to your workflow:
```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Best Practices

1. ✅ **Test behavior, not implementation** - Focus on what the function does, not how
2. ✅ **Use descriptive test names** - Test names should clearly describe what is being tested
3. ✅ **Mock external dependencies** - Always mock Supabase and external services
4. ✅ **Test error cases** - Test both happy path and error scenarios
5. ✅ **Keep tests isolated** - Clear mocks before each test
6. ✅ **One assertion per test** - Focus on one behavior per test when possible

## Future Improvements

- [ ] Add E2E tests with actual Supabase Storage bucket
- [ ] Add performance benchmarks for large file uploads
- [ ] Add tests for concurrent file operations
- [ ] Add tests for rate limiting and quota checks
- [ ] Increase coverage to 100%
