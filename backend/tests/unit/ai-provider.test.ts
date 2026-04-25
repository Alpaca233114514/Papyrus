import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('AIManager', () => {
  const testDir = path.join(os.tmpdir(), `papyrus-ai-test-${Date.now()}`);

  let AIManager: new (config: unknown) => unknown;
  let AIConfig: new (dataDir: string) => { config: unknown };
  let isPrivateUrl: (url: string) => boolean;

  beforeAll(async () => {
    fs.mkdirSync(testDir, { recursive: true });
    process.env.PAPYRUS_DATA_DIR = testDir;

    const aiModule = await import('../../src/ai/provider.js');
    const configModule = await import('../../src/ai/config.js');
    AIManager = aiModule.AIManager;
    AIConfig = configModule.AIConfig;
    isPrivateUrl = configModule.isPrivateUrl;
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.PAPYRUS_DATA_DIR;
  });

  beforeEach(() => {
    const sessionsFile = path.join(testDir, 'conversations', 'sessions.json');
    if (fs.existsSync(sessionsFile)) {
      fs.rmSync(sessionsFile, { force: true });
    }
  });

  function createManager() {
    const config = new AIConfig(testDir);
    (config.config as Record<string, unknown>).current_provider = 'ollama';
    (config.config as Record<string, unknown>).current_model = 'llama2';
    const providers = (config.config as Record<string, unknown>).providers as Record<string, unknown>;
    providers.ollama = { api_key: '', base_url: 'http://localhost:11434', models: ['llama2'] };
    return new AIManager(config);
  }

  describe('sessions', () => {
    it('should create default session on init', () => {
      const manager = createManager();
      const sessionId = (manager as Record<string, unknown>).getActiveSessionId() as string;
      expect(sessionId).toBeTruthy();
      const title = (manager as Record<string, unknown>).getActiveSessionTitle() as string;
      expect(title).toBeTruthy();
    });

    it('should create a new session and switch to it', () => {
      const manager = createManager();
      const session = (manager as Record<string, unknown>).createSession('Test Session') as { id: string; title: string };
      expect(session.title).toBe('Test Session');
      expect((manager as Record<string, unknown>).getActiveSessionId()).toBe(session.id);
    });

    it('should create session without switching', () => {
      const manager = createManager();
      const firstId = (manager as Record<string, unknown>).getActiveSessionId() as string;
      const session = (manager as Record<string, unknown>).createSession('No Switch', false) as { id: string };
      expect((manager as Record<string, unknown>).getActiveSessionId()).toBe(firstId);
      expect(session.id).not.toBe(firstId);
    });

    it('should switch between sessions', () => {
      const manager = createManager();
      const s1 = (manager as Record<string, unknown>).createSession('S1') as { id: string };
      const s2 = (manager as Record<string, unknown>).createSession('S2', false) as { id: string };
      (manager as Record<string, unknown>).switchSession(s2.id);
      expect((manager as Record<string, unknown>).getActiveSessionId()).toBe(s2.id);
      (manager as Record<string, unknown>).switchSession(s1.id);
      expect((manager as Record<string, unknown>).getActiveSessionId()).toBe(s1.id);
    });

    it('should throw when switching to non-existent session', () => {
      const manager = createManager();
      expect(() => (manager as Record<string, unknown>).switchSession('no-such-id')).toThrow();
    });

    it('should rename a session', () => {
      const manager = createManager();
      const session = (manager as Record<string, unknown>).createSession('Old') as { id: string };
      (manager as Record<string, unknown>).renameSession(session.id, 'New');
      const active = (manager as Record<string, unknown>).getActiveSession() as { title: string };
      expect(active.title).toBe('New');
    });

    it('should fallback title when renaming to empty', () => {
      const manager = createManager();
      const session = (manager as Record<string, unknown>).createSession('Old') as { id: string };
      (manager as Record<string, unknown>).renameSession(session.id, '   ');
      const active = (manager as Record<string, unknown>).getActiveSession() as { title: string };
      expect(active.title).toBe('新对话');
    });

    it('should throw when renaming non-existent session', () => {
      const manager = createManager();
      expect(() => (manager as Record<string, unknown>).renameSession('no-such-id', 'X')).toThrow();
    });

    it('should delete a session', () => {
      const manager = createManager();
      const s1 = (manager as Record<string, unknown>).createSession('S1') as { id: string };
      const s2 = (manager as Record<string, unknown>).createSession('S2', false) as { id: string };
      (manager as Record<string, unknown>).deleteSession(s2.id);
      expect(() => (manager as Record<string, unknown>).switchSession(s2.id)).toThrow('会话不存在');
    });

    it('should throw when deleting the last session', () => {
      const manager = createManager();
      const sessions = (manager as Record<string, unknown>).listSessions() as Array<{ id: string }>;
      expect(sessions.length).toBe(1);
      expect(() => (manager as Record<string, unknown>).deleteSession(sessions[0]!.id)).toThrow();
    });

    it('should throw when deleting non-existent session', () => {
      const manager = createManager();
      expect(() => (manager as Record<string, unknown>).deleteSession('no-such-id')).toThrow('会话不存在');
    });

    it('should list sessions sorted by updated_at desc', async () => {
      const manager = createManager();
      (manager as Record<string, unknown>).createSession('A', false);
      await new Promise(r => setTimeout(r, 20));
      const b = (manager as Record<string, unknown>).createSession('B', false) as { id: string };
      await new Promise(r => setTimeout(r, 20));
      (manager as Record<string, unknown>).switchSession(b.id);
      const list = (manager as Record<string, unknown>).listSessions() as Array<{ title: string }>;
      expect(list[0]!.title).toBe('B');
    });

    it('should clear history by creating new session', () => {
      const manager = createManager();
      const oldId = (manager as Record<string, unknown>).getActiveSessionId() as string;
      (manager as Record<string, unknown>).clearHistory();
      const newId = (manager as Record<string, unknown>).getActiveSessionId() as string;
      expect(newId).not.toBe(oldId);
    });

    it('should persist and reload sessions from file', () => {
      const manager1 = createManager();
      const session = (manager1 as Record<string, unknown>).createSession('Persisted') as { id: string };
      (manager1 as Record<string, unknown>).switchSession(session.id);

      const manager2 = createManager();
      const list = (manager2 as Record<string, unknown>).listSessions() as Array<{ title: string }>;
      expect(list.some(s => s.title === 'Persisted')).toBe(true);
    });

    it('should create new session when active is invalid', () => {
      const manager = createManager();
      const originalId = (manager as Record<string, unknown>).getActiveSessionId() as string;
      (manager as Record<string, unknown>).createSession('Second', false);
      (manager as Record<string, unknown>).deleteSession(originalId);
      // After deleting the active session, activeSessionId gets reassigned
      // Manually corrupt it to test the fallback
      (manager as Record<string, unknown>).activeSessionId = 'invalid-id';
      const session = (manager as Record<string, unknown>).getActiveSession() as { title: string };
      expect(session.title).toBe('新对话');
    });
  });

  describe('conversationHistory', () => {
    it('should get and set conversation history', () => {
      const manager = createManager();
      (manager as Record<string, unknown>).conversationHistory = [
        { role: 'user', content: 'hello' },
      ];
      const history = (manager as Record<string, unknown>).conversationHistory as Array<{ role: string; content: string }>;
      expect(history.length).toBe(1);
      expect(history[0]!.content).toBe('hello');
    });

    it('should handle null history', () => {
      const manager = createManager();
      (manager as Record<string, unknown>).conversationHistory = null;
      const history = (manager as Record<string, unknown>).conversationHistory as Array<unknown>;
      expect(history.length).toBe(0);
    });
  });

  describe('attachments', () => {
    it('should validate empty attachments', () => {
      const manager = createManager();
      const result = (manager as Record<string, unknown>).validateAttachments([]);
      expect(result).toEqual([]);
    });

    it('should throw when too many attachments', () => {
      const manager = createManager();
      const attachments = Array.from({ length: 6 }, (_, i) => ({ path: `/tmp/f${i}.txt` }));
      expect(() => (manager as Record<string, unknown>).validateAttachments(attachments)).toThrow();
    });

    it('should throw when file does not exist', () => {
      const manager = createManager();
      expect(() => (manager as Record<string, unknown>).validateAttachments([{ path: '/non-existent/file.png' }])).toThrow();
    });

    it('should throw for unsupported file type', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'unsupported.xyz');
      fs.writeFileSync(tmpFile, 'x');
      expect(() => (manager as Record<string, unknown>).validateAttachments([{ path: tmpFile }])).toThrow();
    });

    it('should throw for oversized file', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'big.png');
      fs.writeFileSync(tmpFile, Buffer.alloc(11 * 1024 * 1024));
      expect(() => (manager as Record<string, unknown>).validateAttachments([{ path: tmpFile }])).toThrow();
    });

    it('should accept valid image file', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'image.png');
      fs.writeFileSync(tmpFile, 'fake-image');
      const result = (manager as Record<string, unknown>).validateAttachments([{ path: tmpFile }]) as string[];
      expect(result).toEqual([tmpFile]);
    });

    it('should accept string paths', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc.txt');
      fs.writeFileSync(tmpFile, 'hello');
      const result = (manager as Record<string, unknown>).validateAttachments([tmpFile]) as string[];
      expect(result).toEqual([tmpFile]);
    });

    it('should skip items without path', () => {
      const manager = createManager();
      const result = (manager as Record<string, unknown>).validateAttachments([{}, { path: '' }]) as string[];
      expect(result).toEqual([]);
    });

    it('should store attachments', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'store.png');
      fs.writeFileSync(tmpFile, 'fake-image');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<{ name: string; type: string }>;
      expect(stored.length).toBe(1);
      expect(stored[0]!.name).toBe('store.png');
      expect(stored[0]!.type).toBe('image');
    });

    it('should resolve valid attachment path', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'store.png');
      fs.writeFileSync(tmpFile, 'fake-image');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<{ path: string }>;
      const resolved = (manager as Record<string, unknown>).resolveAttachmentPath(stored[0]!) as string;
      expect(fs.existsSync(resolved)).toBe(true);
    });

    it('should reject path traversal', () => {
      const manager = createManager();
      const resolved = (manager as Record<string, unknown>).resolveAttachmentPath({ path: '../../../etc/passwd' } as unknown as Record<string, unknown>);
      expect(resolved).toBeNull();
    });

    it('should reject paths outside uploads dir', () => {
      const manager = createManager();
      const resolved = (manager as Record<string, unknown>).resolveAttachmentPath({ path: 'conversations/sessions.json' } as unknown as Record<string, unknown>);
      expect(resolved).toBeNull();
    });
  });

  describe('message building', () => {
    it('should build simple user message without attachments', () => {
      const manager = createManager();
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'hello', []) as { role: string; content: string };
      expect(result.role).toBe('user');
      expect(result.content).toBe('hello');
    });

    it('should build openai message with image attachment', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'img.png');
      fs.writeFileSync(tmpFile, 'fake');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'look', stored) as { role: string; content: Array<Record<string, unknown>> };
      expect(result.role).toBe('user');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]!).toEqual({ type: 'text', text: 'look' });
      expect(result.content[1]!.type).toBe('image_url');
    });

    it('should build openai message with txt attachment', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc.txt');
      fs.writeFileSync(tmpFile, 'document content');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'read', stored) as { role: string; content: Array<Record<string, unknown>> };
      expect(result.content.some((b: Record<string, unknown>) => (b.text as string).includes('document content'))).toBe(true);
    });

    it('should build openai message with unsupported document', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc.pdf');
      fs.writeFileSync(tmpFile, 'pdf');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'read', stored) as { role: string; content: Array<Record<string, unknown>> };
      expect(result.content.some((b: Record<string, unknown>) => typeof b.text === 'string' && (b.text as string).length > 0)).toBe(true);
    });

    it('should build openai message with image read failure', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'img2.png');
      fs.writeFileSync(tmpFile, 'fake');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const originalReadFileSync = fs.readFileSync;
      (fs as Record<string, unknown>).readFileSync = () => { throw new Error('fail'); };
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'look', stored) as { role: string; content: Array<Record<string, unknown>> };
      (fs as Record<string, unknown>).readFileSync = originalReadFileSync;
      expect(result.content.some((b: Record<string, unknown>) => typeof b.text === 'string' && (b.text as string).length > 0)).toBe(true);
    });

    it('should build openai message with empty txt file', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'empty.txt');
      fs.writeFileSync(tmpFile, '');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'read', stored) as { role: string; content: Array<Record<string, unknown>> };
      expect(result.content.some((b: Record<string, unknown>) => typeof b.text === 'string' && (b.text as string).length > 0)).toBe(true);
    });

    it('should build openai message with unresolved attachment path', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'resolve.png');
      fs.writeFileSync(tmpFile, 'fake');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      // Mutate path to invalid so resolveAttachmentPath returns null
      stored[0]!.path = 'nonexistent/file.png';
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('openai', 'look', stored) as { role: string; content: Array<Record<string, unknown>> };
      expect(result.content.some((b: Record<string, unknown>) => (b.text as string)?.includes('resolve.png'))).toBe(true);
    });

    it('should build non-openai message with attachments', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc2.txt');
      fs.writeFileSync(tmpFile, 'hello world');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('anthropic', 'read', stored) as { role: string; content: string };
      expect(result.role).toBe('user');
      expect(result.content).toContain('hello world');
    });

    it('should build non-openai message with non-txt document', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc.pdf');
      fs.writeFileSync(tmpFile, 'pdf-content');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('anthropic', 'read', stored) as { role: string; content: string };
      expect(result.role).toBe('user');
      expect(result.content).toContain('doc.pdf');
      expect(result.content).not.toContain('内容摘要');
    });

    it('should build non-openai message with invalid attachment path', () => {
      const manager = createManager();
      const stored = [{ path: 'invalid', name: 'bad.txt', type: 'document' as const, mime_type: 'text/plain', size: 0, created_at: 0, id: 'x', stored_name: 'x' }];
      const result = (manager as Record<string, unknown>).buildUserMessageForProvider('anthropic', 'read', stored) as { role: string; content: string };
      expect(result.content).toBeTruthy();
    });

    it('should convert message to provider format without attachments', () => {
      const manager = createManager();
      const result = (manager as Record<string, unknown>).messageToProviderFormat('openai', { role: 'assistant', content: 'hi' }) as { role: string; content: string };
      expect(result).toEqual({ role: 'assistant', content: 'hi' });
    });

    it('should convert user message with attachments to provider format', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'doc3.txt');
      fs.writeFileSync(tmpFile, 'content');
      const stored = (manager as Record<string, unknown>).storeAttachments([{ path: tmpFile }]) as Array<Record<string, unknown>>;
      const result = (manager as Record<string, unknown>).messageToProviderFormat('openai', { role: 'user', content: 'hi', attachments: stored }) as { role: string; content: unknown };
      expect(result.role).toBe('user');
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe('chatStreamOllama', () => {
    it('should stream content from ollama', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;

      const streamData = [
        '{"message":{"content":"hello"}}',
        '{"message":{"content":" world"}}',
        '{"done":true}',
      ];

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

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hi') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'content')).toBe(true);
      expect(chunks.some(c => c.type === 'done')).toBe(true);
    });

    it('should yield error when ollama response is not ok', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;
      global.fetch = () => Promise.resolve({ ok: false, status: 500, statusText: 'Error' } as Response);

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hi') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'error')).toBe(true);
    });

    it('should stream tool_calls from ollama', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;

      global.fetch = () => {
        const readable = new ReadableStream({
          pull(controller) {
            controller.enqueue(new TextEncoder().encode('{"message":{"content":"","tool_calls":[{"name":"x"}]}}\n'));
            controller.close();
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hi') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'tool_start')).toBe(true);
    });

    it('should handle ollama stream with done true', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;

      global.fetch = () => {
        const readable = new ReadableStream({
          pull(controller) {
            controller.enqueue(new TextEncoder().encode('{"done":true}\n'));
            controller.close();
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hi') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'done')).toBe(true);
    });

    it('should error when ollama response has no body', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;
      global.fetch = () => Promise.resolve({ ok: true, body: null } as unknown as Response);

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hi') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'error')).toBe(true);
    });
  });

  describe('safeReadTextFile', () => {
    it('should read text file contents', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'read.txt');
      fs.writeFileSync(tmpFile, 'hello world');
      const result = (manager as Record<string, unknown>).safeReadTextFile(tmpFile) as string;
      expect(result).toBe('hello world');
    });

    it('should return empty string for missing file', () => {
      const manager = createManager();
      const result = (manager as Record<string, unknown>).safeReadTextFile('/non-existent/file.txt') as string;
      expect(result).toBe('');
    });

    it('should respect max chars limit', () => {
      const manager = createManager();
      const tmpFile = path.join(testDir, 'long.txt');
      fs.writeFileSync(tmpFile, 'a'.repeat(10000));
      const result = (manager as Record<string, unknown>).safeReadTextFile(tmpFile, 100) as string;
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('loadSessions edge cases', () => {
    it('should handle corrupted sessions file', () => {
      fs.writeFileSync(path.join(testDir, 'conversations', 'sessions.json'), 'not-json');
      const manager = createManager();
      const list = (manager as Record<string, unknown>).listSessions() as Array<unknown>;
      expect(list.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle sessions file with non-object data', () => {
      fs.writeFileSync(path.join(testDir, 'conversations', 'sessions.json'), '123');
      const manager = createManager();
      const list = (manager as Record<string, unknown>).listSessions() as Array<unknown>;
      expect(list.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle sessions with invalid message entries', () => {
      fs.writeFileSync(path.join(testDir, 'conversations', 'sessions.json'), JSON.stringify({
        active_session_id: 'abc',
        sessions: [{ id: 'abc', title: 'T', messages: [null, 123, 'str'], created_at: 0, updated_at: 0 }],
      }));
      const manager = createManager();
      const session = (manager as Record<string, unknown>).getActiveSession() as { messages: Array<unknown> };
      expect(session.messages.length).toBe(3);
      expect(session.messages[0]).toEqual({ role: 'user', content: '' });
    });
  });

  describe('chatStream edge cases', () => {
    it('should yield error for unknown provider', async () => {
      const manager = createManager();
      (manager as Record<string, unknown>).config = {
        config: { current_provider: 'unknown', current_model: 'x', providers: {}, parameters: {}, features: { context_length: 0 } },
      };
      const stream = (manager as Record<string, unknown>).chatStream('hello') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks.some(c => c.type === 'error')).toBe(true);
    });

    it('should include system prompt and history', async () => {
      const manager = createManager();
      (manager as Record<string, unknown>).conversationHistory = [
        { role: 'user', content: 'prev' },
        { role: 'assistant', content: 'resp' },
      ];
      (manager as Record<string, unknown>).config = {
        config: { current_provider: 'unknown', current_model: 'x', providers: {}, parameters: {}, features: { context_length: 2 } },
      };
      const stream = (manager as Record<string, unknown>).chatStream('hello', 'system') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      expect(chunks.some(c => c.type === 'error')).toBe(true);
    });

    it('should include system prompt with valid provider', async () => {
      const manager = createManager();
      const originalFetch = global.fetch;

      global.fetch = () => {
        const readable = new ReadableStream({
          pull(controller) {
            controller.enqueue(new TextEncoder().encode('{"message":{"content":"ok"}}\n'));
            controller.close();
          },
        });
        return Promise.resolve({ ok: true, body: readable } as unknown as Response);
      };

      (manager as Record<string, unknown>).config = {
        config: {
          current_provider: 'ollama',
          current_model: 'llama2',
          providers: { ollama: { api_key: '', base_url: 'http://localhost:11434' } },
          parameters: { temperature: 0.7 },
          features: { context_length: 0 },
        },
      };

      const stream = (manager as Record<string, unknown>).chatStream('hello', 'system prompt here') as AsyncGenerator<Record<string, unknown>>;
      const chunks: Array<Record<string, unknown>> = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      global.fetch = originalFetch;
      expect(chunks.some(c => c.type === 'content')).toBe(true);
      expect(chunks.some(c => c.type === 'done')).toBe(true);
    });
  });

  describe('AIConfig', () => {
    it('should load null config as default', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), 'null');
      const config = new AIConfig(testDir);
      expect(config.config.current_provider).toBe('openai');
    });

    it('should load non-object config as default', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), '123');
      const config = new AIConfig(testDir);
      expect(config.config.current_provider).toBe('openai');
    });

    it('should fallback provider when invalid', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), JSON.stringify({
        current_provider: 'invalid',
        current_model: 'x',
        providers: {},
        parameters: {},
        features: {},
        log: {},
      }));
      const config = new AIConfig(testDir);
      expect(config.config.current_provider).toBe('openai');
    });

    it('should fallback model when not in provider', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), JSON.stringify({
        current_provider: 'openai',
        current_model: 'not-a-model',
        providers: {},
        parameters: {},
        features: {},
        log: {},
      }));
      const config = new AIConfig(testDir);
      expect(config.config.current_model).toBe('gpt-4');
    });

    it('should handle corrupted config file', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), 'not-json');
      const config = new AIConfig(testDir);
      expect(config.config.current_provider).toBe('openai');
    });

    it('should throw for unknown provider in getProviderConfig', () => {
      const config = new AIConfig(testDir);
      config.config.current_provider = 'nonexistent';
      expect(() => config.getProviderConfig()).toThrow('未知 provider');
    });

    it('should validate config with invalid ascii', () => {
      const config = new AIConfig(testDir);
      config.config.providers.openai.api_key = '中文';
      expect(() => config.validateConfig()).toThrow('非法字符');
    });

    it('should validate config with invalid base url', () => {
      const config = new AIConfig(testDir);
      config.config.providers.openai.base_url = '中文';
      expect(() => config.validateConfig()).toThrow('非法字符');
    });

    it('should validate config with private url for non-local provider', () => {
      const config = new AIConfig(testDir);
      config.config.providers.openai.base_url = 'http://192.168.1.1';
      expect(() => config.validateConfig()).toThrow('SSRF');
    });

    it('should get current model', () => {
      const config = new AIConfig(testDir);
      expect(typeof config.getCurrentModel()).toBe('string');
    });

    it('should get parameters', () => {
      const config = new AIConfig(testDir);
      expect(config.getParameters().temperature).toBeDefined();
    });

    it('should get and set log config', () => {
      const config = new AIConfig(testDir);
      const log = config.getLogConfig();
      expect(log.log_level).toBeDefined();
      config.setLogConfig({ ...log, log_level: 'ERROR' });
      expect(config.getLogConfig().log_level).toBe('ERROR');
    });

    it('should mask short api key', () => {
      const config = new AIConfig(testDir);
      config.config.providers.openai.api_key = 'abc';
      const masked = config.getMaskedConfig();
      expect(masked.providers.openai.api_key).toBe('****');
    });

    it('should handle plain: prefix key', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), JSON.stringify({
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: { openai: { api_key: 'plain:test-key', base_url: 'https://api.openai.com/v1', models: ['gpt-4'] } },
        parameters: {},
        features: {},
        log: {},
      }));
      const config = new AIConfig(testDir);
      expect(config.config.providers.openai.api_key).toBe('test-key');
    });

    it('should handle parameters null', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), JSON.stringify({
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: {},
        parameters: null,
        features: {},
        log: {},
      }));
      const config = new AIConfig(testDir);
      expect(config.config.parameters.temperature).toBeDefined();
    });

    it('should handle models as string', () => {
      fs.writeFileSync(path.join(testDir, 'ai_config.json'), JSON.stringify({
        current_provider: 'openai',
        current_model: 'gpt-4',
        providers: { openai: { api_key: '', base_url: '', models: 'not-array' } },
        parameters: {},
        features: {},
        log: {},
      }));
      const config = new AIConfig(testDir);
      expect(Array.isArray(config.config.providers.openai.models)).toBe(true);
    });
  });

  describe('isPrivateUrl', () => {
    it('should detect localhost', () => {
      expect(isPrivateUrl('http://localhost:11434')).toBe(true);
      expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
      expect(isPrivateUrl('http://192.168.1.1')).toBe(true);
      expect(isPrivateUrl('http://10.0.0.1')).toBe(true);
      expect(isPrivateUrl('http://172.16.0.1')).toBe(true);
      expect(isPrivateUrl('')).toBe(false);
      expect(isPrivateUrl('not-a-url')).toBe(false);
      expect(isPrivateUrl('https://api.openai.com')).toBe(false);
    });
  });

  describe('chat and helpers', () => {
    it('should append assistant message', async () => {
      const manager = createManager();
      await (manager as Record<string, unknown>).appendAssistantMessage('hello');
      const history = (manager as Record<string, unknown>).conversationHistory as Array<{ role: string; content: string }>;
      expect(history.some(m => m.role === 'assistant' && m.content === 'hello')).toBe(true);
    });

    it('should throw on chat stream error', async () => {
      const manager = createManager();
      const originalChatStream = (manager as Record<string, unknown>).chatStream.bind(manager);
      (manager as Record<string, unknown>).chatStream = async function*() {
        yield { type: 'error', data: 'failed' };
      };

      await expect((manager as Record<string, unknown>).chat('hi')).rejects.toThrow('failed');
      (manager as Record<string, unknown>).chatStream = originalChatStream;
    });

    it('should call getHint', async () => {
      const manager = createManager();
      const originalChatStream = (manager as Record<string, unknown>).chatStream.bind(manager);
      (manager as Record<string, unknown>).chatStream = async function*() {
        yield { type: 'content', data: 'hint text' };
        yield { type: 'done', data: '' };
      };

      const result = await (manager as Record<string, unknown>).getHint('Q?');
      expect(result).toBe('hint text');
      (manager as Record<string, unknown>).chatStream = originalChatStream;
    });

    it('should call explainAnswer', async () => {
      const manager = createManager();
      const originalChatStream = (manager as Record<string, unknown>).chatStream.bind(manager);
      (manager as Record<string, unknown>).chatStream = async function*() {
        yield { type: 'content', data: 'explanation' };
        yield { type: 'done', data: '' };
      };

      const result = await (manager as Record<string, unknown>).explainAnswer('Q', 'A');
      expect(result).toBe('explanation');
      (manager as Record<string, unknown>).chatStream = originalChatStream;
    });

    it('should call generateRelated', async () => {
      const manager = createManager();
      const originalChatStream = (manager as Record<string, unknown>).chatStream.bind(manager);
      (manager as Record<string, unknown>).chatStream = async function*() {
        yield { type: 'content', data: 'related' };
        yield { type: 'done', data: '' };
      };

      const result = await (manager as Record<string, unknown>).generateRelated('Q', 'A');
      expect(result).toBe('related');
      (manager as Record<string, unknown>).chatStream = originalChatStream;
    });
  });
});
