// tab-monitor.js
// This script monitors PDF tabs and ensures they can be recovered if closed

(function() {
  // Store the current URL
  const currentUrl = window.location.href;
  
  // Check if this is a PDF page that needs monitoring
  const isPdf = document.contentType === 'application/pdf' || 
                window.location.pathname.endsWith('.pdf') ||
                window.location.href.includes('/web/viewer.html');
  
  if (isPdf) {
    console.log('Tab monitor active for PDF: ' + currentUrl);
    
    // Get the original PDF URL
    let pdfUrl = currentUrl;
    
    // If this is the viewer page, extract the original PDF URL
    if (window.location.href.includes('/web/viewer.html')) {
      const urlParams = new URLSearchParams(window.location.search);
      const fileParam = urlParams.get('file');
      if (fileParam) {
        pdfUrl = fileParam;
      }
    }
    
    // Create a backup mechanism that works even if the extension is disabled
    // This creates an invisible iframe with the original PDF that will remain
    // even if the extension is disabled
    const createBackupLink = () => {
      // Remove any existing backup frame
      const existingFrame = document.getElementById('pdf-backup-frame');
      if (existingFrame) {
        existingFrame.remove();
      }
      
      // Create a hidden link to the PDF and automatically click it
      // When the extension is disabled, Chrome will open this in the default PDF viewer
      const link = document.createElement('a');
      link.id = 'pdf-backup-link';
      link.href = pdfUrl;
      link.style.display = 'none';
      link.target = '_blank'; // Open in new tab
      link.setAttribute('data-original-pdf', 'true');
      
      document.body.appendChild(link);
      
      // Create a hidden notification div that will appear if extension is disabled
      const notificationDiv = document.createElement('div');
      notificationDiv.id = 'pdf-extension-notification';
      notificationDiv.style.position = 'fixed';
      notificationDiv.style.top = '10px';
      notificationDiv.style.left = '10px';
      notificationDiv.style.zIndex = '9999';
      notificationDiv.style.background = 'white';
      notificationDiv.style.border = '1px solid black';
      notificationDiv.style.padding = '10px';
      notificationDiv.style.display = 'none';
      notificationDiv.textContent = 'Extension disabled. Click here to open PDF in default viewer.';
      notificationDiv.onclick = function() {
        window.open(pdfUrl, '_blank');
      };
      
      document.body.appendChild(notificationDiv);
      
      // Return the link element
      return link;
    };
    
    // Create the backup link right away
    const backupLink = createBackupLink();
    
    // Store the URL in multiple storage locations for redundancy
    try {
      localStorage.setItem('pdf_url', pdfUrl);
      sessionStorage.setItem('pdf_url', pdfUrl);
      document.cookie = `pdf_url=${encodeURIComponent(pdfUrl)};path=/;max-age=86400`;
      
      // Also send it to the background script for tracking
      chrome.runtime.sendMessage({
        type: 'registerPdfTab',
        originalUrl: pdfUrl
      }, function(response) {
        // If we can't reach the background page, the extension might be disabled
        if (chrome.runtime.lastError) {
          console.warn('Could not register PDF tab - extension may be disabled');
          
          // Show backup link when there's an error connecting to the extension
          document.getElementById('pdf-extension-notification').style.display = 'block';
          
          // Try to open the backup
          setTimeout(function() {
            backupLink.click();
          }, 500);
        }
      });
    } catch (e) {
      console.error('Error storing PDF URL:', e);
    }
    
    // Monitor for tab closing
    window.addEventListener('beforeunload', function(event) {
      console.log('Tab unloading, notifying background script');
      
      // Notify the background script that this tab is about to close
      try {
        // Use sendMessage with a callback, so we can detect if the extension is unavailable
        chrome.runtime.sendMessage({
          type: 'beforeUnload',
          url: pdfUrl
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.warn('Extension unavailable during beforeUnload');
            
            // If the extension is unavailable, try to click the backup link
            try {
              backupLink.click();
            } catch (e) {
              console.error('Failed to click backup link:', e);
            }
          }
        });
      } catch (e) {
        console.error('Error sending beforeUnload message:', e);
        
        // If there's an error, try to use the backup link
        try {
          backupLink.click();
        } catch (backupError) {
          console.error('Failed to click backup link:', backupError);
        }
      }
      
      // Store the URL again in storage as a last resort
      try {
        localStorage.setItem('last_closed_pdf', pdfUrl);
        sessionStorage.setItem('last_closed_pdf', pdfUrl);
        document.cookie = `last_closed_pdf=${encodeURIComponent(pdfUrl)};path=/;max-age=60`;
      } catch (e) {
        console.error('Error storing closing PDF URL:', e);
      }
    });
    
    // Check for extension connection issues
    const checkExtensionConnection = () => {
      try {
        // Try sending a ping message
        chrome.runtime.sendMessage({ type: 'ping' }, function(response) {
          // If we don't get a response or there's an error, the extension might be having issues
          if (chrome.runtime.lastError || !response) {
            console.warn('Extension connection lost');
            
            // Store the URL
            try {
              localStorage.setItem('last_closed_pdf', pdfUrl);
              sessionStorage.setItem('last_closed_pdf', pdfUrl);
            } catch (e) {
              console.error('Failed to store URL:', e);
            }
            
            // Show the notification
            const notification = document.getElementById('pdf-extension-notification');
            if (notification) {
              notification.style.display = 'block';
            }
          } else {
            // Hide the notification if the extension is working
            const notification = document.getElementById('pdf-extension-notification');
            if (notification) {
              notification.style.display = 'none';
            }
          }
        });
      } catch (e) {
        // If we can't send a message, the extension is definitely having issues
        console.error('Extension communication error:', e);
        
        // Show the notification
        const notification = document.getElementById('pdf-extension-notification');
        if (notification) {
          notification.style.display = 'block';
        }
        
        // Try to store the URL in any way possible
        try {
          localStorage.setItem('last_closed_pdf', pdfUrl);
          sessionStorage.setItem('last_closed_pdf', pdfUrl);
          document.cookie = `last_closed_pdf=${encodeURIComponent(pdfUrl)};path=/;max-age=60`;
        } catch (innerError) {
          console.error('Failed to store PDF URL during extension error:', innerError);
        }
      }
    };
    
    // Check immediately and then periodically
    checkExtensionConnection();
    const intervalId = setInterval(checkExtensionConnection, 2000);
    
    // Clean up when the page is unloaded
    window.addEventListener('unload', function() {
      clearInterval(intervalId);
    });
  }
})(); 