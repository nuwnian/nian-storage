// cypress/support/e2e.js
// This file is run before each test file

import './commands.js';

// Suppress specific console errors/warnings that are not test failures
const app = window.top;

try {
  if (app.document) {
    app.document.addEventListener('uncaught:exception', (event) => {
      // Returning false here prevents Cypress from failing the test on uncaught exceptions
      // You can customize this based on specific error patterns

      // Ignore ResizeObserver errors (common in React)
      if (event.message.includes('ResizeObserver')) {
        return false;
      }

      // Ignore specific localStorage errors
      if (event.message.includes('localStorage')) {
        return false;
      }

      // Let other errors fail the test
      return true;
    });
  }
} catch (e) {
  // Ignore errors in setting up error handlers
}

// Global configuration
Cypress.config({
  chromeWebSecurity: false // Allow cross-origin requests in tests
});

// Set up API base URL
const apiBaseUrl = Cypress.env('API_BASE_URL') || 'http://localhost:5000';
Cypress.env('API_BASE_URL', apiBaseUrl);

// Log test start/end
beforeEach(() => {
  cy.log('Test starting...');
});

afterEach(() => {
  cy.log('Test completed');
});
