// recovery.js - A dedicated script for PDF tab recovery
// This script works even if the main extension is not functioning

// Check for recovery needed when the extension starts up
chrome.runtime.onStartup.addListener(attemptRecovery);
chrome.runtime.onInstalled.addListener(attemptRecovery);

// The main recovery function
function attemptRecovery() {
  console.log("Recovery script running...");
  
  // Check for tabs that need to be restored
  chrome.storage.local.get(['pdfTabs', 'isRefreshing', 'lastClosedPdfTab'], function(data) {
    // First check for normal refresh recovery
    if (data.isRefreshing && data.pdfTabs) {
      console.log("Found PDF tabs to recover after extension refresh");
      
      // Get all the tab data
      const tabsToRecover = data.pdfTabs;
      let recoveryCount = 0;
      
      // Restore each PDF tab
      for (const tabId in tabsToRecover) {
        const tabInfo = tabsToRecover[tabId];
        if (tabInfo && tabInfo.originalUrl) {
          // Add parameter to ensure it opens in Chrome's native viewer if needed
          const url = tabInfo.originalUrl + (tabInfo.originalUrl.includes('?') ? '&' : '?') + 'refdive_native=true';
          
          // Open a new tab with the original URL
          chrome.tabs.create({ 
            url: url,
            active: recoveryCount === 0 // Make only the first tab active
          });
          recoveryCount++;
        }
      }
      
      console.log(`Recovered ${recoveryCount} PDF tabs`);
      
      // Clear the recovery flag so we don't reopen these tabs again
      chrome.storage.local.set({ 'isRefreshing': false });
    }
    
    // Also check for any last closed PDF tab (for crash scenarios)
    if (data.lastClosedPdfTab) {
      const lastClosed = data.lastClosedPdfTab;
      
      // Only recover if it was closed recently (within last 10 seconds)
      const timeSinceClosed = Date.now() - lastClosed.timestamp;
      if (timeSinceClosed < 10000 && lastClosed.url) {
        console.log(`Recovering last closed PDF tab: ${lastClosed.url}`);
        
        // Add parameter to ensure it opens in Chrome's native viewer
        const url = lastClosed.url + (lastClosed.url.includes('?') ? '&' : '?') + 'refdive_native=true';
        
        // Open a new tab with the original URL
        chrome.tabs.create({ 
          url: url,
          active: true
        });
        
        // Clear the last closed tab so we don't reopen it again
        chrome.storage.local.remove('lastClosedPdfTab');
      }
    }
  });
}

// Also set up a periodic check to run the recovery
setInterval(function() {
  // Check if there are any recent closed tabs to recover
  chrome.storage.local.get(['lastClosedPdfTab'], function(data) {
    if (data.lastClosedPdfTab) {
      const lastClosed = data.lastClosedPdfTab;
      
      // Only recover if it was closed recently (within last 5 seconds)
      const timeSinceClosed = Date.now() - lastClosed.timestamp;
      if (timeSinceClosed < 5000 && lastClosed.url) {
        console.log(`Periodic check found recently closed PDF tab: ${lastClosed.url}`);
        
        // Open a new tab with the original URL
        chrome.tabs.create({ url: lastClosed.url });
        
        // Clear the last closed tab data
        chrome.storage.local.remove('lastClosedPdfTab');
      }
    }
  });
}, 2000); // Check every 2 seconds

// Listen for any beforeUnload events from content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === 'beforeUnload') {
    const tabId = sender.tab.id;
    const pdfUrl = message.url;
    
    if (pdfUrl) {
      console.log(`Tab ${tabId} is about to unload. URL: ${pdfUrl}`);
      
      // Store this URL for recovery
      chrome.storage.local.set({
        'lastClosedPdfTab': {
          url: pdfUrl,
          timestamp: Date.now(),
          tabId: tabId
        }
      });
      
      // Respond to the content script
      sendResponse({ status: 'received' });
    }
  }
  return true;
});

// Check if this page was opened as a result of the extension being disabled
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const isAutoRecovery = urlParams.get('auto_recovery') === 'true';
    
    // Always show the bookmark button now for better discoverability
    document.getElementById('bookmarkBtn').style.display = 'inline-block';
    
    if (isAutoRecovery) {
        // Show the recovery alert
        document.getElementById('recoveryAlert').style.display = 'block';
    }
    
    // Debug logging
    function log(message) {
        console.log(message);
        const debugPanel = document.getElementById('debugPanel');
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        debugPanel.appendChild(entry);
        
        // Auto-scroll to bottom
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    // Function to format date
    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }
    
    // Check extension status
    function checkExtensionStatus() {
        const statusElement = document.getElementById('extensionStatus');
        statusElement.textContent = 'Checking...';
        statusElement.className = 'status-indicator extension-checking';
        
        try {
            chrome.runtime.sendMessage({type: 'ping'}, function(response) {
                if (chrome.runtime.lastError) {
                    setInactiveMode();
                    return;
                }
                
                if (response && response.status === 'active') {
                    statusElement.textContent = 'Extension Active';
                    statusElement.className = 'status-indicator extension-active';
                    document.getElementById('standaloneBanner').style.display = 'none';
                } else {
                    setInactiveMode();
                }
            });
            
            // If we get to here without an error, the extension is available
            // but set a timeout in case the message handler never responds
            setTimeout(() => {
                if (statusElement.textContent === 'Checking...') {
                    setInactiveMode();
                }
            }, 1000);
        } catch (e) {
            setInactiveMode();
        }
    }
    
    // Set inactive mode UI
    function setInactiveMode() {
        const statusElement = document.getElementById('extensionStatus');
        statusElement.textContent = 'Extension Inactive';
        statusElement.className = 'status-indicator extension-inactive';
        document.getElementById('standaloneBanner').style.display = 'block';
        
        // Disable enhanced viewer buttons since they won't work without the extension
        document.querySelectorAll('.open-enhanced').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.title = 'Enhanced viewer requires the extension to be active';
        });
        
        // Try to load PDFs from localStorage backup
        tryLocalStorageBackup();
    }
    
    // Function to create PDF list item
    function createPdfItem(pdf) {
        const item = document.createElement('div');
        item.className = 'pdf-item';
        
        const icon = document.createElement('div');
        icon.className = 'pdf-icon';
        icon.textContent = 'PDF';
        
        const details = document.createElement('div');
        details.className = 'pdf-details';
        
        const title = document.createElement('div');
        title.className = 'pdf-title';
        title.textContent = pdf.title || 'PDF Document';
        
        const url = document.createElement('div');
        url.className = 'pdf-url';
        url.textContent = pdf.url;
        
        const time = document.createElement('div');
        time.className = 'pdf-time';
        time.textContent = `Last viewed: ${formatDate(pdf.lastVisited || pdf.timestamp)}`;
        
        details.appendChild(title);
        details.appendChild(url);
        details.appendChild(time);
        
        const actions = document.createElement('div');
        actions.className = 'pdf-actions';
        
        const openPdf = document.createElement('button');
        openPdf.className = 'open-pdf';
        openPdf.textContent = 'Open PDF';
        openPdf.addEventListener('click', function() {
            // Open directly in a new tab
            window.open(pdf.url, '_blank');
            
            // Also try to message the extension if it's still available
            try {
                chrome.runtime.sendMessage({
                    type: 'openPdf',
                    url: pdf.url,
                    useNativeViewer: false // Don't try to use native viewer anymore
                });
            } catch (e) {
                log(`Extension not available, opening PDF directly: ${e.message}`);
                // Update the last visited time in localStorage
                updateLocalStorageVisitTime(pdf.url);
            }
        });
        
        const openEnhanced = document.createElement('button');
        openEnhanced.className = 'open-enhanced';
        openEnhanced.textContent = 'Open in RefDive';
        openEnhanced.addEventListener('click', function() {
            // Try to message the extension
            try {
                chrome.runtime.sendMessage({
                    type: 'openEnhanced',
                    url: pdf.url
                }, function(response) {
                    if (!response) {
                        log(`No response from extension, opening PDF directly`);
                        // Add parameter to ensure it opens in Chrome's native viewer
                        const nativeViewerUrl = pdf.url + (pdf.url.includes('?') ? '&' : '?') + 'refdive_native=true';
                        window.open(nativeViewerUrl, '_blank');
                        updateLocalStorageVisitTime(pdf.url);
                    }
                });
            } catch (e) {
                log(`Extension not available: ${e.message}`);
                // If messaging fails, just open the PDF directly with native viewer parameter
                const nativeViewerUrl = pdf.url + (pdf.url.includes('?') ? '&' : '?') + 'refdive_native=true';
                window.open(nativeViewerUrl, '_blank');
                updateLocalStorageVisitTime(pdf.url);
            }
        });
        
        actions.appendChild(openPdf);
        actions.appendChild(openEnhanced);
        
        item.appendChild(icon);
        item.appendChild(details);
        item.appendChild(actions);
        
        return item;
    }
    
    // Update visit time in localStorage
    function updateLocalStorageVisitTime(url) {
        try {
            const historyString = localStorage.getItem('pdfHistory');
            if (historyString) {
                const history = JSON.parse(historyString);
                if (history[url]) {
                    history[url].lastVisited = Date.now();
                    localStorage.setItem('pdfHistory', JSON.stringify(history));
                    log(`Updated last visited time for ${url} in localStorage`);
                }
            }
        } catch (e) {
            log(`Error updating localStorage: ${e.message}`);
        }
    }
    
    // Variable to store current history
    let currentHistory = {};
    
    // Function to render PDF list
    function renderPdfList(pdfs, searchTerm = '') {
        log(`Rendering PDF list with ${Object.keys(pdfs).length} entries`);
        
        // Store the current history
        currentHistory = pdfs;
        
        // Save to localStorage as emergency backup
        try {
            localStorage.setItem('pdfHistory', JSON.stringify(pdfs));
            log('Saved history to localStorage backup');
        } catch (e) {
            log(`Error saving to localStorage: ${e.message}`);
        }
        
        const pdfList = document.getElementById('pdfList');
        pdfList.innerHTML = '';
        
        const filteredPdfs = Object.values(pdfs).filter(pdf => {
            return (pdf.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (pdf.url || '').toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        // Sort by last visited, most recent first
        filteredPdfs.sort((a, b) => {
            const aTime = a.lastVisited || a.timestamp;
            const bTime = b.lastVisited || b.timestamp;
            return bTime - aTime;
        });
        
        if (filteredPdfs.length === 0) {
            const noPdfs = document.createElement('div');
            noPdfs.className = 'no-pdfs';
            noPdfs.textContent = searchTerm ? 'No PDFs match your search.' : 'No PDFs found in history.';
            pdfList.appendChild(noPdfs);
            return;
        }
        
        filteredPdfs.forEach(pdf => {
            pdfList.appendChild(createPdfItem(pdf));
        });
        
        // Update UI based on extension status
        checkExtensionStatus();
    }
    
    // Function to get PDF history
    function getPdfHistory() {
        log("Requesting PDF history");
        
        // Try direct communication with the extension
        try {
            chrome.runtime.sendMessage({type: 'getPdfHistory'}, function(response) {
                if (chrome.runtime.lastError) {
                    log(`Extension error: ${chrome.runtime.lastError.message}`);
                    tryLocalStorageBackup();
                    return;
                }
                
                if (response && response.history) {
                    log(`Received PDF history with ${Object.keys(response.history).length} entries`);
                    renderPdfList(response.history);
                } else {
                    log("No response from extension or empty history");
                    // Try to use localStorage backup
                    tryLocalStorageBackup();
                }
            });
        } catch (e) {
            log(`Error communicating with extension: ${e.message}`);
            // If direct communication fails, try localStorage
            tryLocalStorageBackup();
        }
    }
    
    // Function to try localStorage backup
    function tryLocalStorageBackup() {
        log("Trying localStorage backup");
        try {
            const historyString = localStorage.getItem('pdfHistory');
            if (historyString) {
                const history = JSON.parse(historyString);
                log(`Found ${Object.keys(history).length} entries in localStorage backup`);
                renderPdfList(history);
            } else {
                // No backup found, show empty state
                renderPdfList({});
            }
        } catch (e) {
            log(`Error accessing localStorage backup: ${e.message}`);
            renderPdfList({});
        }
    }
    
    // Function to show debug info
    function showDebugInfo() {
        // Try direct communication with the extension
        try {
            chrome.runtime.sendMessage({type: 'debugHistory'}, function(response) {
                if (chrome.runtime.lastError) {
                    log(`Extension error: ${chrome.runtime.lastError.message}`);
                    return;
                }
                
                if (response && response.history) {
                    log("Received debug history from extension:");
                    log(JSON.stringify(response.history, null, 2));
                } else {
                    log("No debug response from extension");
                }
            });
        } catch (e) {
            log(`Extension not available for debug: ${e.message}`);
        }
        
        // Also check local storage
        try {
            log("--- Emergency Backup Info ---");
            const historyString = localStorage.getItem('pdfHistory');
            if (historyString) {
                const history = JSON.parse(historyString);
                log(`localStorage backup contains ${Object.keys(history).length} PDFs`);
                const sample = Object.keys(history).slice(0, 3);
                log(`Sample URLs: ${sample.join(', ')}`);
            } else {
                log("No localStorage backup found");
            }
            
            const keys = Object.keys(localStorage);
            log(`All localStorage keys (${keys.length}): ${keys.join(', ')}`);
        } catch (e) {
            log(`Error accessing localStorage: ${e.message}`);
        }
        
        // Show information about the current mode
        const statusElement = document.getElementById('extensionStatus');
        log(`Current status: ${statusElement.textContent}`);
        log(`Auto-recovery mode: ${isAutoRecovery}`);
        log(`URL: ${window.location.href}`);
        log(`User Agent: ${navigator.userAgent}`);
    }
    
    // Helper function to bookmark the page
    function bookmarkPage() {
        if (window.sidebar && window.sidebar.addPanel) { // Firefox
            window.sidebar.addPanel(document.title, window.location.href, '');
        } else if (window.external && ('AddFavorite' in window.external)) { // IE
            window.external.AddFavorite(window.location.href, document.title);
        } else { // Chrome, Safari, etc.
            alert('Press ' + (navigator.userAgent.toLowerCase().indexOf('mac') != -1 ? 'Command/Cmd' : 'CTRL') + ' + D to bookmark this page.');
        }
    }
    
    log("Recovery page loaded");
    
    // Set up all bookmark buttons
    document.querySelectorAll('.bookmark-btn, #bookmarkThisPage').forEach(btn => {
        btn.addEventListener('click', bookmarkPage);
    });
    
    // Check if extension is available
    checkExtensionStatus();
    
    // Listen for messages from the extension if it's available
    try {
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            if (message.type === 'historyUpdated') {
                log("Received history update, refreshing list");
                getPdfHistory();
            }
        });
    } catch (e) {
        log("Cannot listen for extension messages - running in standalone mode");
        setInactiveMode();
    }
    
    // Set up debug button
    const debugBtn = document.getElementById('debugBtn');
    debugBtn.addEventListener('click', function() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel.style.display === 'block') {
            debugPanel.style.display = 'none';
            debugBtn.textContent = 'Debug';
        } else {
            debugPanel.style.display = 'block';
            debugBtn.textContent = 'Hide Debug';
            showDebugInfo();
        }
    });
    
    // Set up refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', function() {
        log("Manual refresh requested");
        getPdfHistory();
    });
    
    // Setup search
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        renderPdfList(currentHistory, searchInput.value);
    });
    
    // Get initial history
    getPdfHistory();
    
    // Add a test PDF button
    const testPdf = document.createElement('button');
    testPdf.textContent = 'Add Test PDF';
    testPdf.style.backgroundColor = '#f59e0b';
    testPdf.style.color = 'white';
    testPdf.style.marginLeft = '8px';
    testPdf.addEventListener('click', function() {
        // Generate a unique test URL
        const timestamp = Date.now();
        const testUrl = `https://example.com/test-${timestamp}.pdf`;
        log(`Adding test PDF: ${testUrl}`);
        
        // Add to history
        try {
            // Try extension first
            chrome.runtime.sendMessage({
                type: 'openPdf',
                url: testUrl,
                useNativeViewer: true
            }, function(response) {
                if (chrome.runtime.lastError) {
                    addTestPdfToLocalStorage(testUrl);
                    return;
                }
                
                log(`Response from extension: ${JSON.stringify(response)}`);
            });
        } catch (e) {
            log(`Extension not available, adding to localStorage only: ${e.message}`);
            addTestPdfToLocalStorage(testUrl);
        }
        
        // Refresh after a moment
        setTimeout(getPdfHistory, 500);
    });
    
    // Function to add test PDF directly to localStorage
    function addTestPdfToLocalStorage(url) {
        try {
            const historyString = localStorage.getItem('pdfHistory');
            const history = historyString ? JSON.parse(historyString) : {};
            
            history[url] = {
                url: url,
                title: `Test PDF (${new Date().toLocaleTimeString()})`,
                timestamp: Date.now(),
                lastVisited: Date.now()
            };
            
            localStorage.setItem('pdfHistory', JSON.stringify(history));
            log(`Added test PDF to localStorage backup`);
            
            // Immediately show the updated list
            renderPdfList(history);
        } catch (e) {
            log(`Error adding to localStorage: ${e.message}`);
        }
    }
    
    document.querySelector('.action-buttons').appendChild(testPdf);
    
    // Create direct link button
    const directButton = document.createElement('button');
    directButton.textContent = 'Add Direct Link';
    directButton.style.backgroundColor = '#8b5cf6';
    directButton.style.color = 'white';
    directButton.style.marginLeft = '8px';
    directButton.addEventListener('click', function() {
        const url = prompt('Enter PDF URL to add:');
        if (url) {
            log(`Adding direct URL: ${url}`);
            
            // Try extension first, then fall back to localStorage
            try {
                chrome.runtime.sendMessage({
                    type: 'openPdf',
                    url: url,
                    useNativeViewer: true
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        addDirectUrlToLocalStorage(url);
                        return;
                    }
                    log(`Response from extension: ${JSON.stringify(response)}`);
                });
            } catch (e) {
                log(`Extension not available, adding to localStorage: ${e.message}`);
                addDirectUrlToLocalStorage(url);
            }
            
            // Refresh after a moment
            setTimeout(getPdfHistory, 500);
        }
    });
    
    // Function to add direct URL to localStorage
    function addDirectUrlToLocalStorage(url) {
        try {
            const historyString = localStorage.getItem('pdfHistory');
            const history = historyString ? JSON.parse(historyString) : {};
            
            history[url] = {
                url: url,
                title: url.split('/').pop() || 'PDF Document',
                timestamp: Date.now(),
                lastVisited: Date.now()
            };
            
            localStorage.setItem('pdfHistory', JSON.stringify(history));
            log(`Added direct URL to localStorage backup`);
            
            // Immediately show the updated list
            renderPdfList(history);
        } catch (e) {
            log(`Error adding to localStorage: ${e.message}`);
        }
    }
    
    document.querySelector('.action-buttons').appendChild(directButton);
    
    // Add Export/Import buttons for backup
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export History';
    exportButton.style.backgroundColor = '#0891b2';
    exportButton.style.color = 'white';
    exportButton.style.marginLeft = '8px';
    exportButton.addEventListener('click', function() {
        try {
            const historyString = localStorage.getItem('pdfHistory');
            if (!historyString) {
                alert('No PDF history to export');
                return;
            }
            
            // Create download link
            const blob = new Blob([historyString], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `refdive-pdf-history-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            log(`Error exporting history: ${e.message}`);
            alert('Error exporting history: ' + e.message);
        }
    });
    
    const importButton = document.createElement('button');
    importButton.textContent = 'Import History';
    importButton.style.backgroundColor = '#0d9488';
    importButton.style.color = 'white';
    importButton.style.marginLeft = '8px';
    importButton.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const history = JSON.parse(e.target.result);
                    localStorage.setItem('pdfHistory', JSON.stringify(history));
                    log(`Imported PDF history with ${Object.keys(history).length} entries`);
                    getPdfHistory();
                } catch (e) {
                    log(`Error importing history: ${e.message}`);
                    alert('Error importing history: ' + e.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
    
    document.querySelector('.action-buttons').appendChild(exportButton);
    document.querySelector('.action-buttons').appendChild(importButton);
    
    // Test storage with a simple initial history item
    // Add a sample PDF to help with initial testing
    if (!localStorage.getItem('pdfHistory')) {
        addTestPdfToLocalStorage('https://example.com/sample.pdf');
    }
    
    // Check extension status periodically
    setInterval(checkExtensionStatus, 10000);
}); 