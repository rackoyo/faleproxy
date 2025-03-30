const request = require('supertest');
const nock = require('nock');
const express = require('express');
const path = require('path');
const { sampleHtmlWithYale } = require('./test-utils');

// Import app but don't let it listen on a port (we'll use supertest for that)
// Create a test app with the same route handlers
const testApp = express();
testApp.use(express.json());
testApp.use(express.urlencoded({ extended: true }));

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
    
    // Use cheerio to parse HTML
    const $ = require('cheerio').load(html);
    
    // Store original styles and scripts
    const styles = [];

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
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      const text = $(this).text();
      const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately
    const title = $('title').text().replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
    $('title').text(title);

    // Process alt attributes for images
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      if (alt) {
        $(el).attr('alt', alt.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale'));
      }
    });

    // Convert all relative URLs to absolute
    $('img, script, link, a').each((i, el) => {
      const $el = $(el);
      ['src', 'href'].forEach(attr => {
        const val = $el.attr(attr);
        if (val && !val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('mailto:')) {
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
      title,
      originalUrl: url
    });
  } catch (error) {
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
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
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterEach(() => {
    // Clear any lingering nock interceptors after each test
    nock.cleanAll();
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(testApp)
      .post('/fetch')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should fetch and replace Yale with Fale while preserving URLs', async () => {
    const testUrl = 'https://example.com';
    
    // Mock the external URL
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
    
    // Check URL preservation and conversion
    expect(response.body.content).toContain('https://www.yale.edu/about');  // Absolute URL unchanged
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
    expect(response.body.error).toContain('Failed to fetch content');
  });
});
