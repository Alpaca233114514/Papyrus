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

  it('GET /api/config/ai should return masked config', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/config/ai',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.config.current_provider).toBeDefined();
    expect(body.config.providers).toBeDefined();
  });

  it('POST /api/tools/config should update tool config', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/config',
      payload: { mode: 'auto', auto_execute_tools: [] },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.config.mode).toBe('auto');
  });

  it('POST /api/tools/submit should auto-execute readonly tools', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'get_card_stats', params: {} },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();
  });

  it('POST /api/tools/parse should parse AI response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/parse',
      payload: { response: 'Hello\n```json\n{"tool": "search_cards", "params": {"keyword": "test"}}\n```' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.tool_call).not.toBeNull();
    expect(body.data.tool_call.tool).toBe('search_cards');
  });

  it('GET /api/sessions should list sessions', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/sessions',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  it('GET /api/mcp/health should return ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/mcp/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('mcp');
  });

  it('GET /api/mcp/notes should list notes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/mcp/notes',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('POST /api/mcp/notes/search should search notes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes/search',
      payload: { query: 'Test', limit: 10 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });
});
