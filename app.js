const express = require('express');
const axios = require('axios');
const path = require('path');
const { parse } = require('node-html-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to replace Yale with Fale
function replaceYaleWithFale(text) {
  if (!text) return text;
  return text
    .replace(/YALE/g, 'FALE')
    .replace(/Yale/g, 'Fale')
    .replace(/yale/g, 'fale');
}

// Helper function to convert relative URLs to absolute
function makeUrlAbsolute(url, baseUrl) {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('mailto:')) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return url;
  }
}

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Parse HTML using node-html-parser
    const root = parse(html);
    
    // Store original styles and scripts
    const styles = [];

    // Collect all external stylesheets
    root.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
      const href = el.getAttribute('href');
      if (href) {
        styles.push(makeUrlAbsolute(href, url));
      }
    });

    // Collect inline styles
    root.querySelectorAll('style').forEach(el => {
      styles.push(el.text);
    });

    // Process text nodes
    const processNode = (node) => {
      if (node.nodeType === 3) {
        node._rawText = replaceYaleWithFale(node._rawText);
      }
      
      if (node.tagName === 'IMG') {
        const alt = node.getAttribute('alt');
        if (alt) {
          node.setAttribute('alt', replaceYaleWithFale(alt));
        }
        const src = node.getAttribute('src');
        if (src) {
          node.setAttribute('src', makeUrlAbsolute(src, url));
        }
      }
      
      if (node.tagName === 'A') {
        const href = node.getAttribute('href');
        if (href) {
          node.setAttribute('href', makeUrlAbsolute(href, url));
        }
      }

      if (node.tagName === 'META') {
        const content = node.getAttribute('content');
        if (content) {
          node.setAttribute('content', replaceYaleWithFale(content));
        }
      }
      
      if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };

    root.childNodes.forEach(processNode);

    // Get page title
    const title = root.querySelector('title')?.text || '';
    const modifiedTitle = replaceYaleWithFale(title);

    return res.json({
      success: true,
      content: root.toString(),
      title: modifiedTitle,
      styles
    });

  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch and process content' 
    });
  }
});

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for testing
module.exports = app;
