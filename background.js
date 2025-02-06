// background.js
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
            resourceTypes: ["main_frame"]
        }
    }]
});

const faviconCache = new Map();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'storeFavicon') {
        faviconCache.set(sender.tab.id, message.favicon);
    } else if (message.type === 'getFavicon') {
        sendResponse({ favicon: faviconCache.get(sender.tab.id) });
    }
    return true;
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    faviconCache.delete(tabId);
});