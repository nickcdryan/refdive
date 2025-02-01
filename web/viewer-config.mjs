// This needs to be set before PDF.js loads
window.pdfjsLib = window.pdfjsLib || {};

// Create a proxy to intercept validateFileURL calls
const validateFileURLProxy = {
    apply: function(target, thisArg, argumentsList) {
        console.log('Validation intercepted:', argumentsList[0]);
        return undefined; // Allow all files by returning undefined
    }
};

// Set up validation configuration
window.pdfjsLib.validateFileURL = new Proxy(function(){}, validateFileURLProxy);

// Also set it on window for direct calls
window.validateFileURL = new Proxy(function(){}, validateFileURLProxy);

// Set viewer options
window.pdfjsWebAppOptions = {
    set disableFileOriginCheck(value) { },
    get disableFileOriginCheck() { return true; }
};

// Set hosted origins to include all possible origins we might encounter
window.HOSTED_VIEWER_ORIGINS = [
    "null", 
    "http://mozilla.github.io", 
    "https://mozilla.github.io", 
    "chrome-extension://",
    "blob:",
    "https://arxiv.org"
];

// Disable the file origin check completely
window.pdfjsLib.isValidFetchUrl = () => true;