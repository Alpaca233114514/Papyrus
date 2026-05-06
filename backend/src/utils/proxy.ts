import { execSync } from 'node:child_process';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

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

export function getProxyUrl(): string | undefined {
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

export function createProxyAgent(): ProxyAgent | undefined {
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

export function isProxyConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Runtime-safe: undici wraps socket-level errors in `cause.code`
  const causeCode = (error as unknown as { cause?: { code?: string } }).cause?.code;
  return (
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ETIMEDOUT' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'ECONNABORTED' ||
    causeCode === 'EHOSTUNREACH' ||
    causeCode === 'ENETUNREACH'
  );
}

export async function fetchWithProxy(url: string, init?: RequestInit): Promise<Response> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return global.fetch(url, init);
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (!hostname.endsWith('github.com') && !hostname.endsWith('githubusercontent.com')) {
      return global.fetch(url, init);
    }
  } catch {
    return global.fetch(url, init);
  }

  const proxyAgent = createProxyAgent();
  if (!proxyAgent) {
    return global.fetch(url, init);
  }

  try {
    return await undiciFetch(
      url,
      { ...init, dispatcher: proxyAgent } as unknown as Parameters<typeof undiciFetch>[1],
    );
  } catch (error) {
    if (!isProxyConnectionError(error)) {
      throw error;
    }
    try {
      return await global.fetch(url, init);
    } catch (directError) {
      const reason = directError instanceof Error ? directError.message : String(directError);
      throw new Error(`通过代理 ${proxyUrl} 连接失败，已尝试直连仍失败：${reason}`);
    }
  }
}
