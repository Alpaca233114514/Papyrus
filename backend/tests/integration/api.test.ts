import { app, initApp } from '../../src/api/server.js';
import { closeDb } from '../../src/db/database.js';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await initApp();
  });

  afterAll(() => {
    closeDb();
  });

  it('GET /api/health should return ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('POST /api/cards should create a card', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'What is 2+2?', a: '4', tags: ['math'] },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.card.q).toBe('What is 2+2?');
    expect(body.card.a).toBe('4');
  });

  it('GET /api/cards should list cards', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/cards',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.cards)).toBe(true);
  });

  it('POST /api/notes should create a note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Test Note', content: 'Hello world', folder: 'Test', tags: ['test'] },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('Test Note');
  });

  it('GET /api/search should search notes and cards', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/search?query=Test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('POST /api/markdown/render should render markdown', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/markdown/render',
      payload: { content: '# Hello\n\nWorld' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.html).toContain('<h1>');
  });
});
