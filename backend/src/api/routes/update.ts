import type { FastifyInstance } from 'fastify';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { ProxyAgent } from 'undici';

const require = createRequire(import.meta.url);
const pkg = require('../../../package.json');
const CURRENT_VERSION: string = pkg.version;
const REPO = 'PapyrusOR/Papyrus_Desktop';

function getWindowsProxy(): string | undefined {
  try {
    const enabled = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable',
      { encoding: 'utf-8' },
    );
    const enabledMatch = enabled.match(/ProxyEnable\s+REG_DWORD\s+(0x[\da-fA-F]+)/);
    if (!enabledMatch || !enabledMatch[1] || parseInt(enabledMatch[1], 16) === 0) {
      return undefined;
    }

    const server = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: 'utf-8' },
    );
    const serverMatch = server.match(/ProxyServer\s+REG_SZ\s+(.+)/);
    if (!serverMatch || !serverMatch[1]) {
      return undefined;
    }

    const proxy = serverMatch[1].trim();
    const httpsMatch = proxy.match(/https=([^;]+)/);
    if (httpsMatch) {
      return `http://${httpsMatch[1]}`;
    }
    const httpMatch = proxy.match(/http=([^;]+)/);
    if (httpMatch) {
      return `http://${httpMatch[1]}`;
    }
    if (proxy.includes(':') && !proxy.includes('=')) {
      return `http://${proxy}`;
    }
  } catch {
    // 忽略注册表读取错误
  }
  return undefined;
}

function getMacProxy(): string | undefined {
  const interfaces = ['Wi-Fi', 'Ethernet', 'USB 10/100/1000 LAN'];
  for (const iface of interfaces) {
    try {
      const output = execSync(`networksetup -getwebproxy "${iface}"`, { encoding: 'utf-8' });
      const enabledMatch = output.match(/Enabled:\s*Yes/);
      if (!enabledMatch) {
        continue;
      }
      const serverMatch = output.match(/Server:\s*(\S+)/);
      const portMatch = output.match(/Port:\s*(\d+)/);
      if (serverMatch && portMatch) {
        return `http://${serverMatch[1]}:${portMatch[1]}`;
      }
    } catch {
      // 尝试下一个接口
    }
  }
  return undefined;
}

function getProxyUrl(): string | undefined {
  const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
    || process.env.https_proxy || process.env.http_proxy;
  if (envProxy) {
    return envProxy;
  }

  if (process.platform === 'win32') {
    return getWindowsProxy();
  }

  if (process.platform === 'darwin') {
    return getMacProxy();
  }

  return undefined;
}

function createProxyAgent(): ProxyAgent | undefined {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return undefined;
  }
  try {
    return new ProxyAgent(proxyUrl);
  } catch {
    return undefined;
  }
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string | null;
  published_at: string | null;
  assets: Array<{ browser_download_url: string }>;
}

interface UpdateCheckResponse {
  success: boolean;
  data: {
    current_version: string;
    latest_version: string;
    has_update: boolean;
    release_url: string;
    download_url: string;
    release_notes: string | null;
    published_at: string | null;
  } | null;
  message: string;
}

function isGitHubRelease(value: unknown): value is GitHubRelease {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tag_name' in value &&
    typeof (value as Record<string, unknown>).tag_name === 'string'
  );
}

export default async function updateRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/check', async (_request, reply) => {
    try {
      const proxyAgent = createProxyAgent();
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        signal: AbortSignal.timeout(10000),
        ...(proxyAgent ? { dispatcher: proxyAgent } : {}),
      } as RequestInit);
      if (!res.ok) {
        const errorMessage = res.status === 403
          ? 'GitHub API 访问受限，请检查网络连接'
          : `GitHub API 返回错误: ${res.status}`;
        reply.send({ success: false, data: null, message: errorMessage } satisfies UpdateCheckResponse);
        return;
      }

      const rawData: unknown = await res.json();
      if (!isGitHubRelease(rawData)) {
        reply.send({ success: false, data: null, message: 'GitHub API 返回数据格式异常' } satisfies UpdateCheckResponse);
        return;
      }

      const latest = rawData.tag_name;
      const hasUpdate = latest !== CURRENT_VERSION;

      reply.send({
        success: true,
        data: {
          current_version: CURRENT_VERSION,
          latest_version: latest,
          has_update: hasUpdate,
          release_url: rawData.html_url,
          download_url: rawData.assets[0]?.browser_download_url ?? rawData.html_url,
          release_notes: rawData.body,
          published_at: rawData.published_at,
        },
        message: hasUpdate ? 'Update available' : 'You are up to date',
      } satisfies UpdateCheckResponse);
    } catch (error) {
      const errorMessage = error instanceof Error && error.name === 'TimeoutError'
        ? '连接 GitHub 超时，请检查网络连接'
        : '无法连接到 GitHub，请检查网络连接';
      reply.send({ success: false, data: null, message: errorMessage } satisfies UpdateCheckResponse);
    }
  });

  fastify.get('/version', async (_request, reply) => {
    reply.send({ version: CURRENT_VERSION, repository: REPO });
  });
}
