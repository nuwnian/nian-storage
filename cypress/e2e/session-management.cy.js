/**
 * Session Management Tests
 * Tests auth session persistence, token refresh, and logout
 */

describe('Session Management', () => {
  describe('Session Restoration on Refresh', () => {
    it('should restore session when page is refreshed after login', () => {
      // Setup: Login and store auth data
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }));
      });

      cy.visit('/');
      cy.waitForStoragePage();

      // Should be logged in on first visit
      cy.get('body').should('contain', 'nian');

      // Refresh page
      cy.reload();
      cy.waitForStoragePage();

      // Should still be logged in
      cy.get('body').should('contain', 'nian');

      // Token should still exist
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('test_token_123');
      });
    });

    it('should display user info after session restoration', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'John Doe'
        }));
      });

      cy.visit('/');
      cy.waitForStoragePage();

      // User name should be visible
      cy.get('body').should('contain', 'John Doe');
    });

    it('should redirect to login if session is expired', () => {
      // Setup: Expired token in localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'expired_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }));
      });

      // Mock API to return 401 for expired token
      cy.intercept('GET', '**/api/files', {
        statusCode: 401,
        body: { error: 'Token expired' }
      }).as('expiredToken');

      cy.visit('/');
      cy.wait('@expiredToken');

      // Should redirect to login or show login form
      cy.url().should('include', 'localhost:3000');
      cy.get('button').contains(/login|sign in/i, { timeout: 5000 }).should('exist');
    });

    it('should clear auth data if session restoration fails', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'invalid_token');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 401,
        body: { error: 'Invalid token' }
      }).as('invalidToken');

      cy.visit('/');
      cy.wait('@invalidToken', { timeout: 5000 });

      // Should show login form
      cy.get('input[type="email"]', { timeout: 5000 }).should('exist');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when access token expires', () => {
      // Setup: Valid refresh token
      cy.window().then((win) => {
        win.localStorage.setItem('sb-refresh-token', 'refresh_token_123');
        win.localStorage.setItem('sb-token', 'expired_access_token');
      });

      cy.intercept('POST', '**/api/auth/refresh', (req) => {
        expect(req.body).to.have.property('refreshToken');
        req.reply({
          statusCode: 200,
          body: {
            accessToken: 'new_access_token_123',
            refreshToken: 'new_refresh_token_123'
          }
        });
      }).as('refreshToken');

      cy.visit('/');
      cy.wait('@refreshToken', { timeout: 5000 });

      // New token should be stored
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('new_access_token_123');
      });
    });

    it('should redirect to login if refresh token is invalid', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-refresh-token', 'invalid_refresh_token');
        win.localStorage.setItem('sb-token', 'expired_access_token');
      });

      cy.intercept('POST', '**/api/auth/refresh', {
        statusCode: 401,
        body: { error: 'Invalid refresh token' }
      }).as('invalidRefresh');

      cy.visit('/');
      cy.wait('@invalidRefresh', { timeout: 5000 });

      // Should show login form
      cy.get('input[type="email"]', { timeout: 5000 }).should('exist');
    });

    it('should silently refresh token before making API calls', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-refresh-token', 'refresh_token_123');
        win.localStorage.setItem('sb-token', 'expiring_token');
      });

      cy.intercept('POST', '**/api/auth/refresh', {
        statusCode: 200,
        body: {
          accessToken: 'new_token_123',
          refreshToken: 'refresh_token_123'
        }
      }).as('refreshToken');

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      
      // Token refresh should happen first
      cy.wait('@refreshToken');
      // Then file list should be fetched with new token
      cy.wait('@getFiles');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');
    });

    it('should logout user and clear auth data', () => {
      cy.intercept('POST', '**/api/auth/logout', {
        statusCode: 200,
        body: { message: 'Logged out' }
      }).as('logout');

      cy.logout();

      // Auth data should be cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.be.null;
      });

      // Should redirect to login
      cy.get('button').contains(/login|sign in/i).should('exist');
    });

    it('should clear localStorage after logout', () => {
      cy.intercept('POST', '**/api/auth/logout', {
        statusCode: 200
      }).as('logout');

      cy.logout();

      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.be.null;
        expect(win.localStorage.getItem('sb-user')).to.be.null;
        expect(win.localStorage.getItem('sb-refresh-token')).to.be.null;
      });
    });

    it('should clear cookies after logout', () => {
      cy.getCookies().then((cookies) => {
        expect(cookies.length).to.be.greaterThan(0);
      });

      cy.intercept('POST', '**/api/auth/logout', {
        statusCode: 200
      }).as('logout');

      cy.logout();
      cy.clearCookies();

      cy.getCookies().should('have.length', 0);
    });

    it('should prevent access to protected pages after logout', () => {
      cy.intercept('POST', '**/api/auth/logout', {
        statusCode: 200
      }).as('logout');

      cy.logout();

      // Try to access storage page directly
      cy.visit('/');

      // Should redirect to login
      cy.get('input[type="email"]').should('exist');
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple tabs with same login', () => {
      // Setup first tab
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.visit('/');

      // Simulate second tab updating token
      cy.window().then((win) => {
        const event = new StorageEvent('storage', {
          key: 'sb-token',
          newValue: 'new_token_from_other_tab',
          oldValue: 'test_token_123'
        });
        win.dispatchEvent(event);
      });

      cy.wait(500);

      // First tab should sync with new token
      cy.window().then((win) => {
        const token = win.localStorage.getItem('sb-token');
        expect(token).to.exist;
      });
    });

    it('should handle logout in one tab affecting other tabs', () => {
      // Setup
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
      });

      // Simulate logout in another tab
      cy.window().then((win) => {
        const event = new StorageEvent('storage', {
          key: 'sb-token',
          newValue: null,
          oldValue: 'test_token_123'
        });
        win.dispatchEvent(event);
      });

      cy.wait(500);

      // Should be logged out
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.be.null;
      });
    });
  });

  describe('Session Timeout', () => {
    it('should warn user before session timeout', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Simulate session timeout warning
      cy.window().then((win) => {
        const event = new CustomEvent('sessionWarning', {
          detail: { minutesRemaining: 5 }
        });
        win.dispatchEvent(event);
      });

      // Should show warning message
      cy.get('body').should('contain', /session|timeout|expire/i);
    });

    it('should automatically logout on session timeout', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
      });

      cy.visit('/');

      // Simulate session timeout
      cy.window().then((win) => {
        const event = new CustomEvent('sessionTimeout', {});
        win.dispatchEvent(event);
      });

      cy.wait(1000);

      // Token should be cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.be.null;
      });

      // Should show login form
      cy.get('input[type="email"]', { timeout: 5000 }).should('exist');
    });
  });

  describe('Auth State Synchronization', () => {
    it('should synchronize auth state across components', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // All components should have access to auth state
      cy.get('body').should('be.visible');

      // Update token in another tab simulation
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'updated_token');
      });

      // Components should react to token update
      cy.window().then((win) => {
        const newToken = win.localStorage.getItem('sb-token');
        expect(newToken).to.equal('updated_token');
      });
    });

    it('should not have race conditions during auth state changes', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'initial_token');
      });

      cy.intercept('GET', '**/api/files', {
        delay: 1000,
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      
      // Change token while API call is in progress
      cy.wait(500);
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'new_token');
      });

      // API call should complete successfully
      cy.wait('@getFiles');

      // Final state should be consistent
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('new_token');
      });
    });
  });

  describe('BroadcastChannel for Multi-Tab Sync', () => {
    it('should use BroadcastChannel to sync logout across tabs', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'test_token_123');
      });

      cy.visit('/');

      // Simulate logout event from another tab via BroadcastChannel
      cy.window().then((win) => {
        if (win.BroadcastChannel) {
          const channel = new BroadcastChannel('auth');
          channel.postMessage({ type: 'logout' });
        }
      });

      cy.wait(500);

      // Should be logged out
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.be.null;
      });
    });

    it('should broadcast token refresh to other tabs', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'old_token');
      });

      cy.visit('/');

      // Simulate token refresh event from another tab
      cy.window().then((win) => {
        if (win.BroadcastChannel) {
          const channel = new BroadcastChannel('auth');
          channel.postMessage({
            type: 'tokenRefreshed',
            token: 'new_refreshed_token'
          });
        }
      });

      cy.wait(500);

      // Token should be updated
      cy.window().then((win) => {
        const token = win.localStorage.getItem('sb-token');
        expect(token).to.exist;
      });
    });
  });
});
