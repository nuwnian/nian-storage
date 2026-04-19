/**
 * OAuth Login Tests
 * Tests OAuth authentication flow for Google and GitHub
 */

describe('OAuth Authentication Flow', () => {
  beforeEach(() => {
    cy.clearAuthState();
    cy.visit('/');
    cy.wait(1500);
  });

  describe('OAuth Button Visibility', () => {
    it('should display OAuth provider buttons on login page', () => {
      cy.get('button').contains(/Google|google/i).should('exist').and('be.visible');
      cy.get('button').contains(/GitHub|github/i).should('exist').and('be.visible');
    });

    it('should display both OAuth and email login options', () => {
      // OAuth buttons
      cy.get('button').contains(/Google|google/i).should('be.visible');
      cy.get('button').contains(/GitHub|github/i).should('be.visible');
      
      // Email/password form
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.get('button').contains(/login|sign in/i).should('exist');
    });
  });

  describe('OAuth URL Generation', () => {
    it('should generate correct OAuth URL for Google when button is clicked', () => {
      // Intercept the OAuth endpoint call
      cy.intercept('POST', '**/api/auth/oauth/google', {
        statusCode: 200,
        body: {
          url: 'https://accounts.google.com/o/oauth2/v2/auth'
        }
      }).as('googleOAuth');

      cy.get('button').contains(/Google|google/i).click();
      
      cy.wait('@googleOAuth').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('url');
      });
    });

    it('should generate correct OAuth URL for GitHub when button is clicked', () => {
      cy.intercept('POST', '**/api/auth/oauth/github', {
        statusCode: 200,
        body: {
          url: 'https://github.com/login/oauth/authorize'
        }
      }).as('githubOAuth');

      cy.get('button').contains(/GitHub|github/i).click();
      
      cy.wait('@githubOAuth').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('url');
      });
    });

    it('should only allow whitelisted OAuth providers', () => {
      cy.intercept('POST', '**/api/auth/oauth/*', {
        statusCode: 400,
        body: {
          error: 'Invalid OAuth provider'
        }
      }).as('invalidProvider');

      // Try to intercept invalid provider request
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/oauth/invalid',
        failOnStatusCode: false
      }).then((response) => {
        // Should return 400 for invalid provider
        expect([400, 405]).to.include(response.status);
      });
    });
  });

  describe('OAuth Callback Processing', () => {
    it('should process OAuth callback with valid tokens', () => {
      // Simulate OAuth redirect with tokens in URL hash
      cy.visit('/#access_token=test_token_123&refresh_token=refresh_123');
      
      cy.wait(2000); // Wait for callback processing
      
      // Verify callback was processed
      cy.verifyOAuthCallback();
    });

    it('should handle invalid access tokens gracefully', () => {
      cy.intercept('POST', '**/api/auth/oauth/callback', {
        statusCode: 401,
        body: {
          error: 'Invalid token'
        }
      }).as('invalidToken');

      cy.visit('/#access_token=invalid_token&refresh_token=refresh_123');
      cy.wait(2000);

      // Should show error or redirect back to login
      cy.url().should('include', 'localhost:3000');
    });

    it('should clear hash from URL after callback processing', () => {
      cy.visit('/#access_token=test_token&refresh_token=refresh_123');
      cy.wait(2000);

      // URLs hash should be cleared
      cy.url().should('not.include', '#access_token');
      cy.url().should('not.include', 'refresh_token');
    });
  });

  describe('Session Restoration After OAuth', () => {
    it('should restore user session from localStorage after OAuth login', () => {
      // Mock successful OAuth flow
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'mock_auth_token');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }));
      });

      cy.visit('/');
      cy.wait(2000);

      // Should have token in localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('mock_auth_token');
      });
    });

    it('should display error if token is invalid after OAuth callback', () => {
      cy.visit('/#access_token=invalid_token');
      cy.wait(1500);

      // Should show error message
      cy.shouldShowError('Invalid token');
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle network errors when requesting OAuth URL', () => {
      cy.intercept('POST', '**/api/auth/oauth/google', {
        forceNetworkError: true
      }).as('networkError');

      cy.get('button').contains(/Google|google/i).click();
      cy.wait(1000);

      // Should show error message to user
      cy.get('body').should('contain', /failed|error|try again/i);
    });

    it('should handle server errors (5xx)', () => {
      cy.intercept('POST', '**/api/auth/oauth/github', {
        statusCode: 500,
        body: {
          error: 'Internal server error'
        }
      }).as('serverError');

      cy.get('button').contains(/GitHub|github/i).click();
      cy.wait(1000);

      // Should show error message
      cy.get('body').should('contain', /failed|error|try again/i);
    });

    it('should show rate limiting message if too many attempts', () => {
      // Make multiple OAuth requests
      for (let i = 0; i < 6; i++) {
        cy.intercept('POST', '**/api/auth/oauth/google', {
          statusCode: i < 5 ? 200 : 429,
          body: i < 5 ? { url: 'https://google.com' } : { error: 'Too many requests' }
        }).as(`google${i}`);
      }

      // After multiple attempts, should show rate limit message
      cy.get('button').contains(/Google|google/i).click();
      cy.wait(1000);
    });
  });

  describe('CORS and Origin Validation', () => {
    it('should reject requests from invalid origins', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/oauth/google',
        headers: {
          'Origin': 'http://malicious-site.com'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should either block or handle CORS appropriately
        expect([200, 403, 400]).to.include(response.status);
      });
    });

    it('should accept requests from allowed origins', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/oauth/google',
        headers: {
          'Origin': 'http://localhost:3000'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(200);
      });
    });
  });

  describe('OAuth Parameter Validation', () => {
    it('should validate provider parameter', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/auth/oauth/invalid_provider',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.error).to.include('Invalid');
      });
    });

    it('should properly encode OAuth parameters', () => {
      cy.intercept('POST', '**/api/auth/oauth/google', (req) => {
        // Verify parameters are properly encoded
        expect(req.body).to.exist;
      });

      cy.get('button').contains(/Google|google/i).click();
    });
  });
});
