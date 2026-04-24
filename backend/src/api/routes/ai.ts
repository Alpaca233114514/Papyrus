import type { FastifyInstance } from 'fastify';

export default async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  // AI Config
  fastify.get('/config/ai', async (_request, reply) => {
    reply.send({ success: true, config: {} });
  });

  fastify.post('/config/ai', async (request, reply) => {
    reply.send({ success: true });
  });

  fastify.post('/config/ai/test', async (_request, reply) => {
    reply.send({ success: true, message: 'Connection test not implemented yet' });
  });

  // Completion
  fastify.get('/completion/config', async (_request, reply) => {
    reply.send({ success: true, config: {} });
  });

  fastify.post('/completion/config', async (request, reply) => {
    reply.send({ success: true });
  });

  fastify.post('/completion', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.raw.write('data: {"text":"AI completion not fully implemented yet","done":true}\n\n');
    reply.raw.end();
  });

  // Tools
  fastify.get('/tools/config', async (_request, reply) => {
    reply.send({ success: true, config: { mode: 'manual', auto_execute_tools: false } });
  });

  fastify.post('/tools/config', async (request, reply) => {
    reply.send({ success: true, config: { mode: 'manual', auto_execute_tools: false } });
  });

  fastify.get('/tools/pending', async (_request, reply) => {
    reply.send({ success: true, calls: [], count: 0 });
  });

  fastify.post('/tools/approve/:callId', async (_request, reply) => {
    reply.send({ success: true });
  });

  fastify.post('/tools/reject/:callId', async (_request, reply) => {
    reply.send({ success: true });
  });

  fastify.get('/tools/calls', async (_request, reply) => {
    reply.send({ success: true, calls: [], count: 0 });
  });

  fastify.post('/tools/parse', async (request, reply) => {
    reply.send({ success: true, reasoning: '', tool_calls: [] });
  });

  fastify.post('/tools/submit', async (_request, reply) => {
    reply.send({ success: true });
  });

  fastify.delete('/tools/history', async (_request, reply) => {
    reply.send({ success: true, cleared_count: 0 });
  });
}
