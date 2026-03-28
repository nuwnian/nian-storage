/**
 * Centralized API configuration and utilities
 * Eliminates code duplication across components
 */

// Centralized API URL configuration (used in both NianLogin and NianStorage)
export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:5000');

/**
 * Reusable API call wrapper with automatic token handling
 * Eliminates repeated fetch patterns throughout the app
 * 
 * @param {string} endpoint - API endpoint (e.g., '/api/files')
 * @param {Object} options - Fetch options
 * @param {string} options.token - Authorization token
 * @param {string} options.method - HTTP method (default: GET)
 * @param {Object} options.body - Request body (auto-converted to JSON)
 * @param {Object} options.headers - Additional headers
 * @returns {Promise<Response>} Fetch response
 * 
 * @example
 * // Simple GET with token
 * const response = await apiCall('/api/auth/me', { token });
 * 
 * // POST with body
 * const response = await apiCall('/api/files', { 
 *   token, 
 *   method: 'POST',
 *   body: { file_name: 'test.txt' }
 * });
 */
export async function apiCall(endpoint, options = {}) {
  const {
    token,
    method = 'GET',
    body,
    headers: customHeaders = {},
  } = options;

  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add authorization header if token provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
  };

  // Add body if provided
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return fetch(url, fetchOptions);
}

/**
 * Helper to make authorized API calls and parse JSON response
 * @param {string} endpoint - API endpoint
 * @param {string} token - Authorization token
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function apiCallJson(endpoint, token, options = {}) {
  const response = await apiCall(endpoint, { token, ...options });
  const data = await response.json();
  
  if (!response.ok) {
    const error = data.error || `API Error: ${response.status}`;
    throw new Error(error);
  }

  return data;
}

/**
 * Utility function for creating blob URLs from API endpoints
 * Usage: useFileUrl hook replacement
 * 
 * @param {string} endpoint - File serve endpoint
 * @param {string} token - Authorization token
 * @returns {Promise<string>} Blob URL (must be revoked later)
 */
export async function fetchBlobUrl(endpoint, token) {
  try {
    const response = await apiCall(endpoint, { token });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[API] Failed to create blob URL:', error);
    return null;
  }
}
