/**
 * File Operations Tests
 * Tests file upload, download, delete, and view functionality
 */

describe('File Operations', () => {
  beforeEach(() => {
    cy.clearAuthState();
    
    // Mock successful login
    cy.window().then((win) => {
      win.localStorage.setItem('sb-token', 'mock_auth_token');
      win.localStorage.setItem('sb-user', JSON.stringify({
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    cy.visit('/');
    cy.waitForStoragePage();
  });

  describe('File Upload - Basic', () => {
    it('should display file upload area', () => {
      cy.get('[class*="drag"], [class*="upload"]').should('exist').and('be.visible');
    });

    it('should upload file via file input', () => {
      cy.intercept('POST', '**/api/files', {
        statusCode: 200,
        body: {
          id: 'file_123',
          name: 'test.txt',
          type: 'doc',
          size: 100,
          created_at: new Date().toISOString()
        }
      }).as('fileUpload');

      cy.fixture('sample-file.txt', 'utf8').then((fileContent) => {
        cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      });

      cy.wait('@fileUpload', { timeout: 10000 }).then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
      });
    });

    it('should show upload progress during file upload', () => {
      cy.intercept('POST', '**/api/files', (req) => {
        req.reply((res) => {
          res.delay(2000); // Simulate slow upload
          res.send({
            statusCode: 200,
            body: {
              id: 'file_123',
              name: 'test.txt'
            }
          });
        });
      }).as('slowUpload');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      
      // Progress bar should be visible
      cy.get('[class*="progress"]', { timeout: 5000 }).should('be.visible');
    });

    it('should display error for files exceeding size limit', () => {
      cy.intercept('POST', '**/api/files', {
        statusCode: 400,
        body: {
          error: 'File too large (max 50 MB)'
        }
      }).as('fileTooLarge');

      // Try to upload a large file (mocked)
      cy.shouldShowError('File too large');
    });

    it('should reject unsupported file types', () => {
      cy.intercept('POST', '**/api/files', {
        statusCode: 400,
        body: {
          error: 'Unsupported file type'
        }
      }).as('unsupportedType');

      cy.shouldShowError('Unsupported file type');
    });
  });

  describe('File Upload - Multiple Files', () => {
    it('should upload multiple files', () => {
      cy.intercept('POST', '**/api/files', {
        statusCode: 200,
        body: {
          id: 'file_123',
          name: 'test.txt'
        }
      }).as('multiUpload');

      // Upload first file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      cy.wait('@multiUpload');

      // Upload second file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-image.jpg');
      cy.wait('@multiUpload');

      cy.wait(1000);
    });

    it('should queue files if one upload is in progress', () => {
      // First upload is slow
      cy.intercept('POST', '**/api/files', (req) => {
        req.reply((res) => {
          res.delay(3000);
          res.send({
            statusCode: 200,
            body: { id: 'file_123', name: 'test1.txt' }
          });
        });
      }).as('firstUpload');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      
      // While first is uploading, initiate second
      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-image.jpg');

      cy.wait('@firstUpload');
    });
  });

  describe('File Display and Listing', () => {
    it('should display uploaded files in list', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'document.pdf', type: 'doc', size: 2048, created_at: '2026-04-20T10:00:00Z' },
            { id: 'file_2', name: 'photo.jpg', type: 'image', size: 4096, created_at: '2026-04-20T10:01:00Z' },
            { id: 'file_3', name: 'video.mp4', type: 'video', size: 8192, created_at: '2026-04-20T10:02:00Z' }
          ],
          total: 3,
          storageUsed: 14336,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Files should be visible
      cy.get('body').should('contain', 'document.pdf');
      cy.get('body').should('contain', 'photo.jpg');
      cy.get('body').should('contain', 'video.mp4');
    });

    it('should display file information (name, size, date)', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { 
              id: 'file_1', 
              name: 'test.txt', 
              type: 'doc', 
              size: 1024, 
              created_at: '2026-04-20T10:00:00Z' 
            }
          ],
          total: 1,
          storageUsed: 1024,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Check file details displayed
      cy.get('body').should('contain', 'test.txt');
      cy.get('body').should('contain', '1'); // Size indicator
    });

    it('should display empty state when no files exist', () => {
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

      // Should show empty state
      cy.get('body').should('contain', /empty|no files|upload/i);
    });

    it('should show storage usage information', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 1073741824, // 1 GB
          storageTotal: 10737418240 // 10 GB
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Should show storage usage
      cy.get('body').should('contain', /storage|1|GB|10|GB/i);
    });
  });

  describe('File Search and Filter', () => {
    beforeEach(() => {
      // Setup file list
      cy.intercept('GET', '**/api/files**', {
        statusCode: 200,
        body: {
          files: [
            { id: '1', name: 'document.pdf', type: 'doc', size: 2048 },
            { id: '2', name: 'photo.jpg', type: 'image', size: 4096 },
            { id: '3', name: 'video.mp4', type: 'video', size: 8192 },
            { id: '4', name: 'spreadsheet.xlsx', type: 'doc', size: 1024 }
          ],
          total: 4,
          storageUsed: 15360,
          storageTotal: 10737418240
        }
      }).as('getFiles');
    });

    it('should filter files by type (images)', () => {
      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Click image filter
      cy.filterByType('image');

      // Should only show images
      cy.get('body').should('contain', 'photo.jpg');
      cy.get('body').should('not.contain', 'document.pdf');
    });

    it('should filter files by type (videos)', () => {
      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.filterByType('video');

      cy.get('body').should('contain', 'video.mp4');
      cy.get('body').should('not.contain', 'photo.jpg');
    });

    it('should search files by name', () => {
      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.searchFile('document');

      // Should filter results
      cy.get('body').should('contain', 'document.pdf');
      cy.get('body').should('not.contain', 'photo.jpg');
    });

    it('should reset filters when clicking all', () => {
      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.filterByType('image');
      // Now click "all"
      cy.filterByType('all');

      // Should show all files again
      cy.get('body').should('contain', 'photo.jpg');
      cy.get('body').should('contain', 'document.pdf');
    });
  });

  describe('File Deletion', () => {
    it('should delete file and confirm', () => {
      cy.intercept('DELETE', '**/api/files/**', {
        statusCode: 200,
        body: { message: 'File deleted' }
      }).as('deleteFile');

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'test.txt', type: 'doc', size: 1024 }
          ],
          total: 1,
          storageUsed: 1024,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.deleteFile('test.txt');
      cy.wait('@deleteFile');

      // File should be gone
      cy.get('body').should('not.contain', 'test.txt');
    });

    it('should show confirmation modal before deleting', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'test.txt', type: 'doc', size: 1024 }
          ],
          total: 1,
          storageUsed: 1024,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Click delete should show modal
      cy.get('body').contains('test.txt').parent()
        .find('button[aria-label*="delete" i]')
        .click();

      // Modal should appear
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible');
      cy.get('[role="dialog"]').should('contain', /confirm|delete|sure/i);
    });

    it('should cancel deletion when user declines', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'test.txt', type: 'doc', size: 1024 }
          ],
          total: 1,
          storageUsed: 1024,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Open delete modal
      cy.get('body').contains('test.txt').parent()
        .find('button[aria-label*="delete" i]')
        .click();

      // Click cancel
      cy.get('button').contains(/cancel|no/i).click();

      // File should still exist
      cy.get('body').should('contain', 'test.txt');
    });
  });

  describe('File Viewer', () => {
    it('should open file viewer when clicking on image', () => {
      cy.intercept('GET', '**/api/files',  {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'photo.jpg', type: 'image', size: 4096 }
          ],
          total: 1,
          storageUsed: 4096,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.intercept('GET', '**/api/files/file_1/serve', {
        statusCode: 200,
        fixture: 'sample-image.jpg'
      }).as('serveImage');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.viewFile('photo.jpg');
      cy.wait('@serveImage');

      // Viewer modal should be visible
      cy.get('[class*="modal"], [role="dialog"]').should('be.visible');
    });

    it('should close viewer when clicking close button', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'photo.jpg', type: 'image', size: 4096 }
          ],
          total: 1,
          storageUsed: 4096,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.viewFile('photo.jpg');
      cy.closeViewer();

      // Modal should be closed
      cy.get('[class*="modal"][class*="hidden"], [role="dialog"][style*="display: none"]').should('exist');
    });

    it('should close viewer when pressing ESC key', () => {
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_1', name: 'photo.jpg', type: 'image', size: 4096 }
          ],
          total: 1,
          storageUsed: 4096,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      cy.viewFile('photo.jpg');
      
      // Press ESC
      cy.get('body').type('{esc}');

      // Modal should be closed
      cy.get('[class*="modal"][class*="hidden"]', { timeout: 5000 }).should('exist');
    });
  });

  describe('File Operations - Error Handling', () => {
    it('should handle upload errors gracefully', () => {
      cy.intercept('POST', '**/api/files', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('uploadError');

      cy.visit('/');
      cy.waitForStoragePage();

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');

      cy.shouldShowError('failed|error');
    });

    it('should handle network errors during file request', () => {
      cy.intercept('GET', '**/api/files', {
        forceNetworkError: true
      }).as('networkError');

      cy.visit('/');

      cy.shouldShowError('failed|error|network');
    });

    it('should handle unauthorized file access', () => {
      cy.intercept('GET', '**/api/files/file_123/serve', {
        statusCode: 401,
        body: { error: 'Unauthorized' }
      }).as('unauthorized');

      cy.shouldShowError('Unauthorized|access denied');
    });
  });
});
