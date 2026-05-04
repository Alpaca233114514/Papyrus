import type { FastifyInstance } from 'fastify';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../../package.json');
const CURRENT_VERSION: string = pkg.version;
const REPO = 'PapyrusOR/Papyrus_Desktop';

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
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        signal: AbortSignal.timeout(10000),
      });
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
