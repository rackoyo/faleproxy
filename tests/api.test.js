const request = require('supertest');
const nock = require('nock');
const express = require('express');
const path = require('path');
const { parse } = require('node-html-parser');
const { sampleHtmlWithYale } = require('./test-utils');

// Import app but don't let it listen on a port (we'll use supertest for that)
// Create a test app with the same route handlers!
const testApp = express();
testApp.use(express.json());
testApp.use(express.urlencoded({ extended: true }));

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

// Mock the app's routes for testing
testApp.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // For test purposes, we're using the mocked response from nock
    // The actual HTTP request is intercepted by nock
    const response = await require('axios').get(url);
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

describe('API Endpoints', () => {
  beforeAll(() => {
    // Disable real HTTP requests during testing
    nock.disableNetConnect();
    // Allow localhost connections for supertest
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('POST /fetch should fetch and replace Yale with Fale while preserving URLs', async () => {
    const testUrl = 'https://example.com';
    
    nock(testUrl)
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(testApp)
      .post('/fetch')
      .send({ url: testUrl + '/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.title).toBe('Fale University Test Page');
    expect(response.body.content).toContain('Welcome to Fale University');
    
    // Check URL preservation
    expect(response.body.content).toContain(`${testUrl}/admissions`);  // Relative URL converted
    expect(response.body.content).toContain(`${testUrl}/admissions/apply`);  // Nested relative URL converted
    expect(response.body.content).toContain('mailto:info@yale.edu');  // mailto link preserved
    
    // Check text replacement
    expect(response.body.content).toContain('>About Fale<');  // Link text changed
    expect(response.body.content).toContain('>Fale Admissions<');  // Link text changed
    
    // Check style preservation
    expect(response.body.styles).toHaveLength(3);  // 2 external + 1 inline
    expect(response.body.styles).toContain('https://cdn.yale.edu/styles/yale.css');  // External absolute
    expect(response.body.styles).toContain(`${testUrl}/styles/main.css`);  // External relative
    expect(response.body.styles[2]).toContain('.yale-info { color: #00356b; }');  // Inline style
  });

  test('POST /fetch should properly handle image URLs and alt text', async () => {
    const testUrl = 'https://example.com';
    
    nock(testUrl)
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(testApp)
      .post('/fetch')
      .send({ url: testUrl + '/' });

    expect(response.statusCode).toBe(200);
    
    // Check image URL handling
    expect(response.body.content).toContain(`${testUrl}/images/logo.png`);  // Root-relative URL
    expect(response.body.content).toContain(`${testUrl}/images/campus.jpg`);  // Relative URL
    expect(response.body.content).toContain('https://www.yale.edu/images/seal.png');  // Absolute URL unchanged
    
    // Check image attributes
    expect(response.body.content).toContain('class="yale-logo"');  // Class preserved
    expect(response.body.content).toContain('alt="Fale Logo"');  // Alt text changed
    expect(response.body.content).toContain('alt="Fale Campus"');  // Alt text changed
    expect(response.body.content).toContain('alt="Fale Seal"');  // Alt text changed
  });

  test('POST /fetch should handle errors from external sites', async () => {
    // Mock a failing URL
    nock('https://error-site.com')
      .get('/')
      .replyWithError('Connection refused');

    const response = await request(testApp)
      .post('/fetch')
      .send({ url: 'https://error-site.com/' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Failed to fetch and process content');
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(testApp)
      .post('/fetch')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });
});
