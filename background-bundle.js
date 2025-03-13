// background-bundle.js
// A non-intercepting approach that keeps PDFs in Chrome's native viewer by default

// Store information about active enhanced PDF tabs
const pdfTabs = {};
let isExtensionRefreshing = false;

// On initialization, ensure we have a pdfHistory object
chrome.storage.local.get(['pdfHistory'], function(result) {
    if (!result.pdfHistory) {
        chrome.storage.local.set({ 'pdfHistory': {} });
        console.log("Initialized empty PDF history");
    } else {
        console.log(`Found existing PDF history with ${Object.keys(result.pdfHistory).length} entries`);
    }
});

// This flag helps us track first-time installation vs subsequent runs
chrome.storage.local.get(['extensionInitialized'], function(result) {
    if (!result.extensionInitialized) {
        // This is first run after installation/update
        chrome.storage.local.set({ 'extensionInitialized': true });
        
        // Show recovery page only during first run
        chrome.tabs.create({
            url: chrome.runtime.getURL("recovery.html"),
            active: true
        });
    }
});

// Handle extension suspension (e.g., when disabled or uninstalled)
chrome.runtime.onSuspend.addListener(() => {
    console.log("Extension being suspended, creating emergency HTML file");
    isExtensionRefreshing = true;
    
    // Save data for recovery
    chrome.storage.local.set({ 
        'pdfTabs': pdfTabs, 
        'isRefreshing': true,
        'lastSuspendTime': Date.now()
    });
    
    // Get current PDF history to include in the standalone file
    chrome.storage.local.get(['pdfHistory'], function(result) {
        // Create a self-contained HTML file that works completely offline
        const pdfHistoryString = JSON.stringify(result.pdfHistory || {});
        
        // The standalone HTML recovery page
        const standaloneHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RefDive Emergency PDF Recovery</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        h1 { color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .alert { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
        .description { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
        .pdf-list { background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
        .pdf-item { padding: 16px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; }
        .pdf-item:last-child { border-bottom: none; }
        .pdf-item:hover { background-color: #f3f4f6; }
        .pdf-icon { width: 36px; height: 36px; margin-right: 16px; background-color: #ef4444; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        .pdf-details { flex: 1; }
        .pdf-title { font-weight: 600; margin-bottom: 4px; }
        .pdf-url { color: #6b7280; font-size: 12px; max-width: 700px; overflow: hidden; text-overflow: ellipsis; }
        .pdf-time { color: #6b7280; font-size: 12px; margin-top: 4px; }
        .pdf-actions { display: flex; gap: 8px; }
        button { padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
        .open-pdf { background-color: #f3f4f6; color: #111827; }
        .open-pdf:hover { background-color: #e5e7eb; }
        .export-btn { background-color: #0891b2; color: white; }
        .no-pdfs { padding: 20px; text-align: center; color: #6b7280; }
        .search { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; width: 300px; margin-bottom: 16px; }
        .header-actions { margin-top: 16px; margin-bottom: 24px; }
    </style>
</head>
<body>
    <h1>RefDive Emergency PDF Recovery</h1>
    
    <div class="alert">
        <h3>⚠️ RefDive Extension Backup</h3>
        <p>This is an emergency recovery page containing your PDF history. It works completely independently from the extension.</p>
        <p><strong>Important:</strong> Keep this HTML file accessible in case you need to recover your PDFs!</p>
    </div>
    
    <div class="description">
        <h3>Your PDF History</h3>
        <p>Below are the PDFs you've viewed. You can click to open them in Chrome's native viewer.</p>
    </div>
    
    <div class="header-actions">
        <input type="text" class="search" id="searchInput" placeholder="Search for PDFs...">
        <button id="exportBtn" class="export-btn">Export as JSON</button>
    </div>
    
    <div class="pdf-list" id="pdfList"></div>
    
    <script>
        // Store the PDF history directly in the page
        const pdfHistory = ${pdfHistoryString};
        let filteredPdfs = [];
        
        // Format date helper
        function formatDate(timestamp) {
            if (!timestamp) return 'Unknown date';
            const date = new Date(timestamp);
            return date.toLocaleString();
        }
        
        // Export button handler
        document.getElementById('exportBtn').addEventListener('click', function() {
            const jsonData = JSON.stringify(pdfHistory, null, 2);
            const blob = new Blob([jsonData], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'refdive-pdf-history-' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        // Render the PDF list
        function renderPdfList(searchTerm = '') {
            const pdfList = document.getElementById('pdfList');
            pdfList.innerHTML = '';
            
            // Filter and sort PDFs
            filteredPdfs = Object.values(pdfHistory).filter(pdf => {
                return (pdf.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (pdf.url || '').toLowerCase().includes(searchTerm.toLowerCase());
            });
            
            filteredPdfs.sort((a, b) => {
                const aTime = a.lastVisited || a.timestamp;
                const bTime = b.lastVisited || b.timestamp;
                return bTime - aTime;
            });
            
            if (filteredPdfs.length === 0) {
                pdfList.innerHTML = '<div class="no-pdfs">No PDFs found in history.</div>';
                return;
            }
            
            // Create PDF items
            filteredPdfs.forEach(pdf => {
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
                time.textContent = 'Last viewed: ' + formatDate(pdf.lastVisited || pdf.timestamp);
                
                details.appendChild(title);
                details.appendChild(url);
                details.appendChild(time);
                
                const actions = document.createElement('div');
                actions.className = 'pdf-actions';
                
                const openPdf = document.createElement('button');
                openPdf.className = 'open-pdf';
                openPdf.textContent = 'Open PDF';
                openPdf.addEventListener('click', function() {
                    // Open directly
                    window.open(pdf.url, '_blank');
                });
                
                actions.appendChild(openPdf);
                
                item.appendChild(icon);
                item.appendChild(details);
                item.appendChild(actions);
                
                pdfList.appendChild(item);
            });
        }
        
        // Set up search
        document.getElementById('searchInput').addEventListener('input', function() {
            renderPdfList(this.value);
        });
        
        // Initial render when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            renderPdfList();
        });
        
        // Start rendering right away too
        renderPdfList();
    </script>
</body>
</html>
        `;
        
        // Create the downloadable file
        const blob = new Blob([standaloneHTML], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        
        // Create a download link and trigger download
        chrome.downloads.download({
            url: url,
            filename: 'refdive-recovery.html',
            saveAs: false
        }, function() {
            // Show notification that the file was downloaded
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon128.png',
                title: 'Recovery File Created',
                message: 'A recovery file has been downloaded. Open "refdive-recovery.html" for emergency PDF access.',
                priority: 2
            });
        });
        
        // Also try to open the recovery page before extension shuts down
        try {
            chrome.tabs.create({
                url: chrome.runtime.getURL("recovery.html") + "?auto_recovery=true",
                active: true
            });
        } catch (e) {
            console.error("Error opening recovery page:", e);
        }
    });
});

// Storage for persistent PDF history
function storePdfUrl(url, title) {
    if (!url || url === 'undefined' || url === 'null') {
        console.warn("Attempted to store invalid URL:", url);
        return;
    }
    
    console.log(`Storing PDF URL in history: ${url}`);
    
    // Store in chrome.storage for persistence
    chrome.storage.local.get(['pdfHistory'], function(result) {
        let history = result.pdfHistory || {};
        
        // Add this PDF to history with timestamp
        history[url] = {
            url: url,
            title: title || 'PDF Document',
            timestamp: Date.now(),
            lastVisited: Date.now()
        };
        
        // Save updated history
        chrome.storage.local.set({ 'pdfHistory': history }, function() {
            console.log(`Saved PDF history with ${Object.keys(history).length} entries`);
            // Notify the recovery page if it's open
            notifyHistoryUpdated();
        });
    });
}

// Notify any open recovery pages that the history has been updated
function notifyHistoryUpdated() {
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            if (tab.url && tab.url.includes(chrome.runtime.getURL("recovery.html"))) {
                chrome.tabs.sendMessage(tab.id, { type: 'historyUpdated' })
                    .catch(error => console.log("Recovery page not ready for updates yet"));
            }
        }
    });
}

// Function to launch our enhanced viewer for a specific PDF
function launchEnhancedViewer(tab, pdfUrl) {
    console.log(`Launching enhanced viewer for: ${pdfUrl}`);
    
    // Store the original URL first
    storePdfUrl(pdfUrl, tab.title);
    
    // Create the enhanced viewer URL
    const viewerUrl = `chrome-extension://${chrome.runtime.id}/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
    
    // Update the tab to our viewer
    chrome.tabs.update(tab.id, { url: viewerUrl });
    
    // Store information about this tab
    pdfTabs[tab.id] = {
        originalUrl: pdfUrl,
        timestamp: Date.now(),
        title: tab.title || "PDF Document"
    };
}

// Setup action for PDFs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only process complete updates with URLs
    if (!changeInfo.status || changeInfo.status !== 'complete' || !tab.url) {
        return;
    }
    
    // Check if this URL has our "native viewer" parameter
    const urlHasNativeParam = tab.url.includes('refdive_native=true');
    
    // Skip processing if this has our native viewer parameter
    if (urlHasNativeParam) {
        console.log(`Skipping PDF in tab ${tabId} due to native viewer parameter: ${tab.url}`);
        return;
    }
    
    // Look for PDF pages to show our action
    if (tab.url.toLowerCase().endsWith('.pdf') || tab.url.toLowerCase().includes('.pdf?')) {
        console.log(`Detected PDF in tab ${tabId}: ${tab.url}`);
        
        // Show action for PDFs
        chrome.action.setIcon({
            tabId: tabId,
            path: {
                "16": "icon16.png",
                "48": "icon48.png",
                "128": "icon128.png"
            }
        });
        
        // Enable action
        chrome.action.enable(tabId);
        
        // Store this PDF in our history
        storePdfUrl(tab.url, tab.title);
    } 
    // Also track tabs using our enhanced viewer
    else if (tab.url.includes(`chrome-extension://${chrome.runtime.id}/web/viewer.html`)) {
        try {
            const url = new URL(tab.url);
            const originalPdfUrl = url.searchParams.get('file');
            
            if (originalPdfUrl) {
                console.log(`Tracking enhanced PDF tab ${tabId} with original URL: ${originalPdfUrl}`);
                
                // Store tab information
                pdfTabs[tabId] = {
                    originalUrl: originalPdfUrl,
                    timestamp: Date.now(),
                    title: tab.title || "PDF Document"
                };
                
                // Also save to history
                storePdfUrl(originalPdfUrl, tab.title);
            }
        } catch (error) {
            console.error("Error tracking enhanced PDF tab:", error);
        }
    } else {
        // Disable action for non-PDFs
        chrome.action.disable(tabId);
    }
});

// Handle action click
chrome.action.onClicked.addListener((tab) => {
    // Check if this is already a PDF
    if (tab.url && (tab.url.toLowerCase().endsWith('.pdf') || tab.url.toLowerCase().includes('.pdf?'))) {
        launchEnhancedViewer(tab, tab.url);
    } else {
        // Not a PDF, open the recovery page
        chrome.tabs.create({
            url: chrome.runtime.getURL("recovery.html"),
            active: true
        });
    }
});

// On install or update, create recovery page
chrome.runtime.onInstalled.addListener((details) => {
    // Show recovery page after update or install
    if (details.reason === "install" || details.reason === "update") {
        // Create recovery page
        chrome.tabs.create({
            url: chrome.runtime.getURL("recovery.html"),
            active: true
        });
    }
    
    // As a test, store some PDFs in history if it's empty
    chrome.storage.local.get(['pdfHistory'], function(result) {
        if (!result.pdfHistory || Object.keys(result.pdfHistory).length === 0) {
            console.log("Adding sample PDFs to history for testing");
            const samplePdfs = {
                'https://arxiv.org/pdf/2106.09685.pdf': {
                    url: 'https://arxiv.org/pdf/2106.09685.pdf',
                    title: 'Example ArXiv Paper',
                    timestamp: Date.now(),
                    lastVisited: Date.now()
                }
            };
            chrome.storage.local.set({ 'pdfHistory': samplePdfs });
        }
    });
    
    // Create context menu
    chrome.contextMenus.create({
        id: "open-recovery",
        title: "Open PDF History & Recovery",
        contexts: ["action"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-recovery") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("recovery.html"),
            active: true
        });
    }
});

// Listen for messages from recovery page and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getPdfHistory') {
        console.log("Received request for PDF history");
        // Return the PDF history for the recovery page
        chrome.storage.local.get(['pdfHistory'], function(result) {
            console.log(`Sending PDF history with ${Object.keys(result.pdfHistory || {}).length} entries`);
            sendResponse({ history: result.pdfHistory || {} });
        });
        return true; // Keep channel open for async response
    }
    else if (message.type === 'openPdf') {
        // Open a PDF from history in a new tab
        let url = message.url;
        
        // If native viewer is requested, add the parameter
        if (message.useNativeViewer) {
            url = url + (url.includes('?') ? '&' : '?') + 'refdive_native=true';
        }
        
        chrome.tabs.create({ url: url }, function(tab) {
            // Update the last visited timestamp
            chrome.storage.local.get(['pdfHistory'], function(result) {
                const history = result.pdfHistory || {};
                if (history[message.url]) {
                    history[message.url].lastVisited = Date.now();
                    chrome.storage.local.set({ 'pdfHistory': history });
                }
            });
        });
        sendResponse({ status: 'opening' });
    }
    else if (message.type === 'openEnhanced') {
        // Open a PDF in enhanced viewer
        chrome.tabs.create({ url: 'about:blank' }, function(tab) {
            launchEnhancedViewer(tab, message.url);
        });
        sendResponse({ status: 'opening' });
    }
    else if (message.type === 'clearHistory') {
        // Clear PDF history
        chrome.storage.local.set({ 'pdfHistory': {} });
        sendResponse({ status: 'cleared' });
    }
    else if (message.type === 'debugHistory') {
        // For debugging
        chrome.storage.local.get(['pdfHistory'], function(result) {
            console.log("Current PDF history:", result.pdfHistory);
            sendResponse({ history: result.pdfHistory || {} });
        });
        return true;
    }
    else if (message.type === 'openRecovery') {
        // Open recovery page
        chrome.tabs.create({
            url: chrome.runtime.getURL("recovery.html"),
            active: true
        });
        sendResponse({ status: 'opening' });
    }
    else if (message.type === 'ping') {
        sendResponse({ status: 'active' });
    }
    else if (message.type === 'savePdf') {
        // Store PDF URL and title in history
        if (message.url) {
            storePdfUrl(message.url, message.title);
            sendResponse({ status: 'saved' });
        } else {
            sendResponse({ status: 'error', message: 'No URL provided' });
        }
    }
    
    return true;
}); 