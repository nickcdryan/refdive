// Recovery page content script
// This script enables communication between the recovery page and the background script

console.log("Recovery content script loaded");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward messages to the page
    if (message.type === 'historyUpdated') {
        console.log("Forwarding history update to page");
        window.postMessage({ 
            type: 'historyUpdated',
            source: 'refdive-extension' 
        }, '*');
    }
    return true;
});

// Listen for messages from the page
window.addEventListener('message', function(event) {
    // Make sure the message is from our page
    if (event.source !== window || !event.data.source || event.data.source !== 'refdive-page') {
        return;
    }
    
    console.log("Received message from page:", event.data.type);
    
    // Forward messages to the background script
    if (event.data.type === 'getPdfHistory') {
        chrome.runtime.sendMessage({ type: 'getPdfHistory' }, function(response) {
            window.postMessage({
                type: 'pdfHistoryResponse',
                history: response.history || {},
                source: 'refdive-extension'
            }, '*');
        });
    }
    else if (event.data.type === 'openPdf') {
        chrome.runtime.sendMessage({ 
            type: 'openPdf',
            url: event.data.url
        });
    }
    else if (event.data.type === 'openEnhanced') {
        chrome.runtime.sendMessage({ 
            type: 'openEnhanced',
            url: event.data.url
        });
    }
    else if (event.data.type === 'debugHistory') {
        chrome.runtime.sendMessage({ type: 'debugHistory' }, function(response) {
            window.postMessage({
                type: 'debugHistoryResponse',
                history: response.history || {},
                source: 'refdive-extension'
            }, '*');
        });
    }
});

// Inject a script to let the page know we're loaded
const script = document.createElement('script');
script.textContent = `
    console.log("Recovery page helper script injected");
    window.refdiveExtensionLoaded = true;
    document.dispatchEvent(new CustomEvent('refdiveExtensionLoaded'));
`;
(document.head || document.documentElement).appendChild(script);
script.remove(); 