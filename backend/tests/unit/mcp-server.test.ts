import http from 'node:http';
import { MCPServer } from '../../src/mcp/server.js';

function makeRequest(port: number, path: string, options: http.RequestOptions & { body?: string } = {}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode ?? 0, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe('MCPServer', () => {
  let server: MCPServer;

  afterEach(() => {
    server?.stop();
  });

  it('should expose auth token', () => {
    server = new MCPServer({ port: 0, authToken: 'test-token' });
    expect(server.getAuthToken()).toBe('test-token');
  });

  it('should respond to health check', async () => {
    server = new MCPServer({ port: 0, authToken: 'test-token' });
    await server.start();
    const port = server.getActualPort();

    const res = await makeRequest(port, '/health');
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>).status).toBe('ok');
  });

  it('should list tools', async () => {
    server = new MCPServer({ port: 0, authToken: 'test-token' });
    await server.start();
    const port = server.getActualPort();

    const res = await makeRequest(port, '/tools');
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(Array.isArray(body.tools)).toBe(true);
    expect(Array.isArray((body.categories as Record<string, unknown>).cards)).toBe(true);
  });

  it('should reject unauthorized call', async () => {
    server = new MCPServer({ port: 0, authToken: 'secret' });
    await server.start();
    const port = server.getActualPort();

    const res = await makeRequest(port, '/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'get_card_stats', params: {} }),
    });
    expect(res.status).toBe(401);
  });

  it('should execute card tool with valid auth', async () => {
    server = new MCPServer({ port: 0, authToken: 'secret' });
    await server.start();
    const port = server.getActualPort();

    const res = await makeRequest(port, '/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      },
      body: JSON.stringify({ tool: 'get_card_stats', params: {} }),
    });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
  });

  it('should handle CORS preflight', async () => {
    server = new MCPServer({ port: 0, authToken: 'test' });
    await server.start();
    const port = server.getActualPort();

    const res = await makeRequest(port, '/health', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.status).toBe(204);
  });
});
