import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { paths } from './paths.js';

const TOKEN_FILE = path.join(paths.dataDir, '.api_token');

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

function readTokenFile(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    }
  } catch (e) {
    console.error(`读取认证令牌文件失败: ${e instanceof Error ? e.message : String(e)}`);
  }
  return null;
}

function writeTokenFile(token: string): void {
  try {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    if (process.platform === 'win32') {
      try { fs.chmodSync(TOKEN_FILE, 0o600); } catch { /* Windows may not fully support chmod */ }
    }
  } catch (e) {
    console.error(`写入认证令牌文件失败: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function getOrCreateAuthToken(): string {
  const envToken = process.env.PAPYRUS_AUTH_TOKEN;
  if (envToken && envToken.length >= 32) {
    return envToken;
  }
  const fileToken = readTokenFile();
  if (fileToken && fileToken.length >= 32) {
    return fileToken;
  }
  const newToken = generateToken();
  writeTokenFile(newToken);
  return newToken;
}

export function getAuthToken(): string | null {
  const envToken = process.env.PAPYRUS_AUTH_TOKEN;
  if (envToken && envToken.length >= 32) {
    return envToken;
  }
  return readTokenFile();
}

export function isAuthEnabled(): boolean {
  return !!getAuthToken();
}

export function validateRequestToken(headerToken?: string): boolean {
  const expected = getAuthToken();
  if (!expected) {
    return true;
  }
  if (!headerToken || headerToken.length !== expected.length) {
    return false;
  }
  const bufA = Buffer.from(headerToken, 'utf8');
  const bufB = Buffer.from(expected, 'utf8');
  return timingSafeEqual(bufA, bufB);
}
