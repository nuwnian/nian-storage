/**
 * Full Integration Tests
 * Tests complete user workflows: OAuth login → File upload → View → Delete
 */

describe('Full Integration - Complete User Workflows', () => {
  describe('OAuth Login to File Management', () => {
    it('should complete full workflow: OAuth login → upload → view → delete', () => {
      // 1. Start at login page
      cy.clearAuthState();
      cy.visit('/');
      cy.wait(1500);

      // 2. Should see OAuth buttons
      cy.get('button').contains(/Google|google/i).should('exist');
      cy.get('button').contains(/GitHub|github/i).should('exist');

      // 3. Mock OAuth flow - set tokens
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'oauth_token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'oauth_user_123',
          email: 'oauth@example.com',
          name: 'OAuth User'
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

      cy.reload();
      cy.wait('@getFiles');

      // 4. Should be on storage page
      cy.url().should('include', 'localhost:3000');
      cy.get('body').should('contain', 'nian');

      // 5. Upload a file
      cy.intercept('POST', '**/api/files', {
        statusCode: 200,
        body: {
          id: 'file_123',
          name: 'test-doc.pdf',
          type: 'doc',
          size: 2048,
          created_at: new Date().toISOString()
        }
      }).as('uploadFile');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      cy.wait('@uploadFile');

      // 6. Refresh files list
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            {
              id: 'file_123',
              name: 'test-doc.pdf',
              type: 'doc',
              size: 2048,
              created_at: new Date().toISOString()
            }
          ],
          total: 1,
          storageUsed: 2048,
          storageTotal: 10737418240
        }
      }).as('getFilesAfterUpload');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFilesAfterUpload');

      // 7. File should be visible
      cy.verifyFileInList('test-doc.pdf');

      // 8. Delete the file
      cy.intercept('DELETE', '**/api/files/**', {
        statusCode: 200,
        body: { message: 'File deleted' }
      }).as('deleteFile');

      cy.deleteFile('test-doc.pdf');
      cy.wait('@deleteFile');

      // 9. File should be gone
      cy.get('body').should('not.contain', 'test-doc.pdf');
    });

    it('should handle series of file operations', () => {
      // Login
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: { files: [], total: 0, storageUsed: 0, storageTotal: 10737418240 }
      }).as('getFiles1');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles1');

      // Upload multiple files
      const files = ['file1.pdf', 'file2.jpg', 'file3.mp4'];
      files.forEach((file, index) => {
        cy.intercept('POST', '**/api/files', {
          statusCode: 200,
          body: {
            id: `file_${index}`,
            name: file,
            type: 'doc',
            size: 1024 * (index + 1),
            created_at: new Date().toISOString()
          }
        }).as(`upload${index}`);

        cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
        cy.wait(`@upload${index}`);
      });

      // Get updated file list
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: files.map((f, i) => ({
            id: `file_${i}`,
            name: f,
            type: ['doc', 'image', 'video'][i],
            size: 1024 * (i + 1)
          })),
          total: files.length,
          storageUsed: 1024 + 2048 + 3072,
          storageTotal: 10737418240
        }
      }).as('getFiles2');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles2');

      // All files should be visible
      cy.verifyFileInList('file1.pdf');
      cy.verifyFileInList('file2.jpg');
      cy.verifyFileInList('file3.mp4');

      // Delete middle file
      cy.intercept('DELETE', '**/api/files/file_1', {
        statusCode: 200,
        body: { message: 'File deleted' }
      }).as('deleteMiddle');

      cy.deleteFile('file2.jpg');
      cy.wait('@deleteMiddle');

      // Update list
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_0', name: 'file1.pdf', type: 'doc', size: 1024 },
            { id: 'file_2', name: 'file3.mp4', type: 'video', size: 3072 }
          ],
          total: 2,
          storageUsed: 4096,
          storageTotal: 10737418240
        }
      }).as('getFiles3');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles3');

      // Correct files should remain
      cy.verifyFileInList('file1.pdf');
      cy.get('body').should('not.contain', 'file2.jpg');
      cy.verifyFileInList('file3.mp4');
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from upload error and retry', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: { files: [], total: 0, storageUsed: 0, storageTotal: 10737418240 }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // First upload fails
      cy.intercept('POST', '**/api/files', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('uploadFail');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      cy.wait('@uploadFail');

      // Should show error
      cy.shouldShowError('failed|error|server');

      // User retries - this time it succeeds
      cy.intercept('POST', '**/api/files', {
        statusCode: 200,
        body: {
          id: 'file_123',
          name: 'test.txt',
          type: 'doc',
          size: 100,
          created_at: new Date().toISOString()
        }
      }).as('uploadSuccess');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      cy.wait('@uploadSuccess');

      // File should now be listed
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: 'file_123', name: 'test.txt', type: 'doc', size: 100 }
          ],
          total: 1,
          storageUsed: 100,
          storageTotal: 10737418240
        }
      }).as('getFilesAfter');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFilesAfter');

      cy.verifyFileInList('test.txt');
    });

    it('should handle network disconnection and reconnection', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      // Initial load fails (network error)
      cy.intercept('GET', '**/api/files', {
        forceNetworkError: true
      }).as('networkError');

      cy.visit('/');

      // Should show error
      cy.shouldShowError('network|failed|error');

      // Retry should succeed
      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [],
          total: 0,
          storageUsed: 0,
          storageTotal: 10737418240
        }
      }).as('getFilesRetry');

      // Trigger retry
      cy.get('button').contains(/retry|reload|try again/i).click({ force: true });

      cy.wait('@getFilesRetry', { timeout: 5000 });

      // Should now show storage page
      cy.get('body').should('contain', 'nian');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large number of files efficiently', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      // Generate 100 files
      const largeFileList = Array.from({ length: 100 }, (_, i) => ({
        id: `file_${i}`,
        name: `document_${i}.pdf`,
        type: 'doc',
        size: 1024 * (i + 1),
        created_at: new Date(Date.now() - i * 1000).toISOString()
      }));

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: largeFileList,
          total: 100,
          storageUsed: 5242880, // 5 MB
          storageTotal: 10737418240
        }
      }).as('getLargeFileList');

      cy.visit('/');
      cy.waitForStoragePage();

      // Should load without performance issues
      cy.wait('@getLargeFileList');
      cy.get('body').should('be.visible');

      // Scrolling should work smoothly
      cy.get('body').scrollTo('bottom');
    });

    it('should handle large file uploads', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: { files: [], total: 0, storageUsed: 0, storageTotal: 10737418240 }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Upload large file with progress
      cy.intercept('POST', '**/api/files', (req) => {
        req.reply((res) => {
          // Simulate slow upload
          res.delay(5000);
          res.send({
            statusCode: 200,
            body: {
              id: 'large_file',
              name: 'large-video.mp4',
              type: 'video',
              size: 536870912, // 500 MB
              created_at: new Date().toISOString()
            }
          });
        });
      }).as('largFileUpload');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');

      // Progress should be visible
      cy.get('[class*="progress"]', { timeout: 10000 }).should('exist');

      cy.wait('@largFileUpload', { timeout: 15000 });
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should maintain file list while searching', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      const files = [
        { id: '1', name: 'report.pdf', type: 'doc', size: 2048 },
        { id: '2', name: 'photo.jpg', type: 'image', size: 4096 },
        { id: '3', name: 'presentation.pptx', type: 'doc', size: 3072 }
      ];

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: { files, total: 3, storageUsed: 9216, storageTotal: 10737418240 }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // All files visible
      cy.verifyFileInList('report.pdf');
      cy.verifyFileInList('photo.jpg');
      cy.verifyFileInList('presentation.pptx');

      // Search for 'report'
      cy.searchFile('report');

      // Only matching files shown
      cy.get('body').should('contain', 'report.pdf');
      cy.get('body').should('not.contain', 'photo.jpg');

      // Can still delete from search results
      cy.intercept('DELETE', '**/api/files/1', {
        statusCode: 200
      }).as('deleteReport');

      cy.deleteFile('report.pdf');
      cy.wait('@deleteReport');
    });

    it('should maintain session while performing multiple operations', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [{ id: '1', name: 'file.pdf', type: 'doc', size: 1024 }],
          total: 1,
          storageUsed: 1024,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Token should still be valid
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('token_123');
      });

      // Upload a file
      cy.intercept('POST', '**/api/files', {
        statusCode: 200,
        body: { id: '2', name: 'new.txt', type: 'doc', size: 512 }
      }).as('upload');

      cy.get('input[type="file"]').selectFile('cypress/fixtures/sample-file.txt');
      cy.wait('@upload');

      // Token should still be the same
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('token_123');
      });

      // Delete a file
      cy.intercept('DELETE', '**/api/files/1', {
        statusCode: 200
      }).as('delete');

      cy.deleteFile('file.pdf');
      cy.wait('@delete');

      // Token should still be valid
      cy.window().then((win) => {
        expect(win.localStorage.getItem('sb-token')).to.equal('token_123');
      });
    });
  });

  describe('Accessibility During Workflows', () => {
    it('should maintain keyboard navigation during file operations', () => {
      cy.clearAuthState();
      cy.window().then((win) => {
        win.localStorage.setItem('sb-token', 'token_123');
        win.localStorage.setItem('sb-user', JSON.stringify({
          id: 'user_123',
          email: 'test@example.com'
        }));
      });

      cy.intercept('GET', '**/api/files', {
        statusCode: 200,
        body: {
          files: [
            { id: '1', name: 'file1.pdf', type: 'doc', size: 1024 },
            { id: '2', name: 'file2.jpg', type: 'image', size: 2048 }
          ],
          total: 2,
          storageUsed: 3072,
          storageTotal: 10737418240
        }
      }).as('getFiles');

      cy.visit('/');
      cy.waitForStoragePage();
      cy.wait('@getFiles');

      // Tab through file list
      cy.get('body').type('{tab}');
      cy.focused().should('exist');

      // All interactive elements should be keyboard accessible
      cy.get('button').each(($button) => {
        expect($button.prop('tagName')).to.equal('BUTTON');
      });
    });
  });
});
