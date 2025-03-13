// Extension lifecycle handling script

// Extract the original PDF URL from the current URL
function getOriginalPdfUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('file');
}

// Store the original PDF URL for fallback
const originalPdfUrl = getOriginalPdfUrl();

// Functions needed regardless of whether we have originalPdfUrl
// Set tab title based on PDF name instead of URL
function setDocumentTitle(url) {
  if (!url) return;
  
  // Extract filename from URL
  let filename = url.split('/').pop();
  
  // Remove query parameters if present
  if (filename.includes('?')) {
    filename = filename.split('?')[0];
  }
  
  // Remove .pdf extension
  if (filename.toLowerCase().endsWith('.pdf')) {
    filename = filename.slice(0, -4);
  }
  
  // Replace underscores and dashes with spaces
  filename = filename.replace(/[_-]/g, ' ');
  
  // Special handling for arXiv URLs to show paper title instead of ID
  if (url.includes('arxiv.org')) {
    // For arXiv, we'll set a generic title first, then try to fetch the real title
    document.title = 'arXiv Paper';
    
    // Try to extract the arXiv ID
    const arxivIdMatch = url.match(/\/(\d+\.\d+)(\.pdf)?$/);
    if (arxivIdMatch && arxivIdMatch[1]) {
      const arxivId = arxivIdMatch[1];
      document.title = `arXiv:${arxivId}`;
      
      // Attempt to fetch the actual paper title from the arXiv API
      fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`)
        .then(response => response.text())
        .then(data => {
          // Parse the XML response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data, 'text/xml');
          const title = xmlDoc.querySelector('entry > title');
          
          if (title && title.textContent) {
            document.title = title.textContent.trim();
            console.log('Updated document title from arXiv API:', document.title);
          }
        })
        .catch(error => {
          console.error('Error fetching arXiv metadata:', error);
        });
    }
  } else {
    // For non-arXiv PDFs, just use the decoded filename
    document.title = decodeURIComponent(filename);
  }
}

// Set favicon to match the source website
function setFavicon(url) {
  if (!url) return;
  
  try {
    // Extract the origin of the PDF URL
    const pdfOrigin = new URL(url).origin;
    const faviconUrl = `${pdfOrigin}/favicon.ico`;
    
    // Create a link element for the favicon
    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    
    // Remove any existing favicons
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(favicon => favicon.parentNode.removeChild(favicon));
    
    // Add the new favicon
    document.head.appendChild(link);
    console.log('Set favicon to:', faviconUrl);
  } catch (error) {
    console.error('Error setting favicon:', error);
  }
}

// Simple function to redirect to the original PDF
function redirectToOriginalPdf() {
  const url = getOriginalPdfUrl() || 
            localStorage.getItem('pdfUrl') || 
            sessionStorage.getItem('pdfUrl');
            
  if (url) {
    console.log('Redirecting to original PDF:', url);
    // Add parameter to ensure it opens in Chrome's native viewer
    const nativeViewerUrl = url + (url.includes('?') ? '&' : '?') + 'refdive_native=true';
    window.location.replace(nativeViewerUrl);
  }
}

// Store URL in multiple places for redundancy
try {
  if (originalPdfUrl) {
    localStorage.setItem('pdfUrl', originalPdfUrl);
    sessionStorage.setItem('pdfUrl', originalPdfUrl);
    document.cookie = `pdfUrl=${encodeURIComponent(originalPdfUrl)};path=/;max-age=86400`;
    console.log('Stored original PDF URL:', originalPdfUrl);
  }
} catch (e) {
  console.error('Failed to store PDF URL:', e);
}

// Apply title and favicon after document load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Use originalPdfUrl if available, otherwise try to get from storage
    const pdfUrl = originalPdfUrl || localStorage.getItem('pdfUrl') || sessionStorage.getItem('pdfUrl');
    if (pdfUrl) {
      setDocumentTitle(pdfUrl);
      setFavicon(pdfUrl);
    }
    
    // Add a background image
    addBackgroundImage();
  });
} else {
  const pdfUrl = originalPdfUrl || localStorage.getItem('pdfUrl') || sessionStorage.getItem('pdfUrl');
  if (pdfUrl) {
    setDocumentTitle(pdfUrl);
    setFavicon(pdfUrl);
  }
  
  // Add a background image
  addBackgroundImage();
}

// Function to add a background image to the viewer
function addBackgroundImage() {
  try {
    // Get a random background image
    const backgroundUrl = typeof getRandomBackgroundImage === 'function' 
      ? getRandomBackgroundImage() 
      : "https://images.unsplash.com/photo-1524055988636-436cfa46e59e?q=80&w=2400&auto=format&fit=crop";
    
    console.log('Using background image:', backgroundUrl);
    
    // Create a div for the background
    const bgDiv = document.createElement('div');
    bgDiv.id = 'refdive-background';
    
    bgDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: -1000;
      background-image: url('${backgroundUrl}');
      background-size: 100% auto;
      background-position: center;
      background-repeat: no-repeat;
      opacity: 0.25;
      pointer-events: none;
    `;
    
    // Add to the document
    document.body.appendChild(bgDiv);
    
    // Also update the background color of the body and viewer to be transparent/lighter
    document.body.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';
    
    // Try to find the viewer container and make it more transparent
    const viewerContainer = document.getElementById('viewerContainer');
    if (viewerContainer) {
      viewerContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';
    }
    
    // Add a control to change the background (optional)
    addBackgroundControls(bgDiv);
    
    console.log('Added background image to PDF viewer');
  } catch (e) {
    console.error('Error adding background image:', e);
  }
}

// Function to add controls to change the background (optional)
function addBackgroundControls(bgDiv) {
  try {
    // Create a small floating control
    const controlDiv = document.createElement('div');
    controlDiv.id = 'background-controls';
    controlDiv.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 4px;
      padding: 5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      z-index: 1000;
      font-size: 12px;
      display: flex;
      gap: 5px;
      align-items: center;
    `;
    
    // Add a refresh button to change the background
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄';
    refreshBtn.title = 'Change background';
    refreshBtn.style.cssText = `
      border: none;
      background: #f0f0f0;
      border-radius: 3px;
      cursor: pointer;
      padding: 3px 6px;
      font-size: 14px;
    `;
    refreshBtn.onclick = function() {
      if (typeof getRandomBackgroundImage === 'function') {
        const newBg = getRandomBackgroundImage();
        bgDiv.style.backgroundImage = `url('${newBg}')`;
      }
    };
    
    // Add opacity controls
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '50';
    opacitySlider.value = '25';  // Default to 25% opacity (more visible)
    opacitySlider.style.width = '60px';
    opacitySlider.title = 'Adjust background opacity';
    opacitySlider.onchange = function() {
      bgDiv.style.opacity = this.value / 100;
    };
    opacitySlider.oninput = function() {
      bgDiv.style.opacity = this.value / 100;
    };
    
    // Add controls to the page
    controlDiv.appendChild(refreshBtn);
    controlDiv.appendChild(document.createTextNode('Opacity:'));
    controlDiv.appendChild(opacitySlider);
    document.body.appendChild(controlDiv);
  } catch (e) {
    console.error('Error adding background controls:', e);
  }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Create a recovery button in the toolbar
  setTimeout(() => {
    // Look for the toolbar - give PDFjs time to initialize
    const toolbar = document.getElementById('toolbarViewerRight');
    if (toolbar) {
      // Recovery button removed - it was causing issues
      console.log('Open in Chrome button not created - feature disabled');
    }
  }, 1000);
  
  // Create a simple emergency fallback that will stay visible if extension context is lost
  const fallbackDiv = document.createElement('div');
  fallbackDiv.id = 'extension-fallback';
  fallbackDiv.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:white; z-index:99999; padding:20px; font-family:system-ui, sans-serif;';
  
  const title = document.createElement('h1');
  title.textContent = 'PDF Viewer Extension is Reloading';
  
  const urlPara = document.createElement('p');
  urlPara.textContent = 'Your PDF URL is: ';
  const urlCode = document.createElement('code');
  
  // Always get the most up-to-date URL
  const pdfUrl = getOriginalPdfUrl() || 
                localStorage.getItem('pdfUrl') || 
                sessionStorage.getItem('pdfUrl');
                
  if (pdfUrl) {
    urlCode.textContent = pdfUrl;
  } else {
    urlCode.textContent = '(URL not available)';
    urlCode.style.color = '#999';
  }
  
  urlPara.appendChild(urlCode);
  
  const linkPara = document.createElement('p');
  const link = document.createElement('a');
  try {
    // Always get the most up-to-date URL
    const pdfUrl = getOriginalPdfUrl() || 
                  localStorage.getItem('pdfUrl') || 
                  sessionStorage.getItem('pdfUrl');
                  
    if (pdfUrl) {
      // Just use the original URL without any additional parameters
      link.href = pdfUrl;
    } else {
      link.href = '#';
      link.onclick = function() {
        alert('Cannot find PDF URL to open. Try refreshing the page.');
        return false;
      };
    }
  } catch (e) {
    console.error('Error setting fallback link href:', e);
    link.href = '#';
    link.onclick = function() {
      alert('Error creating link. See console for details.');
      return false;
    };
  }
  link.textContent = 'Click here to reopen this PDF';
  link.style.color = 'blue';
  linkPara.appendChild(link);
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy URL';
  copyButton.onclick = function() {
    try {
      // Always get the most up-to-date URL
      const pdfUrl = getOriginalPdfUrl() || 
                    localStorage.getItem('pdfUrl') || 
                    sessionStorage.getItem('pdfUrl');
                    
      if (pdfUrl) {
        navigator.clipboard.writeText(pdfUrl);
        this.textContent = 'Copied!';
        setTimeout(() => {
          this.textContent = 'Copy URL';
        }, 2000);
      } else {
        alert('Cannot find PDF URL to copy. Try refreshing the page.');
      }
    } catch (e) {
      console.error('Error in copy button handler:', e);
      alert('Error copying URL. See console for details.');
    }
  };
  
  const message = document.createElement('p');
  message.textContent = 'The extension is likely being refreshed or updated. You can reopen the PDF after the extension is ready.';
  
  fallbackDiv.appendChild(title);
  fallbackDiv.appendChild(urlPara);
  fallbackDiv.appendChild(linkPara);
  fallbackDiv.appendChild(copyButton);
  fallbackDiv.appendChild(message);
  
  // Add the fallback div to the document
  document.body.appendChild(fallbackDiv);
  
  // Store PDF URL in extension history if possible
  try {
    // Always get the most up-to-date URL
    const pdfUrl = getOriginalPdfUrl() || 
                  localStorage.getItem('pdfUrl') || 
                  sessionStorage.getItem('pdfUrl');
                  
    if (pdfUrl) {
      const title = document.title || 'PDF Document';
      try {
        chrome.runtime.sendMessage({
          type: 'savePdf',
          url: pdfUrl,
          title: title
        });
      } catch (e) {
        console.warn('Could not save PDF to extension history:', e);
      }
    }
  } catch (e) {
    console.warn('Error in lifecycle handling:', e);
  }
});

// The main approach: detect Chrome extension context errors
window.addEventListener('error', function(event) {
  // Look for chrome extension context errors
  const errorText = event.message || '';
  if (errorText.includes('Extension context') || 
      errorText.includes('chrome') || 
      errorText.includes('extension')) {
    console.warn('Detected potential extension error:', errorText);
    redirectToOriginalPdf();
  }
});

// CRITICAL: Set up a heartbeat mechanism that reloads the PDF if extension stops responding
let lastHeartbeat = Date.now();

// Function that gets called regularly. If it stops getting called, the PDF will reload
function heartbeat() {
  lastHeartbeat = Date.now();
}

// Check if heartbeats are still happening
function checkHeartbeat() {
  const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
  if (timeSinceLastHeartbeat > 5000) { // 5 seconds without a heartbeat
    console.warn('No heartbeat detected for 5 seconds, reloading PDF');
    redirectToOriginalPdf();
  }
}

// Setup the heartbeat check to run every 2 seconds
const heartbeatCheckInterval = setInterval(checkHeartbeat, 2000);

// Initial heartbeat
heartbeat();

// Regular heartbeat from a separate timer
const heartbeatInterval = setInterval(heartbeat, 1000);

// Function to test if chrome API is available (will throw if extension context is lost)
function testChromeAPI() {
  try {
    // This should throw an error if extension context is invalid
    chrome.runtime.getURL('');
    // If we get here, the API is still working
    heartbeat();
  } catch (e) {
    console.error('Chrome API error detected, redirecting to original PDF');
    redirectToOriginalPdf();
  }
}

// Wait for DOM to be ready for secondary fallback
document.addEventListener('DOMContentLoaded', function() {
  // Check extension context every second
  setInterval(function() {
    try {
      // This will throw if extension context is lost
      if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined') {
        throw new Error('Extension context lost');
      }
      // Test extension API
      chrome.runtime.getURL('');
    } catch(e) {
      document.getElementById('extension-fallback').style.display = 'block';
    }
  }, 1000);
  
  // Also listen for errors
  window.addEventListener('error', function(e) {
    if (e.message && (e.message.includes('Extension') || e.message.includes('chrome'))) {
      document.getElementById('extension-fallback').style.display = 'block';
    }
  });
});

// Test the API regularly
const apiCheckInterval = setInterval(testChromeAPI, 1000);

// Clean up intervals on page unload
window.addEventListener('beforeunload', function() {
  clearInterval(heartbeatCheckInterval);
  clearInterval(heartbeatInterval);
  clearInterval(apiCheckInterval);
}); 