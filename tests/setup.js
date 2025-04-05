// Add ReadableStream polyfill for Node.js environments that don't have it
if (typeof ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
}

// Add fetch polyfill if needed
if (!global.fetch) {
  const fetch = require('node-fetch');
  global.fetch = fetch;
}
