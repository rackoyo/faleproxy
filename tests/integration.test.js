const axios = require('axios');
const cheerio = require('cheerio');
const { promisify } = require('util');
const { sampleHtmlWithYale } = require('./test-utils');
const nock = require('nock');
const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let app;

describe('Integration Tests', () => {
  // Load the app
  beforeAll(() => {
    // Mock external HTTP requests
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    
    // Load the app
    app = require('../app');
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('POST /fetch should replace Yale with Fale in content', async () => {
    const mockUrl = 'https://example.com';
    nock(mockUrl)
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(app)
      .post('/fetch')
      .send({ url: mockUrl });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.content).toContain('Welcome to Fale University');
    expect(response.body.content).toContain('About Fale');
    expect(response.body.content).not.toContain('Yale University');
    expect(response.body.content).not.toContain('About Yale');
  });

  test('POST /fetch should handle missing URL', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should handle invalid URL', async () => {
    const mockUrl = 'https://invalid-url.com';
    nock(mockUrl)
      .get('/')
      .replyWithError('Failed to fetch');

    const response = await request(app)
      .post('/fetch')
      .send({ url: mockUrl });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to fetch and process content');
  });
});
