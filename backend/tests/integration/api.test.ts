import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app, initApp, logger } from '../../src/api/server.js';
import { closeDb, saveProvider, saveApiKey, saveModel } from '../../src/db/database.js';

describe('API Integration Tests', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-api-test-${Date.now()}`);
  const originalFetch = global.fetch;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;
    const { resetAIConfig } = await import('../../src/ai/config-instance.js');
    resetAIConfig(testDir);
    await initApp();
    logger.setLogDir(path.join(testDir, 'logs'));
    app.post('/api/test-crash', async () => {
      throw new Error('intentional test crash');
    });
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  beforeEach(async () => {
    const { getDb } = await import('../../src/db/database.js');
    const db = getDb();
    db.exec(`DELETE FROM files; DELETE FROM cards; DELETE FROM notes;
             DELETE FROM card_versions; DELETE FROM note_versions;
             DELETE FROM relations;
             DELETE FROM provider_models; DELETE FROM api_keys; DELETE FROM providers;`);

    const { paths } = await import('../../src/utils/paths.js');
    fs.rmSync(paths.vaultDir, { recursive: true, force: true });

    const { aiManager, aiConfig } = await import('../../src/api/routes/ai.js');
    aiManager.reset();
    aiConfig.loadConfig();

    const { resetToolManager } = await import('../../src/ai/tool-manager.js');
    resetToolManager();

    global.fetch = originalFetch;
  });

  it('GET /api/health should return ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('should reject non-localhost CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: { Origin: 'http://example.com' },
    });

    expect(response.statusCode).toBe(500);
  });

  it('should accept localhost CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should accept 127.0.0.1 CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it('should return 404 for unmatched route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/nonexistent-route',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Not found');
  });

  it('should return 500 with errorId on uncaught exception', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/test-crash',
      payload: { api_key: 'sk-secret-key-12345', data: 'test payload' },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Internal server error');
    expect(body.errorId).toMatch(/^[a-f0-9]{8}$/);

    const logs = logger.getLogs('error', null).join('\n');
    expect(logs).toContain(body.errorId);
    expect(logs).toContain('POST /api/test-crash');
    expect(logs).toContain('intentional test crash');
    expect(logs).not.toContain('sk-secret-key-12345');
    expect(logs).toContain('sk-***45');
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
      payload: { content: '# Hello\n\nWorld [link](https://example.com)' },
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

  it('GET /api/tools/config should return tool config', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tools/config',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.config.mode).toBeDefined();
    expect(Array.isArray(body.config.auto_execute_tools)).toBe(true);
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

  it('POST /api/mcp/notes/search should match content when title and tag miss', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'XYZ', content: 'SearchMeContent', tags: ['xyz'] },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes/search',
      payload: { query: 'searchme', limit: 10 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notes.some((n: { id: string }) => n.id === noteId)).toBe(true);
  });

  it('GET /api/review/next should return a card or empty', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/review/next',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.card === null || typeof body.card === 'object').toBe(true);
  });

  it('GET /api/progress/streak should return streak data', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { question: 'StreakQ', answer: 'StreakA' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/streak',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.current_streak).toBe('number');
  });

  it('GET /api/progress/history should return history', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/history?days=7',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.history)).toBe(true);
  });

  it('GET /api/progress/heatmap should return heatmap data', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/heatmap?days=30',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/progress/history should default days for invalid input', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/history?days=abc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.days).toBe(30);
  });

  it('POST /api/backup should create a backup', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/backup',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.path).toBe('string');
  });

  it('POST /api/import should import JSON data', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import',
      payload: {
        cards: [{ q: 'Q1', a: 'A1' }],
        notes: [{ title: 'Note1', content: 'Body' }],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.imported).toBe('number');
  });

  it('GET /api/export should return cards and notes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/export',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.cards)).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('POST /api/import should handle invalid data gracefully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import',
      payload: { cards: 'not-an-array' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.imported).toBe(0);
  });

  it('POST /api/markdown/render should 400 without content', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/markdown/render',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('GET /api/search should return empty for missing query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/search',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.results).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('POST /api/cards should 400 without question or answer', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/cards/import/txt should 400 for no valid cards', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards/import/txt',
      payload: { content: 'no tabs here' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('GET /api/review/next should return null when no cards due', async () => {
    const cardsRes = await app.inject({ method: 'GET', url: '/api/cards' });
    const cards = JSON.parse(cardsRes.body).cards as Array<{ id: string }>;
    for (const card of cards) {
      await app.inject({ method: 'POST', url: `/api/review/${card.id}/rate`, payload: { grade: 3 } });
    }

    const response = await app.inject({
      method: 'GET',
      url: '/api/review/next',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.card).toBeNull();
  });

  it('GET /api/update/version should return version info', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/update/version',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(typeof body.version).toBe('string');
    expect(typeof body.repository).toBe('string');
  });

  it('GET /api/update/check should handle failed fetch', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 500 } as Response);

      const response = await app.inject({
        method: 'GET',
        url: '/api/update/check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(0);
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('GET /api/update/check should parse successful response', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          tag_name: 'v999.0.0',
          html_url: 'https://example.com/release',
          body: 'Release notes here',
          published_at: '2026-01-01T00:00:00Z',
          assets: [{ browser_download_url: 'https://example.com/download' }],
        }),
      } as unknown as Response);

      const response = await app.inject({
        method: 'GET',
        url: '/api/update/check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.has_update).toBe(true);
      expect(body.data.latest_version).toBe('v999.0.0');
      expect(body.data.current_version).toBeDefined();
      expect(body.data.release_url).toBe('https://example.com/release');
      expect(body.data.download_url).toBe('https://example.com/download');
      expect(body.data.release_notes).toBe('Release notes here');
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should test ollama connection', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: true, status: 200 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {},
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const providerId = saveProvider({
        id: 'p-ollama-test', type: 'ollama', name: 'ollama',
        baseUrl: 'http://localhost:11434', enabled: true, isDefault: true,
      });
      saveApiKey(providerId, { id: 'k-ollama', name: 'default', key: '' });
      saveModel(providerId, { id: 'm-llama2', modelId: 'llama2', name: 'llama2', enabled: true });

      const { aiConfig } = await import('../../src/api/routes/ai.js');
      aiConfig.config.current_provider = 'ollama';
      aiConfig.config.current_model = 'llama2';

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.success).toBe('boolean');
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should reject private url', async () => {
    saveProvider({ id: 'p-openai', type: 'openai', name: 'OpenAI', baseUrl: 'http://192.168.1.1/v1', enabled: true, isDefault: false });
    saveApiKey('p-openai', { id: 'k-openai', name: 'default', key: 'sk-test' });
    saveModel('p-openai', { id: 'm-gpt4', modelId: 'gpt-4', name: 'gpt-4', enabled: true });

    const { aiConfig } = await import('../../src/api/routes/ai.js');
    aiConfig.config.current_provider = 'openai';
    aiConfig.config.current_model = 'gpt-4';

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('SSRF');
  });

  it('POST /api/config/ai/test should report missing api key', async () => {
    const providerId = saveProvider({
      id: 'p-openai-test', type: 'openai', name: 'openai',
      baseUrl: 'https://api.openai.com/v1', enabled: true, isDefault: false,
    });
    saveApiKey(providerId, { id: 'k-openai', name: 'default', key: '' });
    saveModel(providerId, { id: 'm-gpt4', modelId: 'gpt-4', name: 'gpt-4', enabled: true });

    const { aiConfig } = await import('../../src/api/routes/ai.js');
    aiConfig.config.current_provider = 'openai';
    aiConfig.config.current_model = 'gpt-4';

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('API Key');
  });

  it('POST /api/config/ai/test should report missing base url', async () => {
    const providerId = saveProvider({
      id: 'p-openai-test2', type: 'openai', name: 'openai',
      baseUrl: '', enabled: true, isDefault: false,
    });
    saveApiKey(providerId, { id: 'k-openai2', name: 'default', key: 'sk-test' });
    saveModel(providerId, { id: 'm-gpt4b', modelId: 'gpt-4', name: 'gpt-4', enabled: true });

    const { aiConfig } = await import('../../src/api/routes/ai.js');
    aiConfig.config.current_provider = 'openai';
    aiConfig.config.current_model = 'gpt-4';

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Base URL');
  });

  it('POST /api/config/ai/test should handle 401 response', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 401 } as Response);

      const providerId = saveProvider({
        id: 'p-openai-401', type: 'openai', name: 'openai',
        baseUrl: 'https://api.openai.com/v1', enabled: true, isDefault: false,
      });
      saveApiKey(providerId, { id: 'k-401', name: 'default', key: 'sk-test' });
      saveModel(providerId, { id: 'm-401', modelId: 'gpt-4', name: 'gpt-4', enabled: true });

      const { aiConfig } = await import('../../src/api/routes/ai.js');
      aiConfig.config.current_provider = 'openai';
      aiConfig.config.current_model = 'gpt-4';

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('无效');
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('GET /api/tools/catalog should return tool catalog', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tools/catalog',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools.length).toBeGreaterThan(0);
  });

  it('GET /api/tools/pending should return pending calls', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tools/pending',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.calls)).toBe(true);
  });

  it('POST /api/tools/submit should create pending call for write tools', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tools/config',
      payload: { mode: 'manual', auto_execute_tools: [] },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'create_card', params: { question: 'Q', answer: 'A' } },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.call).toBeDefined();
    expect(body.call.call_id).toBeTruthy();
  });

  it('POST /api/tools/approve/:callId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/approve/no-such-id',
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/tools/reject/:callId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/reject/no-such-id',
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('GET /api/tools/calls/:callId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tools/calls/no-such-id',
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('DELETE /api/tools/history should clear history', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/tools/history?keep_pending=true',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.cleared_count).toBe('number');
  });

  it('POST /api/tools/approve/:callId should handle execution error', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tools/config',
      payload: { mode: 'manual', auto_execute_tools: [] },
    });

    const submit = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'create_card', params: { question: 'Q', answer: 'A' } },
    });
    const callId = JSON.parse(submit.body).call?.call_id;
    expect(callId).toBeTruthy();

    const { CardTools } = await import('../../src/ai/tools.js');
    const original = CardTools.prototype.executeTool;
    CardTools.prototype.executeTool = () => { throw new Error('tool crash'); };

    const response = await app.inject({
      method: 'POST',
      url: `/api/tools/approve/${callId}`,
    });

    CardTools.prototype.executeTool = original;

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('tool crash');
  });

  it('POST /api/tools/submit should handle auto-execute error', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tools/config',
      payload: { mode: 'auto', auto_execute_tools: [] },
    });

    const { CardTools } = await import('../../src/ai/tools.js');
    const original = CardTools.prototype.executeTool;
    CardTools.prototype.executeTool = () => { throw new Error('auto crash'); };

    const response = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'get_card_stats', params: {} },
    });

    CardTools.prototype.executeTool = original;

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('auto crash');
  });

  it('GET /api/notes/:noteId/history should return versions', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Versioned', content: 'v1' },
    });
    const noteId = JSON.parse(create.body).note.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/notes/${noteId}`,
      payload: { content: 'v2' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/notes/${noteId}/history`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.history[0].content).toBe('v1');
  });

  it('GET /api/notes/:noteId/history should 404 for non-existent note', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/notes/non-existent-id/history',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/notes/:noteId/rollback/:versionId should roll back note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Versioned', content: 'v1' },
    });
    const noteId = JSON.parse(create.body).note.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/notes/${noteId}`,
      payload: { content: 'v2' },
    });

    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/notes/${noteId}/history`,
    });
    const versionId = JSON.parse(historyRes.body).history[0].version_id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/notes/${noteId}/rollback/${versionId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.content).toBe('v1');
  });

  it('GET /api/cards/:cardId/history should return versions', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'Q1', a: 'A1' },
    });
    const cardId = JSON.parse(create.body).card.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/cards/${cardId}`,
      payload: { q: 'Q2' },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/cards/${cardId}/history`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.history[0].q).toBe('Q1');
  });

  it('GET /api/cards/:cardId/history should 404 for non-existent card', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/cards/non-existent-id/history',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/cards/:cardId/rollback/:versionId should roll back card', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'Q1', a: 'A1' },
    });
    const cardId = JSON.parse(create.body).card.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/cards/${cardId}`,
      payload: { q: 'Q2' },
    });

    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/cards/${cardId}/history`,
    });
    const versionId = JSON.parse(historyRes.body).history[0].version_id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/cards/${cardId}/rollback/${versionId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.card.q).toBe('Q1');
  });

  describe('Files API', () => {
    it('GET /api/files should return empty list initially', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/files' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.files).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('POST /api/files/folder should create a folder', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: 'Test Folder' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.file.name).toBe('Test Folder');
      expect(body.file.is_folder).toBe(1);
    });

    it('POST /api/files/folder should reject empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: '  ' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('POST /api/files/upload should upload files', async () => {
      const content = Buffer.from('Hello API').toString('base64');
      const response = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {
          files: [{ name: 'api-test.txt', content, mimeType: 'text/plain' }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
      expect(body.files[0].name).toBe('api-test.txt');
      expect(body.files[0].size).toBe(9);
    });

    it('POST /api/files/upload should reject empty file list', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: { files: [] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('GET /api/files/:id should return single file', async () => {
      const content = Buffer.from('single file').toString('base64');
      const upload = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: { files: [{ name: 'single.txt', content, mimeType: 'text/plain' }] },
      });
      const fileId = JSON.parse(upload.body).files[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/files/${fileId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.file.id).toBe(fileId);
    });

    it('GET /api/files/:id/download should return file headers', async () => {
      const content = Buffer.from('download content').toString('base64');
      const upload = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: { files: [{ name: 'download.txt', content, mimeType: 'text/plain' }] },
      });
      const fileId = JSON.parse(upload.body).files[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/files/${fileId}/download`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toContain('download.txt');
    });

    it('GET /api/files/:id/download should 404 for non-existent file', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/non-existent/download',
      });

      expect(response.statusCode).toBe(404);
    });

    it('GET /api/files/:id/preview should return file with inline disposition', async () => {
      const content = Buffer.from('preview content').toString('base64');
      const upload = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: { files: [{ name: 'preview.txt', content, mimeType: 'text/plain' }] },
      });
      const fileId = JSON.parse(upload.body).files[0].id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/files/${fileId}/preview`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-disposition']).toBe('inline');
    });

    it('GET /api/files/:id/preview should 404 for non-existent file', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/files/non-existent/preview',
      });

      expect(response.statusCode).toBe(404);
    });

    it('DELETE /api/files/:id should delete a file', async () => {
      const content = Buffer.from('delete me').toString('base64');
      const upload = await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: { files: [{ name: 'delete-me.txt', content }] },
      });
      const fileId = JSON.parse(upload.body).files[0].id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/files/${fileId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deleted).toBe(1);
    });

    it('DELETE /api/files/:id should 404 for non-existent file', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/files/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('DELETE /api/files/:id should recursively delete folder', async () => {
      const folder = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: 'Delete Folder' },
      });
      const folderId = JSON.parse(folder.body).file.id;

      const content = Buffer.from('nested').toString('base64');
      await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {
          files: [
            { name: 'nested-a.txt', content },
            { name: 'nested-b.txt', content },
          ],
          parentId: folderId,
        },
      });

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/files/${folderId}`,
      });

      expect(deleteRes.statusCode).toBe(200);
      expect(JSON.parse(deleteRes.body).deleted).toBe(3);

      const getRes = await app.inject({ method: 'GET', url: '/api/files' });
      const files = JSON.parse(getRes.body).files;
      expect(files.some((f: { id: string }) => f.id === folderId)).toBe(false);
    });
  });

  describe('Extensions API', () => {
    it('GET /api/extensions should return extensions list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/extensions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.extensions)).toBe(true);
    });

    it('POST /api/extensions should install an extension', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'test-ext', name: 'Test Extension', description: 'A test extension' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.extension.name).toBe('Test Extension');
    });

    it('POST /api/extensions should reject duplicate id', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'dup-ext', name: 'Dup Extension' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'dup-ext', name: 'Dup Extension' },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('GET /api/extensions/:id should return single extension', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'get-ext', name: 'Get Extension' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/extensions/get-ext',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.extension.id).toBe('get-ext');
    });

    it('GET /api/extensions/:id should 404 for non-existent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/extensions/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('POST /api/extensions/:id/enabled should toggle extension', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'toggle-ext', name: 'Toggle Extension' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/extensions/toggle-ext/enabled',
        payload: { enabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('DELETE /api/extensions/:id should uninstall extension', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/extensions',
        payload: { id: 'del-ext', name: 'Delete Extension' },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/extensions/del-ext',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });
});
