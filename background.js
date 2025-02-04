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