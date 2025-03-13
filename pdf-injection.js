// pdf-injection.js
// This script is injected into native PDF pages to offer our enhanced viewer

(function() {
  // Get the current URL
  const currentUrl = window.location.href;
  console.log('PDF detected, offering enhanced viewer for:', currentUrl);
  
  // Let the background script know we found a PDF
  chrome.runtime.sendMessage({
    type: 'pdfDetected',
    url: currentUrl
  });
  
  // Create the banner to offer our enhanced viewer
  function createViewerBanner() {
    // Create container
    const banner = document.createElement('div');
    banner.id = 'refdive-pdf-banner';
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.backgroundColor = '#f1f5f9';
    banner.style.color = '#334155';
    banner.style.padding = '12px';
    banner.style.fontSize = '14px';
    banner.style.fontFamily = 'Arial, sans-serif';
    banner.style.zIndex = '99999';
    banner.style.display = 'flex';
    banner.style.justifyContent = 'space-between';
    banner.style.alignItems = 'center';
    banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    banner.style.transition = 'transform 0.3s ease-in-out';
    
    // Left content
    const textDiv = document.createElement('div');
    textDiv.textContent = 'Use RefDive enhanced PDF viewer?';
    textDiv.style.fontWeight = 'bold';
    
    // Button container
    const buttonContainer = document.createElement('div');
    
    // Open in enhanced viewer button
    const enhancedButton = document.createElement('button');
    enhancedButton.textContent = 'Open Enhanced Viewer';
    enhancedButton.style.backgroundColor = '#3b82f6';
    enhancedButton.style.color = 'white';
    enhancedButton.style.border = 'none';
    enhancedButton.style.borderRadius = '4px';
    enhancedButton.style.padding = '8px 12px';
    enhancedButton.style.marginRight = '8px';
    enhancedButton.style.cursor = 'pointer';
    enhancedButton.style.fontWeight = 'bold';
    enhancedButton.style.transition = 'background-color 0.2s';
    
    // Hover effect
    enhancedButton.onmouseover = function() {
      enhancedButton.style.backgroundColor = '#2563eb';
    };
    enhancedButton.onmouseout = function() {
      enhancedButton.style.backgroundColor = '#3b82f6';
    };
    
    // Click event
    enhancedButton.onclick = function() {
      // Send message to background script to launch the enhanced viewer
      chrome.runtime.sendMessage({
        type: 'launchPdfViewer',
        url: currentUrl
      }, function(response) {
        console.log('Launching enhanced viewer for PDF');
      });
    };
    
    // Dismiss button
    const dismissButton = document.createElement('button');
    dismissButton.textContent = 'Continue with Chrome PDF Viewer';
    dismissButton.style.backgroundColor = 'transparent';
    dismissButton.style.color = '#64748b';
    dismissButton.style.border = '1px solid #cbd5e1';
    dismissButton.style.borderRadius = '4px';
    dismissButton.style.padding = '8px 12px';
    dismissButton.style.cursor = 'pointer';
    dismissButton.style.transition = 'background-color 0.2s';
    
    // Hover effect
    dismissButton.onmouseover = function() {
      dismissButton.style.backgroundColor = '#f8fafc';
    };
    dismissButton.onmouseout = function() {
      dismissButton.style.backgroundColor = 'transparent';
    };
    
    // Click event
    dismissButton.onclick = function() {
      banner.style.transform = 'translateY(-100%)';
      
      // Hide banner permanently
      setTimeout(function() {
        banner.style.display = 'none';
      }, 300);
      
      // Remember this choice for this PDF
      try {
        localStorage.setItem('refdive_pdf_choice_' + encodeURIComponent(currentUrl), 'native');
      } catch(e) {
        console.error('Failed to save choice:', e);
      }
    };
    
    // Remember choice checkbox
    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.marginRight = '12px';
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.alignItems = 'center';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'remember-choice';
    checkbox.style.margin = '0 6px 0 0';
    
    const label = document.createElement('label');
    label.htmlFor = 'remember-choice';
    label.textContent = 'Remember my choice';
    label.style.fontSize = '12px';
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    
    // Add elements to banner
    buttonContainer.appendChild(checkboxContainer);
    buttonContainer.appendChild(dismissButton);
    buttonContainer.appendChild(enhancedButton);
    
    banner.appendChild(textDiv);
    banner.appendChild(buttonContainer);
    
    return banner;
  }
  
  // Check if we should show the banner
  function shouldShowBanner() {
    try {
      // Check if user has chosen to use native viewer for this PDF
      const userChoice = localStorage.getItem('refdive_pdf_choice_' + encodeURIComponent(currentUrl));
      if (userChoice === 'native') {
        return false;
      }
      
      // Check for global preference
      const globalChoice = localStorage.getItem('refdive_pdf_global_choice');
      if (globalChoice === 'native') {
        return false;
      } else if (globalChoice === 'enhanced') {
        // Auto-launch enhanced viewer
        setTimeout(function() {
          chrome.runtime.sendMessage({
            type: 'launchPdfViewer',
            url: currentUrl
          });
        }, 100);
        return false;
      }
      
      // Show by default
      return true;
    } catch(e) {
      console.error('Error checking PDF viewer preference:', e);
      return true;
    }
  }
  
  // Wait for document to be ready
  function checkDocumentReady() {
    if (document.body) {
      if (shouldShowBanner()) {
        const banner = createViewerBanner();
        document.body.appendChild(banner);
      }
    } else {
      setTimeout(checkDocumentReady, 10);
    }
  }
  
  // Start checking if document is ready
  checkDocumentReady();
  
  // Also listen for extension disconnection
  window.addEventListener('error', function(e) {
    if (e && e.target && e.target.tagName === 'LINK' && 
        e.target.href && e.target.href.includes('chrome-extension://')) {
      console.log('Detected extension resource error - extension may be disabled');
    }
  }, true);
})(); 