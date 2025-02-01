if (document.contentType === 'application/pdf' || window.location.pathname.endsWith('.pdf')) {
    const pdfUrl = window.location.href;
    const viewerUrl = chrome.runtime.getURL('web/viewer.html');
    
    console.log('=== PDF Loading Process ===');
    console.log('1. PDF URL:', pdfUrl);
    console.log('2. Viewer URL:', viewerUrl);
    
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
            
            window.location.replace(finalUrl);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}