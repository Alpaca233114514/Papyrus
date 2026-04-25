import type { FastifyInstance } from 'fastify';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
});

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'ftp:']);

md.validateLink = (url: string): boolean => {
  const str = url.trim().toLowerCase();
  return ALLOWED_SCHEMES.has(str);
};

export default async function markdownRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/render', async (request, reply) => {
    const body = request.body as { content?: string };
    if (!body.content) {
      reply.status(400).send({ success: false, error: 'Content is required' });
      return;
    }
    const html = md.render(body.content);
    reply.send({ success: true, html });
  });
}
