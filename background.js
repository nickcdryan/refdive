// background.js

// Store information about active PDF tabs
const pdfTabs = {};
let isExtensionRefreshing = false;

// Register for unload events to track when extension is being refreshed/disabled
chrome.runtime.onSuspend.addListener(() => {
    console.log("Extension being suspended, marking as refreshing");
    isExtensionRefreshing = true;
    
    // Save all active PDF tabs to local storage for recovery
    chrome.storage.local.set({ 'pdfTabs': pdfTabs, 'isRefreshing': true });
});

// Handle extension startup - restore tabs if needed
chrome.runtime.onStartup.addListener(restoreTabsIfNeeded);
chrome.runtime.onInstalled.addListener(restoreTabsIfNeeded);

function restoreTabsIfNeeded() {
    // Check if we were in the middle of a refresh
    chrome.storage.local.get(['pdfTabs', 'isRefreshing'], function(result) {
        if (result.isRefreshing && result.pdfTabs) {
            console.log("Extension was refreshed, attempting to restore tabs");
            
            // Restore each tab
            const savedTabs = result.pdfTabs;
            for (const tabId in savedTabs) {
                const pdfUrl = savedTabs[tabId].originalUrl;
                
                // Open a new tab with the original PDF URL
                if (pdfUrl) {
                    console.log(`Restoring tab with URL: ${pdfUrl}`);
                    chrome.tabs.create({ url: pdfUrl });
                }
            }
            
            // Clear the refreshing flag
            chrome.storage.local.set({ 'isRefreshing': false });
        }
    });
}

// Setup the PDF redirecting rule
function setupPdfRedirectRule() {
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1], // Remove old rule if exists
        addRules: [{
            id: 1,
            priority: 1,
            action: {
                type: "redirect",
                redirect: {
                    transform: {
                        queryTransform: {
                            addOrReplaceParams: [{
                                key: "file",
                                value: "{url}"
                            }]
                        },
                        scheme: "chrome-extension",
                        host: chrome.runtime.id,
                        path: "/web/viewer.html"
                    }
                }
            },
            condition: {
                urlFilter: ".pdf",
                excludeUrlFilter: "refdive_native=true",
                resourceTypes: ["main_frame"]
            }
        }]
    });
}

// Initialize by setting up the PDF redirect rule
setupPdfRedirectRule();

// Store favicon information
const faviconCache = new Map();

// Track tab updates to identify PDF tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Track tabs viewing PDFs with our extension
    if (tab.url && tab.url.includes(`chrome-extension://${chrome.runtime.id}/web/viewer.html`)) {
        try {
            const url = new URL(tab.url);
            const originalPdfUrl = url.searchParams.get('file');
            
            if (originalPdfUrl) {
                console.log(`Tracking PDF tab ${tabId} with original URL: ${originalPdfUrl}`);
                
                // Store tab information
                pdfTabs[tabId] = {
                    originalUrl: originalPdfUrl,
                    timestamp: Date.now(),
                    title: tab.title || "PDF Document"
                };
                
                // Save to storage for persistence
                chrome.storage.local.set({ 'pdfTabs': pdfTabs });
            }
        } catch (error) {
            console.error("Error tracking PDF tab:", error);
        }
    }
});

// Track tab removals to detect when our PDF tabs are closed unexpectedly
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Check if this was one of our PDF tabs
    if (pdfTabs[tabId]) {
        const tabInfo = pdfTabs[tabId];
        
        // If the extension is refreshing, we'll handle reconnection on restart
        if (!isExtensionRefreshing) {
            // If tab was closed unexpectedly (not by user), reopen it
            if (removeInfo.isWindowClosing === false && tabInfo.originalUrl) {
                console.log(`Tab ${tabId} with PDF was closed unexpectedly. Reopening: ${tabInfo.originalUrl}`);
                
                // Reopen the PDF in a new tab
                chrome.tabs.create({ url: tabInfo.originalUrl });
            }
        }
        
        // Remove from our tracking
        delete pdfTabs[tabId];
        faviconCache.delete(tabId);
        
        // Update storage
        chrome.storage.local.set({ 'pdfTabs': pdfTabs });
    } else {
        // Just clean up any favicon cache
        faviconCache.delete(tabId);
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'storeFavicon') {
        faviconCache.set(sender.tab.id, message.favicon);
    } else if (message.type === 'getFavicon') {
        sendResponse({ favicon: faviconCache.get(sender.tab.id) });
    } else if (message.type === 'registerPdfTab') {
        const tabId = sender.tab.id;
        
        // Store information about this PDF tab
        pdfTabs[tabId] = {
            originalUrl: message.originalUrl,
            timestamp: Date.now(),
            title: sender.tab.title || "PDF Document"
        };
        
        // Save to storage for persistence
        chrome.storage.local.set({ 'pdfTabs': pdfTabs });
        
        // Acknowledge registration
        sendResponse({ status: 'registered' });
    } else if (message.type === 'ping') {
        // Simple response to check if extension is still active
        sendResponse({ status: 'active' });
    } else if (message.type === 'tabClosed') {
        // A content script has detected that its tab might be closing
        const tabId = sender.tab.id;
        if (pdfTabs[tabId] && pdfTabs[tabId].originalUrl) {
            console.log(`Content script reported tab ${tabId} is closing. URL: ${pdfTabs[tabId].originalUrl}`);
            
            // Store this URL as the last closed tab for recovery
            chrome.storage.local.set({ 
                'lastClosedPdfTab': {
                    url: pdfTabs[tabId].originalUrl,
                    timestamp: Date.now()
                }
            });
        }
    }
    
    return true;
});