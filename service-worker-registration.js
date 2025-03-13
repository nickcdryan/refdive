// This file registers our recovery service worker
// It will run separately from the main background script for redundancy

// Register the recovery worker
try {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('recovery.js')
        .then(function(registration) {
          console.log('Recovery service worker registered:', registration.scope);
        })
        .catch(function(error) {
          console.error('Recovery service worker registration failed:', error);
        });
    });
  }
} catch (e) {
  console.error('Error registering recovery service worker:', e);
} 