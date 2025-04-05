/**
 * @jest-environment jsdom
 */

describe('Frontend script functionality', () => {
  let urlForm;
  let urlInput;
  let loadingElement;
  let errorMessage;
  let resultContainer;
  let contentDisplay;
  let originalUrlElement;
  let pageTitleElement;
  let fetchMock;
  let resizeObserverMock;

  beforeEach(() => {
    // Set up our document body
    document.body.innerHTML = `
      <form id="url-form">
        <input id="url-input" type="text">
      </form>
      <div id="loading" class="hidden"></div>
      <div id="error-message" class="hidden"></div>
      <div id="result-container" class="hidden">
        <div id="content-display"></div>
        <a id="original-url"></a>
        <div id="page-title"></div>
      </div>
    `;

    // Get DOM elements
    urlForm = document.getElementById('url-form');
    urlInput = document.getElementById('url-input');
    loadingElement = document.getElementById('loading');
    errorMessage = document.getElementById('error-message');
    resultContainer = document.getElementById('result-container');
    contentDisplay = document.getElementById('content-display');
    originalUrlElement = document.getElementById('original-url');
    pageTitleElement = document.getElementById('page-title');

    // Mock fetch
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    // Mock ResizeObserver
    const mockDisconnect = jest.fn();
    const mockObserve = jest.fn();
    resizeObserverMock = {
      observe: mockObserve,
      unobserve: jest.fn(),
      disconnect: mockDisconnect
    };
    global.ResizeObserver = jest.fn().mockImplementation(() => resizeObserverMock);
    global.ResizeObserver.mockDisconnect = mockDisconnect;
    global.ResizeObserver.mockObserve = mockObserve;

    // Load the script and wait for DOMContentLoaded
    require('../public/script.js');
    const event = document.createEvent('Event');
    event.initEvent('DOMContentLoaded', true, true);
    document.dispatchEvent(event);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const submitForm = async () => {
    const submitEvent = document.createEvent('Event');
    submitEvent.initEvent('submit', true, true);
    Object.defineProperty(submitEvent, 'preventDefault', { value: jest.fn() });
    urlForm.dispatchEvent(submitEvent);
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  test('shows error when URL is empty', async () => {
    urlInput.value = '';
    await submitForm();
    
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
  });

  test('shows error when URL is invalid', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    
    urlInput.value = 'not-a-url';
    await submitForm();
    
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
  });

  test('shows loading state during fetch', async () => {
    // Setup fetch mock to return a promise that we can control
    fetchMock.mockImplementation(() => new Promise(() => {}));
    
    urlInput.value = 'https://example.com';
    await submitForm();
    
    expect(loadingElement.classList.contains('hidden')).toBe(false);
    expect(resultContainer.classList.contains('hidden')).toBe(true);
    expect(errorMessage.classList.contains('hidden')).toBe(true);
  });

  test('handles successful response with styles', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: '<div>Modified content</div>',
        title: 'Test Title',
        styles: ['body { color: black; }', 'p { margin: 0; }']
      })
    };
    fetchMock.mockResolvedValue(mockResponse);

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(originalUrlElement.textContent).toBe('https://example.com');
    expect(originalUrlElement.href).toContain('example.com');
    expect(pageTitleElement.textContent).toBe('Test Title');
    expect(resultContainer.classList.contains('hidden')).toBe(false);

    // Verify iframe creation
    const iframe = contentDisplay.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.sandbox).toBe('allow-same-origin allow-scripts allow-popups allow-forms');

    // Verify styles are applied
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const styleElements = iframeDoc.getElementsByTagName('style');
    expect(styleElements.length).toBe(3); // 2 custom styles + 1 default style
    expect(styleElements[0].textContent.includes('body { color: black; }')).toBe(true);
    expect(styleElements[1].textContent.includes('p { margin: 0; }')).toBe(true);
  });

  test('handles successful response without styles', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: '<div>Modified content</div>',
        title: 'Test Title',
        styles: []
      })
    };
    fetchMock.mockResolvedValue(mockResponse);

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const iframe = contentDisplay.querySelector('iframe');
    expect(iframe).toBeTruthy();
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const styleElements = iframeDoc.getElementsByTagName('style');
    expect(styleElements.length).toBe(1); // Only the default style
  });

  test('handles error response', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({
        error: 'Test error message'
      })
    };
    fetchMock.mockResolvedValue(mockResponse);

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errorMessage.textContent).toBe('Test error message');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(resultContainer.classList.contains('hidden')).toBe(true);
    expect(loadingElement.classList.contains('hidden')).toBe(true);
  });

  test('handles network error', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errorMessage.textContent).toBe('Network error');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(resultContainer.classList.contains('hidden')).toBe(true);
    expect(loadingElement.classList.contains('hidden')).toBe(true);
  });

  test('adjusts iframe height after content load', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: '<div style="height: 500px;">Content</div>',
        title: 'Test Title',
        styles: []
      })
    };
    fetchMock.mockResolvedValue(mockResponse);

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const iframe = contentDisplay.querySelector('iframe');
    expect(iframe).toBeTruthy();

    // Mock iframe content window
    const mockBody = {
      scrollHeight: 500,
      offsetHeight: 500
    };
    const mockHtml = {
      clientHeight: 500,
      scrollHeight: 500,
      offsetHeight: 500
    };

    // Create a real iframe document
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write('<html><body style="height: 500px"></body></html>');
    iframeDocument.close();

    // Set up mock properties
    Object.defineProperty(iframeDocument, 'body', {
      value: mockBody,
      configurable: true
    });
    Object.defineProperty(iframeDocument, 'documentElement', {
      value: mockHtml,
      configurable: true
    });

    // Simulate iframe load event
    const loadEvent = document.createEvent('Event');
    loadEvent.initEvent('load', true, true);
    iframe.dispatchEvent(loadEvent);

    // Wait for height adjustment
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify that ResizeObserver was initialized and iframe height was set
    expect(global.ResizeObserver).toHaveBeenCalled();
    expect(global.ResizeObserver.mockObserve).toHaveBeenCalled();
    expect(iframe.style.height).toBe('500px');
  });

  test('handles malformed JSON response', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON'))
    };
    fetchMock.mockResolvedValue(mockResponse);

    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(errorMessage.textContent).toBe('Invalid JSON');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
    expect(resultContainer.classList.contains('hidden')).toBe(true);
    expect(loadingElement.classList.contains('hidden')).toBe(true);
  });

  test('cleans up ResizeObserver on new request', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: '<div>Content</div>',
        title: 'Test Title',
        styles: []
      })
    };
    fetchMock.mockResolvedValue(mockResponse);

    // First request
    urlInput.value = 'https://example.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const firstIframe = contentDisplay.querySelector('iframe');
    expect(firstIframe).toBeTruthy();

    // Create a real iframe document to trigger ResizeObserver
    const iframeDocument = firstIframe.contentDocument || firstIframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write('<html><body></body></html>');
    iframeDocument.close();

    // Trigger load event to create ResizeObserver
    const loadEvent = document.createEvent('Event');
    loadEvent.initEvent('load', true, true);
    firstIframe.dispatchEvent(loadEvent);

    // Second request
    urlInput.value = 'https://example2.com';
    await submitForm();
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that disconnect was called and iframe was replaced
    expect(global.ResizeObserver.mockDisconnect).toHaveBeenCalled();
    expect(contentDisplay.querySelector('iframe')).not.toBe(firstIframe);
  });
});
