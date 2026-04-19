// ========================================
// Custom Cypress Commands for OAuth / Auth
// ========================================

/**
 * Clear all auth data (localStorage, sessionStorage, cookies)
 * Useful before running tests to ensure clean state
 */
Cypress.Commands.add('clearAuthState', () => {
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear all cookies
  cy.clearCookies();
  
  cy.log('Auth state cleared');
});

/**
 * Check if user is logged in by looking for auth indicators
 */
Cypress.Commands.add('isLoggedIn', () => {
  // Check for token in localStorage
  const token = localStorage.getItem('sb-token') || localStorage.getItem('access_token');
  return !!token;
});

/**
 * Get current auth token from localStorage
 */
Cypress.Commands.add('getAuthToken', () => {
  return localStorage.getItem('sb-token') || localStorage.getItem('access_token');
});

/**
 * Login via email/password (traditional method)
 * @param email - User email
 * @param password - User password
 */
Cypress.Commands.add('loginWithEmail', (email, password) => {
  cy.visit('/');
  cy.wait(1500); // Wait for app to load
  
  // Check if login form is visible
  cy.get('input[type="email"]').should('exist').type(email);
  cy.get('input[type="password"]').should('exist').type(password);
  
  // Click login button
  cy.get('button').contains(/login|sign in/i).click();
  
  // Wait for navigation to storage page
  cy.url().should('include', 'localhost:3000');
  cy.wait(2000); // Wait for storage page to load
  
  cy.log(`Logged in with email: ${email}`);
});

/**
 * Verify OAuth callback was processed correctly
 * (Used after redirecting back from OAuth provider)
 */
Cypress.Commands.add('verifyOAuthCallback', () => {
  // Check if hash was cleared (indicating callback was processed)
  cy.url().should('not.include', '#access_token');
  
  // Check if user has auth data
  cy.window().then((win) => {
    const hasAuth = 
      win.localStorage.getItem('sb-token') || 
      win.localStorage.getItem('access_token');
    expect(hasAuth).to.exist;
  });
  
  cy.log('OAuth callback verified');
});

/**
 * Logout user
 */
Cypress.Commands.add('logout', () => {
  // Look for logout button or menu
  cy.get('button').contains(/logout|sign out/i).click({ force: true });
  
  // Wait for redirect to login page
  cy.url().should('not.include', 'storage');
  cy.wait(1000);
  
  cy.log('Logged out');
});

/**
 * Upload a file using the file input
 * @param fileName - Name of file to create and upload
 * @param fileContent - Content of the file
 * @param mimeType - MIME type of the file
 */
Cypress.Commands.add('uploadFile', (fileName, fileContent = 'test content', mimeType = 'text/plain') => {
  // Create file bytes
  cy.fixture(fileName, 'binary').then(fileContent => {
    const blob = Cypress.Blob.binaryStringToBlob(fileContent, mimeType);
    const file = new File([blob], fileName, { type: mimeType });
    
    // Get file input and set files
    cy.get('input[type="file"]').then(input => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      
      // Trigger change event
      cy.wrap(input).trigger('change', { force: true });
    });
  });
  
  cy.log(`File uploaded: ${fileName}`);
});

/**
 * Drag and drop file onto drop zone
 * @param fileName - Name of file to upload
 */
Cypress.Commands.add('dragDropFile', (fileName) => {
  const dropZone = cy.get('[class*="drag"]').first() || cy.get('main');
  
  dropZone.trigger('dragenter', { force: true });
  dropZone.trigger('dragover', { force: true });
  
  cy.fixture(fileName, 'binary').then(fileContent => {
    const blob = Cypress.Blob.binaryStringToBlob(fileContent, 'application/octet-stream');
    const file = new File([blob], fileName);
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    dropZone.trigger('drop', {
      dataTransfer,
      force: true
    });
  });
  
  cy.log(`File drag-dropped: ${fileName}`);
});

/**
 * Verify file appears in file list
 * @param fileName - Name of file to verify
 */
Cypress.Commands.add('verifyFileInList', (fileName) => {
  cy.get('body').should('contain', fileName);
  cy.log(`File verified in list: ${fileName}`);
});

/**
 * Delete file from storage
 * @param fileName - Name of file to delete
 */
Cypress.Commands.add('deleteFile', (fileName) => {
  // Find file row and click delete button
  cy.get('body').contains(fileName).parent()
    .find('button[aria-label*="delete" i]')
    .click();
  
  // Confirm deletion if modal appears
  cy.get('button').contains(/confirm|delete|yes/i).click({ timeout: 5000 });
  
  cy.wait(1000); // Wait for deletion to complete
  cy.log(`File deleted: ${fileName}`);
});

/**
 * Search for file by name
 * @param searchTerm - Search query
 */
Cypress.Commands.add('searchFile', (searchTerm) => {
  cy.get('input[type="search"]').type(searchTerm);
  cy.wait(500); // Wait for search results
  cy.log(`Searched for: ${searchTerm}`);
});

/**
 * Filter files by type
 * @param fileType - Type to filter by (all, image, video, doc)
 */
Cypress.Commands.add('filterByType', (fileType) => {
  cy.get(`button[data-filter="${fileType}"]`)
    .click();
  cy.wait(500);
  cy.log(`Filtered by type: ${fileType}`);
});

/**
 * Open file viewer modal
 * @param fileName - Name of file to view
 */
Cypress.Commands.add('viewFile', (fileName) => {
  cy.get('body').contains(fileName).click();
  
  // Wait for modal to appear
  cy.get('[class*="modal"]', { timeout: 5000 }).should('be.visible');
  cy.log(`Viewing file: ${fileName}`);
});

/**
 * Close file viewer modal
 */
Cypress.Commands.add('closeViewer', () => {
  cy.get('button[aria-label*="close" i]').click({ force: true });
  cy.wait(500);
  cy.log('Viewer closed');
});

/**
 * Wait for storage page to fully load
 */
Cypress.Commands.add('waitForStoragePage', () => {
  cy.url().should('include', 'localhost:3000');
  cy.get('body').should('contain', 'nian');
  cy.wait(1500); // Additional wait for content to load
  cy.log('Storage page loaded');
});

/**
 * Check if error message appears
 * @param errorText - Text of error message
 */
Cypress.Commands.add('shouldShowError', (errorText) => {
  cy.get('[role="alert"]').should('contain', errorText);
  cy.log(`Error message verified: ${errorText}`);
});

/**
 * Check if success message appears
 */
Cypress.Commands.add('shouldShowSuccess', () => {
  cy.get('body').should('contain', /success|uploaded|completed/i);
  cy.log('Success message verified');
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      clearAuthState(): Chainable<void>;
      isLoggedIn(): Chainable<boolean>;
      getAuthToken(): Chainable<string>;
      loginWithEmail(email: string, password: string): Chainable<void>;
      verifyOAuthCallback(): Chainable<void>;
      logout(): Chainable<void>;
      uploadFile(fileName: string, fileContent?: string, mimeType?: string): Chainable<void>;
      dragDropFile(fileName: string): Chainable<void>;
      verifyFileInList(fileName: string): Chainable<void>;
      deleteFile(fileName: string): Chainable<void>;
      searchFile(searchTerm: string): Chainable<void>;
      filterByType(fileType: string): Chainable<void>;
      viewFile(fileName: string): Chainable<void>;
      closeViewer(): Chainable<void>;
      waitForStoragePage(): Chainable<void>;
      shouldShowError(errorText: string): Chainable<void>;
      shouldShowSuccess(): Chainable<void>;
    }
  }
}
