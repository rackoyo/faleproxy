const { parse } = require('node-html-parser');

function replaceYaleWithFale(text) {
  if (!text) return text;
  return text
    .replace(/YALE/g, 'FALE')
    .replace(/Yale/g, 'Fale')
    .replace(/yale/g, 'fale');
}

describe('Yale to Fale replacement logic', () => {
  test('should replace Yale with Fale in text content', () => {
    const html = `
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
    `;

    const root = parse(html);
    
    // Process text nodes and attributes
    const processNode = (node) => {
      if (node.nodeType === 3) { // Text node
        node._rawText = replaceYaleWithFale(node._rawText);
      }
      
      if (node.tagName === 'IMG') {
        const alt = node.getAttribute('alt');
        if (alt) {
          node.setAttribute('alt', replaceYaleWithFale(alt));
        }
      }
      
      if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };

    root.childNodes.forEach(processNode);
    const result = root.toString();

    expect(result).toContain('Fale University');
    expect(result).toContain('Welcome to Fale');
    expect(result).toContain('About Fale');
    expect(result).toContain('alt="Fale Logo"');
  });

  test('should handle text that has no Yale references', () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test page with no references.</p>
        </body>
      </html>
    `;

    const root = parse(html);
    const processNode = (node) => {
      if (node.nodeType === 3) {
        node._rawText = replaceYaleWithFale(node._rawText);
      }
      if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };

    root.childNodes.forEach(processNode);
    const result = root.toString();

    expect(result).toContain('<title>Test Page</title>');
    expect(result).toContain('<h1>Hello World</h1>');
    expect(result).toContain('<p>This is a test page with no references.</p>');
  });

  test('should handle case-insensitive replacements', () => {
    const html = `
      <html>
        <head></head>
        <body>
          <p>YALE University, Yale College, and yale medical school are all part of the same institution.</p>
        </body>
      </html>
    `;

    const root = parse(html);
    const processNode = (node) => {
      if (node.nodeType === 3) {
        node._rawText = replaceYaleWithFale(node._rawText);
      }
      if (node.childNodes) {
        node.childNodes.forEach(processNode);
      }
    };

    root.childNodes.forEach(processNode);
    const result = root.toString();
    
    expect(result).toContain('FALE University, Fale College, and fale medical school');
  });
});
