import type { FastifyInstance } from 'fastify';

const CURRENT_VERSION = 'v2.0.0-beta.2';
const REPO = 'Alpaca233114514/Papyrus';

export default async function updateRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/check', async (_request, reply) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
      if (!res.ok) {
        reply.send({ success: false, message: 'Failed to check for updates' });
        return;
      }
      const data = await res.json() as { tag_name: string; html_url: string; assets: Array<{ browser_download_url: string }> };
      const latest = data.tag_name;

      reply.send({
        success: true,
        data: {
          version: latest,
          current: CURRENT_VERSION,
          has_update: latest !== CURRENT_VERSION,
          download_url: data.assets[0]?.browser_download_url ?? data.html_url,
        },
        message: latest !== CURRENT_VERSION ? 'Update available' : 'You are up to date',
      });
    } catch {
      reply.send({ success: false, message: 'Failed to check for updates' });
    }
  });

  fastify.get('/version', async (_request, reply) => {
    reply.send({ version: CURRENT_VERSION, repository: REPO });
  });
}
