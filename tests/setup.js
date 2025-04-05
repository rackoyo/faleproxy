// Add global polyfills for Node.js environments that don't have them
const { Readable } = require('stream');
const { ReadableStream } = require('web-streams-polyfill');

// Add ReadableStream polyfill
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

// Add Blob polyfill if needed
if (typeof Blob === 'undefined') {
  const { Blob } = require('buffer');
  global.Blob = Blob;
}

// Mock global browser APIs
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Event constructor
global.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

// Mock preventDefault
Event.prototype.preventDefault = jest.fn();

// Set up initial DOM structure
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
