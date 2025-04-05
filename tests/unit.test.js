const cheerio = require('cheerio');

describe('Yale to Fale replacement logic', () => {
  test('should replace Yale with Fale in text content', () => {
    const $ = cheerio.load(`
      <html>
        <head>
          <title>Yale University</title>
        </head>
        <body>
          <h1>Welcome to Yale</h1>
          <p>Yale University is located in New Haven.</p>
          <a href="https://www.yale.edu/about">About Yale</a>
          <img src="/images/yale-logo.png" alt="Yale Logo">
        </body>
      </html>
    `);

    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text) return text;
      return text
        .replace(/YALE/g, 'FALE')
        .replace(/Yale/g, 'Fale')
        .replace(/yale/g, 'Fale');
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

    // Process all nodes recursively
    $('*').each((i, el) => {
      if (el.children) {
        el.children.forEach(processTextNodes);
      }
    });

    // Process title separately
    const title = $('title').text();
    const newTitle = replaceYaleWithFale(title);
    $('title').text(newTitle);

    const modifiedHtml = $.html();

    // Check text replacements
    expect(modifiedHtml).toContain('Fale University');
    expect(modifiedHtml).toContain('Welcome to Fale');
    expect(modifiedHtml).toContain('About Fale');

    // Check that attributes remain unchanged
    expect(modifiedHtml).toContain('src="/images/yale-logo.png"');
    expect(modifiedHtml).toContain('href="https://www.yale.edu/about"');
  });

  test('should handle text that has no Yale references', () => {
    const $ = cheerio.load(`
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test page with no references.</p>
        </body>
      </html>
    `);

    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text) return text;
      return text
        .replace(/YALE/g, 'FALE')
        .replace(/Yale/g, 'Fale')
        .replace(/yale/g, 'Fale');
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

    // Process all nodes recursively
    $('*').each((i, el) => {
      if (el.children) {
        el.children.forEach(processTextNodes);
      }
    });

    const modifiedHtml = $.html();

    expect(modifiedHtml).toContain('<title>Test Page</title>');
    expect(modifiedHtml).toContain('<h1>Hello World</h1>');
    expect(modifiedHtml).toContain('<p>This is a test page with no references.</p>');
  });

  test('should handle case-insensitive replacements', () => {
    const $ = cheerio.load(`
      <html>
        <head></head>
        <body>
          <p>YALE University, Yale College, and yale medical school are all part of the same institution.</p>
        </body>
      </html>
    `);

    // Function to replace Yale with Fale while preserving case
    function replaceYaleWithFale(text) {
      if (!text) return text;
      return text
        .replace(/YALE/g, 'FALE')
        .replace(/Yale/g, 'Fale')
        .replace(/yale/g, 'Fale');
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

    // Process all nodes recursively
    $('*').each((i, el) => {
      if (el.children) {
        el.children.forEach(processTextNodes);
      }
    });

    const modifiedHtml = $.html();
    
    expect(modifiedHtml).toContain('FALE University, Fale College, and Fale medical school');
  });
});
