import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { CardTools } from '../ai/tools.js';
import { loadAllNotes, getNoteById } from '../db/database.js';
import type { PapyrusLogger } from '../utils/logger.js';

export interface MCPServerOptions {
  host?: string;
  port?: number;
  logger?: PapyrusLogger;
  authToken?: string;
}

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

function isAllowedOrigin(origin: string): boolean {
  const allowedPorts = new Set([5173, 4173, 8000, 3000, 9100]);
  try {
    const parsed = new URL(origin);
    const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && allowedPorts.has(port);
  } catch {
    return false;
  }
}

function sendJson(res: http.ServerResponse, data: unknown, status = 200, origin?: string): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(origin && isAllowedOrigin(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }
      : {}),
  });
  res.end(JSON.stringify(data));
}

export class MCPServer {
  private host: string;
  private port: number;
  private logger?: PapyrusLogger;
  private authToken: string;
  private server?: http.Server;
  private cardTools: CardTools;

  constructor(options: MCPServerOptions = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port ?? 9100;
    this.logger = options.logger;
    this.authToken = options.authToken ?? generateToken();
    this.cardTools = new CardTools(this.logger);
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.server = http.createServer((req, res) => {
        const origin = req.headers.origin ?? '';

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            ...(isAllowedOrigin(origin)
              ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' }
              : {}),
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          });
          res.end();
          return;
        }

        if (req.method === 'GET' && req.url === '/health') {
          sendJson(res, { status: 'ok' }, 200, origin);
          return;
        }

        if (req.method === 'GET' && req.url === '/tools') {
          const cardToolsList = [
            'search_cards',
            'get_card_stats',
            'create_card',
            'update_card',
            'delete_card',
          ];
          const vaultToolsList = [
            'vault_index',
            'vault_read',
            'vault_watch',
            'vault_emergency_sample',
          ];
          sendJson(
            res,
            {
              tools: cardToolsList.concat(vaultToolsList),
              categories: { cards: cardToolsList, vault: vaultToolsList },
            },
            200,
            origin,
          );
          return;
        }

        if (req.method !== 'POST' || req.url !== '/call') {
          sendJson(res, { error: '未知路径' }, 404, origin);
          return;
        }

        const authHeader = req.headers.authorization ?? '';
        if (authHeader !== `Bearer ${this.authToken}`) {
          sendJson(res, { error: 'Unauthorized' }, 401, origin);
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(body);
          } catch {
            sendJson(res, { error: '请求体不是合法 JSON' }, 400, origin);
            return;
          }

          if (parsed === null || typeof parsed !== 'object') {
            sendJson(res, { error: '请求体必须是对象' }, 400, origin);
            return;
          }

          const dict = parsed as Record<string, unknown>;
          const toolName = typeof dict.tool === 'string' ? dict.tool : '';
          const params = typeof dict.params === 'object' && dict.params !== null
            ? dict.params as Record<string, unknown>
            : {};

          if (!toolName) {
            sendJson(res, { error: '缺少 tool 字段' }, 400, origin);
            return;
          }

          const vaultToolNames = new Set([
            'vault_index',
            'vault_read',
            'vault_watch',
            'vault_emergency_sample',
          ]);

          if (vaultToolNames.has(toolName)) {
            const result = this.executeVaultTool(toolName, params);
            sendJson(res, result, 200, origin);
          } else {
            const result = this.cardTools.executeTool(toolName, params);
            sendJson(res, result, 200, origin);
          }
        });
      });

      this.server.listen(this.port, this.host, () => {
        this.logger?.info(`MCP 服务器已启动: http://${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  private executeVaultTool(toolName: string, _params: Record<string, unknown>): Record<string, unknown> {
    if (toolName === 'vault_index') {
      const notes = loadAllNotes(this.logger);
      return {
        success: true,
        notes: notes.map(n => ({
          id: n.id,
          title: n.title,
          folder: n.folder,
          preview: n.preview,
          tags: n.tags,
          word_count: n.word_count,
          updated_at: n.updated_at,
        })),
        total: notes.length,
      };
    }
    if (toolName === 'vault_read') {
      const ids = Array.isArray(_params.ids) ? _params.ids as string[] : [];
      const notes = ids.map(id => getNoteById(id)).filter(Boolean);
      return { success: true, notes };
    }
    return { success: false, error: 'Vault工具未完全实现' };
  }

  getActualPort(): number {
    if (!this.server) return this.port;
    const address = this.server.address();
    if (address && typeof address === 'object') {
      return address.port;
    }
    return this.port;
  }

  stop(): void {
    if (!this.server) return;
    this.server.close(() => {
      this.logger?.info('MCP 服务器已停止');
    });
    this.server = undefined;
  }

  getAuthToken(): string {
    return this.authToken;
  }
}
