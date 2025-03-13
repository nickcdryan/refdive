console.log('RefDive content script starting...');

// Store the original title and URL
if (document.title) {
    localStorage.setItem('originalTabTitle', document.title);
}

// Capture and store PDF URL if this is a PDF page
if (document.contentType === 'application/pdf' || window.location.pathname.endsWith('.pdf')) {
    const originalPdfUrl = window.location.href;
    console.log('Storing original PDF URL:', originalPdfUrl);
    
    // Store in multiple places for maximum recoverability
    try {
        localStorage.setItem('pdfUrl', originalPdfUrl);
        sessionStorage.setItem('pdfUrl', originalPdfUrl);
        document.cookie = `pdfUrl=${encodeURIComponent(originalPdfUrl)};path=/;max-age=86400`;
    } catch (e) {
        console.error('Failed to store original PDF URL:', e);
    }
}

// Capture favicon before page override
function captureFavicon() {
    let faviconUrl = '';
    
    // Try to get from link tags first
    const linkTags = document.querySelectorAll('link[rel*="icon"]');
    if (linkTags.length > 0) {
        const sorted = Array.from(linkTags).sort((a, b) => {
            const sizeA = parseInt(a.getAttribute('sizes')?.split('x')[0] || '0');
            const sizeB = parseInt(b.getAttribute('sizes')?.split('x')[0] || '0');
            return sizeB - sizeA;
        });
        faviconUrl = sorted[0].href;
        console.log('Found favicon in link tags:', faviconUrl);
    }
    
    // Fallback to default location
    if (!faviconUrl) {
        faviconUrl = new URL('/favicon.ico', window.location.origin).href;
    }
    
    // Store in background script
    chrome.runtime.sendMessage({
        type: 'storeFavicon',
        favicon: faviconUrl
    });
}

// If this is a PDF, process it
if (document.contentType === 'application/pdf' || window.location.pathname.endsWith('.pdf')) {
    const pdfUrl = window.location.href;
    const viewerUrl = chrome.runtime.getURL('web/viewer.html');
    const standaloneUrl = chrome.runtime.getURL('standalone.html');
    
    console.log('=== PDF Loading Process ===');
    console.log('1. PDF URL:', pdfUrl);
    console.log('2. Viewer URL:', viewerUrl);
    
    // Run favicon capture
    captureFavicon();
    
    // Register this PDF tab with the background script
    chrome.runtime.sendMessage({
        type: 'registerPdfTab',
        originalUrl: pdfUrl
    });
    
    // Process the PDF for viewing
    fetch(pdfUrl)
        .then(response => response.blob())
        .then(blob => {
            console.log('3. Blob created:', {
                type: blob.type,
                size: blob.size
            });
            
            // Convert blob to base64
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        })
        .then(base64data => {
            console.log('4. Base64 data created');
            
            // Store the base64 data
            sessionStorage.setItem('pdfData', base64data);
            
            const finalUrl = `${viewerUrl}?file=${encodeURIComponent(pdfUrl)}`;
            console.log('5. Final URL:', finalUrl);
            
            // Load the standalone page in a hidden iframe as a fallback
            // This is a safety mechanism for when the extension is refreshed
            try {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = `${standaloneUrl}?pdf=${encodeURIComponent(pdfUrl)}`;
                document.body.appendChild(iframe);
                
                // Now proceed with loading the custom viewer
                window.location.replace(finalUrl);
            } catch (e) {
                console.error('Failed to create safety iframe:', e);
                window.location.replace(finalUrl);
            }
        })
        .catch(error => {
            console.error('Error processing PDF:', error);
            // If there's an error, we stay on the original PDF page
        });
}

// Special handling for extension pages
if (window.location.href.includes('chrome-extension://')) {
    // Check if we're in the viewer or in the standalone page
    if (window.location.href.includes('viewer.html')) {
        console.log('In viewer page - setting up extension health monitor');
        const standaloneUrl = chrome.runtime.getURL('standalone.html');
        const originalPdfUrl = new URLSearchParams(window.location.search).get('file');
        
        if (originalPdfUrl) {
            // Add a super simple inline fallback that works even if scripts are terminated mid-execution
            const fallbackScript = document.createElement('script');
            fallbackScript.textContent = `
                // This is a self-contained script that watches for extension errors
                window.addEventListener('error', function(e) {
                    if (e.message && (e.message.includes('Extension') || e.message.includes('chrome'))) {
                        window.location.href = "${standaloneUrl}?pdf=${encodeURIComponent(originalPdfUrl)}";
                    }
                });
                
                // Also directly check extension context
                function emergencyCheck() {
                    try {
                        if (typeof chrome === 'undefined' || !chrome.runtime) {
                            window.location.href = "${standaloneUrl}?pdf=${encodeURIComponent(originalPdfUrl)}";
                        }
                    } catch(e) {
                        window.location.href = "${standaloneUrl}?pdf=${encodeURIComponent(originalPdfUrl)}";
                    }
                }
                
                // Check immediately and then every 1 second
                emergencyCheck();
                setInterval(emergencyCheck, 1000);
            `;
            
            // Append the script to the document
            try {
                document.head.appendChild(fallbackScript);
            } catch (e) {
                console.error('Failed to add emergency script:', e);
            }
        }
    } else if (window.location.href.includes('standalone.html')) {
        // We're in the standalone page - no need to do anything special
        console.log('In standalone recovery page');
    }
}