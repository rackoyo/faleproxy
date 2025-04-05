// Add global polyfills for Node.js environments that don't have them
const { Readable } = require('stream');
const { ReadableStream: WebReadableStream } = require('web-streams-polyfill/ponyfill/es2018');

// Add ReadableStream polyfill
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = WebReadableStream;
}

// Add Blob polyfill if needed
if (typeof Blob === 'undefined') {
  const { Blob } = require('buffer');
  global.Blob = Blob;
}

// Add fetch polyfill if needed
if (!global.fetch) {
  const fetch = require('node-fetch');
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}
