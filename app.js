const express = require('express');
const { ReadableStream, TransformStream } = require('node:stream/web');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to replace Yale with Fale while preserving case
function replaceYaleWithFale(text) {
  if (!text) return text;
  return text
    .replace(/YALE/g, 'FALE')
    .replace(/Yale/g, 'Fale')
    .replace(/yale/g, 'Fale'); // Always capitalize 'yale' to 'Fale'
}

// Process text nodes recursively
function processTextNodes(node) {
  if (node.type === 'text') {
    const text = node.data;
    const newText = replaceYaleWithFale(text);
    if (text !== newText) {
      node.data = newText;
    }
  } else if (node.children) {
    node.children.forEach(processTextNodes);
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

    // Use cheerio to parse HTML
    const $ = cheerio.load(html);
    
    // Store original styles and scripts
    const styles = [];
    const scripts = [];

    // Collect all external stylesheets
    $('link[rel="stylesheet"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        // Convert relative URLs to absolute
        const absoluteUrl = href.startsWith('http') ? href : new URL(href, url).href;
        styles.push(absoluteUrl);
      }
    });

    // Collect inline styles
    $('style').each((i, el) => {
      styles.push($(el).html());
    });

    // Process all nodes recursively
    $('*').each((i, el) => {
      if (el.children) {
        el.children.forEach(processTextNodes);
      }
    });

    // Process title separately since it might not be caught by the recursive function
    const title = $('title').text();
    const newTitle = replaceYaleWithFale(title);
    $('title').text(newTitle);

    // Convert all relative URLs (images, links, etc.) to absolute URLs
    $('img, script, link, a').each((i, el) => {
      const $el = $(el);
      ['src', 'href'].forEach(attr => {
        const val = $el.attr(attr);
        if (val && !val.startsWith('http') && !val.startsWith('data:')) {
          try {
            const absoluteUrl = new URL(val, url).href;
            $el.attr(attr, absoluteUrl);
          } catch (e) {
            console.warn(`Failed to convert URL: ${val}`);
          }
        }
      });
    });

    // Extract body content
    const bodyContent = $('body').html();
    
    return res.json({ 
      success: true, 
      content: bodyContent,
      styles,
      title: newTitle,
      originalUrl: url
    });

  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch and process content' 
    });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
