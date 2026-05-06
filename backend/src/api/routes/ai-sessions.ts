import type { FastifyInstance } from 'fastify';
import { aiManager } from './ai-chat.js';

export default async function aiSessionsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/sessions', async (_request, reply) => {
    reply.send({
      success: true,
      sessions: aiManager.listSessions(),
      activeSessionId: aiManager.getActiveSessionId(),
    });
  });

  fastify.post('/sessions', async (request, reply) => {
    const payload = (request.body ?? {}) as { title?: string };
    const session = aiManager.createSession(payload.title, true);
    reply.send({
      success: true,
      session,
      activeSessionId: session.id,
    });
  });

  fastify.delete('/sessions', async (_request, reply) => {
    const result = aiManager.clearAllSessions();
    reply.send({
      success: true,
      deletedCount: result.deletedCount,
      activeSessionId: result.activeSessionId,
    });
  });

  fastify.post('/sessions/:sessionId/switch', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      aiManager.switchSession(sessionId);
      reply.send({
        success: true,
        activeSessionId: sessionId,
      });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.patch('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const payload = (request.body ?? {}) as { title?: string };
    if (typeof payload.title !== 'string') {
      reply.status(400).send({ success: false, error: 'title 字段必须为字符串' });
      return;
    }
    try {
      const session = aiManager.renameSession(sessionId, payload.title);
      reply.send({ success: true, session });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.delete('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const result = aiManager.deleteSession(sessionId);
      reply.send({
        success: true,
        activeSessionId: result.activeSessionId,
      });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  fastify.get('/sessions/:sessionId/messages', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = aiManager.getSession(sessionId);
    if (!session) {
      reply.status(404).send({ success: false, error: '会话不存在' });
      return;
    }
    const messages = aiManager.listMessages(sessionId);
    reply.send({
      success: true,
      session,
      messages,
    });
  });
}