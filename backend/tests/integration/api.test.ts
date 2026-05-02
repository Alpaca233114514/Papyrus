import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app, initApp } from '../../src/api/server.js';
import { closeDb } from '../../src/db/database.js';
import { CardTools } from '../../src/ai/tools.js';

// Access the aiManager singleton inside the route module for monkey-patching
let aiManagerSingleton: Record<string, unknown> | null = null;

describe('API Integration Tests', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-api-test-${Date.now()}`);
  const originalFetch = global.fetch;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;
    await initApp();
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  beforeEach(async () => {
    // 1. 清理数据库业务表（保留 providers / api_keys / models seed）
    const { getDb } = await import('../../src/db/database.js');
    const db = getDb();
    db.exec(`DELETE FROM files; DELETE FROM cards; DELETE FROM notes;
             DELETE FROM card_versions; DELETE FROM note_versions;
             DELETE FROM relations;`);

    // 2. 清理文件系统 vault
    const { paths } = await import('../../src/utils/paths.js');
    fs.rmSync(paths.vaultDir, { recursive: true, force: true });

    // 3. 重置内存单例
    const { aiManager, aiConfig } = await import('../../src/api/routes/ai.js');
    aiManager.reset();
    aiConfig.loadConfig();

    const { resetToolManager } = await import('../../src/ai/tool-manager.js');
    resetToolManager();

    // 4. 恢复 fetch mock（兜底）
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

  it('should reject https CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: { Origin: 'https://localhost:5173' },
    });

    expect(response.statusCode).toBe(500);
  });

  it('should reject wrong port CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: { Origin: 'http://localhost:9999' },
    });

    expect(response.statusCode).toBe(500);
  });

  it('should reject invalid origin URL CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: { Origin: 'not-a-valid-url' },
    });

    expect(response.statusCode).toBe(500);
  });

  it('should return 404 for unmatched route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/nonexistent-route',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Not found');
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
    // Create a card without reviewing to ensure a cards_reviewed=0 record exists
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

  it('GET /api/progress/history should default days for zero', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/history?days=0',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.days).toBe(30);
  });

  it('GET /api/progress/heatmap should default days for invalid input', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/heatmap?days=abc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.total_days).toBe(365);
  });

  it('GET /api/progress/heatmap should default days for zero', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/progress/heatmap?days=0',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.total_days).toBe(365);
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

  it('POST /api/import should handle varied card and note shapes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/import',
      payload: {
        cards: [
          { question: 'Q2', answer: 'A2', tags: ['t1'] },
          { q: '', a: '', answer: 'A3', id: 'custom-id' },
          null,
        ],
        notes: [
          { title: '', folder: 'Custom', content: 'B', tags: ['t'], headings: [{ level: 1, text: 'H' }], outgoing_links: ['x'] },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.imported).toBe(3);
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

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('GET /api/update/check should handle fetch error', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.reject(new Error('network error'));

      const response = await app.inject({
        method: 'GET',
        url: '/api/update/check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);

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
        json: () => Promise.resolve({ tag_name: 'v999.0.0', html_url: 'https://example.com', assets: [] }),
      } as unknown as Response);

      const response = await app.inject({
        method: 'GET',
        url: '/api/update/check',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.has_update).toBe(true);

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
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

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

  it('POST /api/config/ai/test should handle ollama non-ok', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 503 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('503');

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should succeed for non-ollama', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) } as unknown as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should reject private url', async () => {
    // 直接绕过 /config/ai 的 validateConfig 保存，构造数据库中存在私有地址的场景
    const { saveProvider, saveApiKey } = await import('../../src/db/database.js');
    saveProvider({ id: 'p-openai', type: 'openai', name: 'OpenAI', baseUrl: 'http://192.168.1.1/v1', enabled: true, isDefault: false });
    saveApiKey('p-openai', { id: 'k-openai', name: 'default', key: 'sk-test' });
    await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {},
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('SSRF');
  });

  it('POST /api/config/ai/test should report missing api key', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: '', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('API Key');
  });

  it('POST /api/config/ai/test should report missing base url', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: 'sk-test', base_url: '', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai/test',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Base URL');
  });

  it('POST /api/config/ai/test should handle 401 response', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 401 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('无效');

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should handle 404 response', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 404 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should handle other error response', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 503 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toContain('503');

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should handle fetch exception', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.reject(new Error('timeout'));

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/config/ai/test should handle ollama fetch error', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.reject(new Error('ollama down'));

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/config/ai/test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/completion should stream ollama response', async () => {
    const savedFetch = global.fetch;
    const streamData = [
      '{"message":{"content":"hello"}}',
      '{"message":{"content":" world"}}',
    ];

    try {
      global.fetch = () => {
        let index = 0;
        const readable = new ReadableStream({
          pull(controller) {
            if (index < streamData.length) {
              controller.enqueue(new TextEncoder().encode(streamData[index] + '\n'));
              index++;
            } else {
              controller.close();
            }
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/completion',
        payload: { prefix: 'hello' },
      });

      expect(response.statusCode).toBe(200);
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/completion should handle ollama error', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 500 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/completion',
        payload: { prefix: 'hello' },
      });

      expect(response.statusCode).toBe(200);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/completion should stream openai-style response', async () => {
    const savedFetch = global.fetch;
    const streamData = [
      'data: {"choices":[{"delta":{"content":"hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ];

    try {
      global.fetch = () => {
        let index = 0;
        const readable = new ReadableStream({
          pull(controller) {
            if (index < streamData.length) {
              controller.enqueue(new TextEncoder().encode(streamData[index] + '\n\n'));
              index++;
            } else {
              controller.close();
            }
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/completion',
        payload: { prefix: 'hello' },
      });

      expect(response.statusCode).toBe(200);
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/completion should handle openai error', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.resolve({ ok: false, status: 503 } as Response);

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'openai',
          current_model: 'gpt-4',
          providers: {
            openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/completion',
        payload: { prefix: 'hello' },
      });

      expect(response.statusCode).toBe(200);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/completion should reject missing api_key for non-ollama', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: '', base_url: 'https://api.openai.com', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/completion',
      payload: { prefix: 'hello' },
    });

    // completion 使用 SSE hijack，缺失 api_key 时返回 200 并在流中输出错误
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('API Key');
  });

  it('POST /api/chat should stream ollama response', async () => {
    const savedFetch = global.fetch;
    const streamData = [
      '{"message":{"content":"hi"}}',
      '{"message":{"content":" there"}}',
    ];

    try {
      global.fetch = () => {
        let index = 0;
        const readable = new ReadableStream({
          pull(controller) {
            if (index < streamData.length) {
              controller.enqueue(new TextEncoder().encode(streamData[index] + '\n'));
              index++;
            } else {
              controller.close();
            }
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/chat',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(200);
    } finally {
      global.fetch = savedFetch;
    }
  });

  it('POST /api/chat should handle stream error', async () => {
    const savedFetch = global.fetch;
    try {
      global.fetch = () => Promise.reject(new Error('stream failed'));

      await app.inject({
        method: 'POST',
        url: '/api/config/ai',
        payload: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: {
            ollama: { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] },
          },
          parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
          features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/chat',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(200);

    } finally {
      global.fetch = savedFetch;
    }
  });

  it('GET /api/providers should list providers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/providers',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.providers)).toBe(true);
  });

  it('GET /api/config/logs/dir should return log files', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/config/logs/dir',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.files)).toBe(true);
  });

  it('DELETE /api/cards/:cardId should delete a card', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'ToDelete', a: 'A' },
    });
    const cardId = JSON.parse(create.body).card.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/cards/${cardId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('DELETE /api/cards/:cardId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/cards/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('PATCH /api/cards/:cardId should update a card', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'Old', a: 'A' },
    });
    const cardId = JSON.parse(create.body).card.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/cards/${cardId}`,
      payload: { q: 'New' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.card.q).toBe('New');
  });

  it('PATCH /api/cards/:cardId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/cards/non-existent-id',
      payload: { q: 'New' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/cards/import/txt should import cards', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards/import/txt',
      payload: { content: 'Q1\tA1\nQ2\tA2' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
  });

  it('POST /api/cards/import/txt should 400 for empty content', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards/import/txt',
      payload: { content: '' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/notes should list notes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/notes',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
    expect(typeof body.count).toBe('number');
  });

  it('GET /api/notes/:noteId should get a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'GetMe', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/notes/${noteId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('GetMe');
  });

  it('GET /api/notes/:noteId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/notes/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/notes should reject empty title', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { content: 'body' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('PATCH /api/notes/:noteId should update a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Old', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/notes/${noteId}`,
      payload: { title: 'New' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('New');
  });

  it('PATCH /api/notes/:noteId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/notes/non-existent-id',
      payload: { title: 'X' },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('DELETE /api/notes/:noteId should delete a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'DelMe', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/notes/${noteId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/notes/import/obsidian should 400 without vault_path', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/import/obsidian',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/review/:cardId/rate should rate a card', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'RateMe', a: 'A' },
    });
    const cardId = JSON.parse(create.body).card.id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/review/${cardId}/rate`,
      payload: { grade: 3 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.interval_days).toBeDefined();
  });

  it('POST /api/review/:cardId/rate should 400 for invalid grade', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/review/non-existent/rate',
      payload: { grade: 5 },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/review/:cardId/rate should 404 for non-existent card with valid grade', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/review/non-existent/rate',
      payload: { grade: 3 },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/providers/:providerId/models should add a model', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/models`,
      payload: { name: 'TestModel', modelId: 'test-model', port: 'openai' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.modelId).toBe('string');
  });

  it('POST /api/providers/:providerId/apikeys should add an api key', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/apikeys`,
      payload: { name: 'test-key', key: 'sk-test' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.keyId).toBe('string');
  });

  it('POST /api/providers/:providerId/default should set default', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/default`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/providers/:providerId/enabled should toggle enabled', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/enabled`,
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/providers should create provider with apiKeys and models', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/providers',
      payload: {
        type: 'openai',
        name: 'FullProvider',
        baseUrl: 'http://localhost',
        enabled: false,
        apiKeys: [{ name: 'key1', key: 'sk-1' }],
        models: [{ name: 'Model1', modelId: 'm1', port: 'openai' }],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.provider.name).toBe('FullProvider');
  });

  it('DELETE /api/providers/:providerId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/providers/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('PUT /api/providers/:providerId should update provider', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/providers',
      payload: { type: 'openai', name: 'Before', baseUrl: '', enabled: false },
    });
    const providerId = JSON.parse(create.body).provider.id;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/providers/${providerId}`,
      payload: { type: 'openai', name: 'After', baseUrl: '', enabled: false },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('PUT /api/providers/:providerId/models/:modelId should update model', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const model = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/models`,
      payload: { name: 'UpdModel', modelId: 'upd-m', port: 'openai' },
    });
    const modelId = JSON.parse(model.body).modelId;

    const response = await app.inject({
      method: 'PUT',
      url: `/api/providers/${providerId}/models/${modelId}`,
      payload: { name: 'UpdatedModel', modelId: 'upd-m', port: 'openai' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('DELETE /api/providers/:providerId/models/:modelId should delete model', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const model = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/models`,
      payload: { name: 'DelModel', modelId: 'del-m', port: 'openai' },
    });
    const modelId = JSON.parse(model.body).modelId;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/providers/${providerId}/models/${modelId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('DELETE /api/providers/:providerId/apikeys/:keyId should delete api key', async () => {
    const providers = await app.inject({ method: 'GET', url: '/api/providers' });
    const providerId = JSON.parse(providers.body).providers[0].id;

    const key = await app.inject({
      method: 'POST',
      url: `/api/providers/${providerId}/apikeys`,
      payload: { name: 'del-key', key: 'sk-del' },
    });
    const keyId = JSON.parse(key.body).keyId;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/providers/${providerId}/apikeys/${keyId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/config/logs should update log config', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/logs',
      payload: { log_level: 'ERROR', max_log_files: 5, log_rotation: true },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/config/logs should reject invalid log level', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/logs',
      payload: { log_level: 'INVALID' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/config/logs should reject log dir outside home', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/logs',
      payload: { log_dir: '/tmp/invalid-log-dir' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/config/logs/open-dir should return log path', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/logs/open-dir',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.path).toBe('string');
  });

  it('GET /api/mcp/notes/:noteId should get a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'MCPNote', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/mcp/notes/${noteId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('MCPNote');
  });

  it('GET /api/mcp/notes/:noteId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/mcp/notes/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/mcp/notes should create a note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes',
      payload: { title: 'MCPCreate', content: 'content' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('MCPCreate');
  });

  it('POST /api/mcp/notes should create a note without content', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes',
      payload: { title: 'NoContent' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.content).toBe('');
  });

  it('PATCH /api/mcp/notes/:noteId should update a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes',
      payload: { title: 'Old', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/mcp/notes/${noteId}`,
      payload: { title: 'New' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('New');
  });

  it('PATCH /api/mcp/notes/:noteId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/mcp/notes/non-existent-id',
      payload: { title: 'New' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('DELETE /api/mcp/notes/:noteId should delete a note', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes',
      payload: { title: 'MCPDel', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/mcp/notes/${noteId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('DELETE /api/mcp/notes/:noteId should 404 for non-existent', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/mcp/notes/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
  });

  it('POST /api/mcp/notes/search should search tags only when search_content is false', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/notes/search',
      payload: { query: 'Test', limit: 10, search_content: false },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('POST /api/mcp/vault/index should list notes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/index',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('POST /api/mcp/vault/read should read notes by ids', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'VaultRead', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/read',
      payload: { ids: [noteId], format: 'summary' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
    expect(body.notes.length).toBeGreaterThan(0);
  });

  it('POST /api/mcp/vault/read should skip non-existent ids', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/read',
      payload: { ids: ['non-existent-id'], format: 'detail' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notes.length).toBe(0);
  });

  it('POST /api/mcp/vault/read should return detail without links', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'DetailNoLinks', content: 'body' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/read',
      payload: { ids: [noteId], format: 'detail' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notes[0]?.content).toBe('body');
    expect(body.notes[0]?.linked_notes).toBeUndefined();
  });

  it('POST /api/mcp/vault/read should support detail format with links', async () => {
    const create1 = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'LinkSource', content: 'body' },
    });
    const noteId1 = JSON.parse(create1.body).note.id;

    const create2 = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'LinkTarget', content: 'body' },
    });
    const noteId2 = JSON.parse(create2.body).note.id;

    await app.inject({
      method: 'PATCH',
      url: `/api/notes/${noteId1}`,
      payload: { content: `link to [[${noteId2}]]` },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/read',
      payload: { ids: [noteId1], format: 'detail', include_links: true },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('POST /api/mcp/vault/read should filter null for broken wiki links', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'BrokenLink', content: 'link to [[non-existent-id]]' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'POST',
      url: '/api/mcp/vault/read',
      payload: { ids: [noteId], format: 'detail', include_links: true },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notes[0]?.linked_notes).toEqual([]);
  });

  it('POST /api/config/ai should update AI config', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: 'sk-test', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.5, top_p: 0.9, max_tokens: 1000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 5, agent_enabled: false },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/config/ai should preserve masked api keys', async () => {
    // First ensure a real key is stored
    await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: 'sk-real-key', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 0, agent_enabled: false },
      },
    });

    // Send masked key — should preserve the original
    const response = await app.inject({
      method: 'POST',
      url: '/api/config/ai',
      payload: {
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {
          openai: { api_key: '********', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] },
        },
        parameters: { temperature: 0.7, top_p: 1, max_tokens: 2000, presence_penalty: 0, frequency_penalty: 0 },
        features: { auto_hint: false, auto_explain: false, context_length: 0, agent_enabled: false },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('GET /api/completion/config should return config', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/completion/config',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.config).toBeDefined();
  });

  it('POST /api/completion/config should update config', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/completion/config',
      payload: { enabled: false },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/sessions should create a session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'Test Session' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.session.title).toBe('Test Session');
  });

  it('POST /api/sessions/:sessionId/switch should switch session', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'SwitchMe' },
    });
    const sessionId = JSON.parse(create.body).session.id;

    const response = await app.inject({
      method: 'POST',
      url: `/api/sessions/${sessionId}/switch`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('PATCH /api/sessions/:sessionId should rename session', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'OldName' },
    });
    const sessionId = JSON.parse(create.body).session.id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}`,
      payload: { title: 'NewName' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('DELETE /api/sessions/:sessionId should delete session', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { title: 'ToDelete' },
    });
    const sessionId = JSON.parse(create.body).session.id;

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/sessions/${sessionId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).success).toBe(true);
  });

  it('POST /api/sessions/:sessionId/switch should error for non-existent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sessions/non-existent-id/switch',
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('PATCH /api/sessions/:sessionId should error for non-existent', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/sessions/non-existent-id',
      payload: { title: 'X' },
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('DELETE /api/sessions/:sessionId should error for non-existent', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/sessions/non-existent-id',
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('POST /api/notes/import/obsidian should import markdown files', async () => {
    const vaultDir = path.join(os.tmpdir(), `papyrus-obsidian-test-${Date.now()}`);
    fs.mkdirSync(vaultDir, { recursive: true });
    fs.writeFileSync(path.join(vaultDir, 'Test.md'), '# Hello\n\nWorld');

    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/import/obsidian',
      payload: { vault_path: vaultDir },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.imported).toBeGreaterThanOrEqual(1);

    fs.rmSync(vaultDir, { recursive: true, force: true });
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

  it('POST /api/tools/approve/:callId should execute pending tool', async () => {
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

    const response = await app.inject({
      method: 'POST',
      url: `/api/tools/approve/${callId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();
  });

  it('POST /api/tools/reject/:callId should reject pending tool', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tools/config',
      payload: { mode: 'manual', auto_execute_tools: [] },
    });

    const submit = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'create_card', params: { question: 'Q2', answer: 'A2' } },
    });
    const callId = JSON.parse(submit.body).call?.call_id;
    expect(callId).toBeTruthy();

    const response = await app.inject({
      method: 'POST',
      url: `/api/tools/reject/${callId}`,
      payload: { reason: 'test' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('GET /api/tools/calls should list calls', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/tools/calls?limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.calls)).toBe(true);
  });

  it('GET /api/tools/calls/:callId should get a call', async () => {
    const submit = await app.inject({
      method: 'POST',
      url: '/api/tools/submit',
      payload: { tool_name: 'get_card_stats', params: {} },
    });
    const callId = JSON.parse(submit.body).call?.call_id;
    expect(callId).toBeTruthy();

    const response = await app.inject({
      method: 'GET',
      url: `/api/tools/calls/${callId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.call.call_id).toBe(callId);
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

  it('GET /api/notes/:noteId/history/:versionId should return a version', async () => {
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
      method: 'GET',
      url: `/api/notes/${noteId}/history/${versionId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.version.content).toBe('v1');
  });

  it('GET /api/notes/:noteId/history/:versionId should 404 for non-existent version', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/notes',
      payload: { title: 'Versioned', content: 'v1' },
    });
    const noteId = JSON.parse(create.body).note.id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/notes/${noteId}/history/non-existent-version`,
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

  it('POST /api/notes/:noteId/rollback/:versionId should 404 for non-existent note', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/notes/non-existent-id/rollback/some-version',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('GET /api/notes/:noteId/history/:versionId should 404 for non-existent note', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/notes/non-existent-id/history/some-version',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
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

  it('GET /api/cards/:cardId/history/:versionId should return a version', async () => {
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
      method: 'GET',
      url: `/api/cards/${cardId}/history/${versionId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.version.q).toBe('Q1');
  });

  it('GET /api/cards/:cardId/history/:versionId should 404 for non-existent version', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { q: 'Q1', a: 'A1' },
    });
    const cardId = JSON.parse(create.body).card.id;

    const response = await app.inject({
      method: 'GET',
      url: `/api/cards/${cardId}/history/non-existent-version`,
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

  it('POST /api/cards/:cardId/rollback/:versionId should 404 for non-existent card', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/cards/non-existent-id/rollback/some-version',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
  });

  it('GET /api/cards/:cardId/history/:versionId should 404 for non-existent card', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/cards/non-existent-id/history/some-version',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).success).toBe(false);
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

    it('POST /api/files/folder should create subfolder', async () => {
      const parent = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: 'Parent Folder' },
      });
      const parentId = JSON.parse(parent.body).file.id;

      const response = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: 'Sub Folder', parentId },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.file.parent_id).toBe(parentId);
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

    it('GET /api/files should return all files', async () => {
      const folder = await app.inject({
        method: 'POST',
        url: '/api/files/folder',
        payload: { name: 'List Folder' },
      });

      const content = Buffer.from('Hello API').toString('base64');
      await app.inject({
        method: 'POST',
        url: '/api/files/upload',
        payload: {
          files: [{ name: 'list-test.txt', content, mimeType: 'text/plain' }],
        },
      });

      const response = await app.inject({ method: 'GET', url: '/api/files' });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.files.length).toBeGreaterThanOrEqual(2);
      // Folders should come before files
      const types = body.files.map((f: { is_folder: number }) => f.is_folder);
      for (let i = 1; i < types.length; i++) {
        expect(types[i - 1]).toBeGreaterThanOrEqual(types[i]);
      }
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
      // The file stream may not be fully captured by inject(),
      // but headers should be set correctly
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
});
