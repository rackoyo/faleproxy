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

    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3;
    }).each(function() {
      const text = $(this).text();
      const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });

    const title = $('title').text().replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
    $('title').text(title);

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

    $('body *').contents().filter(function() {
      return this.nodeType === 3;
    }).each(function() {
      const text = $(this).text();
      const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
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

    $('body *').contents().filter(function() {
      return this.nodeType === 3;
    }).each(function() {
      const text = $(this).text();
      const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });

    const modifiedHtml = $.html();
    
    expect(modifiedHtml).toContain('FALE University, Fale College, and Fale medical school');
  });
});
