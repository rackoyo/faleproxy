document.addEventListener('DOMContentLoaded', () => {
    const urlForm = document.getElementById('url-form');
    const urlInput = document.getElementById('url-input');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const contentDisplay = document.getElementById('content-display');
    const originalUrlElement = document.getElementById('original-url');
    const pageTitleElement = document.getElementById('page-title');

    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }
        
        // Show loading indicator
        loadingElement.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        try {
            const response = await fetch('/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch content');
            }
            
            // Update the info bar
            originalUrlElement.textContent = url;
            originalUrlElement.href = url;
            pageTitleElement.textContent = data.title || 'No title';
            
            // Create a sandboxed iframe to display the content
            const iframe = document.createElement('iframe');
            iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
            contentDisplay.innerHTML = '';
            contentDisplay.appendChild(iframe);
            
            // Write the modified HTML to the iframe with preserved styles
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            iframeDocument.open();
            
            // Create a complete HTML document with styles
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${data.title}</title>
                    ${data.styles.map(style => {
                        if (style.startsWith('http')) {
                            return `<link rel="stylesheet" href="${style}">`;
                        }
                        return `<style>${style}</style>`;
                    }).join('\n')}
                    <style>
                        /* Override styles to ensure content is visible */
                        body {
                            margin: 0;
                            padding: 0;
                            min-height: 100vh;
                            width: 100%;
                            background-color: white;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>${data.content}</body>
                </html>
            `;
            
            iframeDocument.write(htmlContent);
            iframeDocument.close();
            
            // Adjust iframe height to match content
            function adjustIframeHeight() {
                const body = iframeDocument.body;
                const html = iframeDocument.documentElement;
                const height = Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );
                iframe.style.height = height + 'px';
            }
            
            // Adjust height after images and resources load
            iframe.onload = () => {
                adjustIframeHeight();
                // Make sure links open in a new tab
                const links = iframeDocument.querySelectorAll('a');
                links.forEach(link => {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                });
            };
            
            // Add a resize observer to handle dynamic content changes
            if (iframeDocument.body) {
                const resizeObserver = new ResizeObserver(() => {
                    adjustIframeHeight();
                });
                resizeObserver.observe(iframeDocument.body);
            }
            
            // Show result container
            resultContainer.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        } finally {
            // Hide loading indicator
            loadingElement.classList.add('hidden');
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
});
