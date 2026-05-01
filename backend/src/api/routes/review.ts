import type { FastifyInstance } from 'fastify';
import { getNextDueCard, rateCard, getCardStats } from '../../core/cards.js';
import { recordCardReviewed } from '../../core/progress.js';

export default async function reviewRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/next', async (request, reply) => {
    try {
      const card = getNextDueCard();
      const stats = getCardStats();
      if (!card) {
        reply.send({
          success: true,
          card: null,
          due_count: stats.due,
          total_count: stats.total,
          message: 'No cards due for review',
        });
        return;
      }
      reply.send({
        success: true,
        card,
        due_count: stats.due,
        total_count: stats.total,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/:cardId/rate', async (request, reply) => {
    try {
      const { cardId } = request.params as { cardId: string };
      const body = request.body as { grade?: number };
      const grade = body.grade;

      if (grade !== 1 && grade !== 2 && grade !== 3) {
        reply.status(400).send({ success: false, error: 'Grade must be 1, 2, or 3' });
        return;
      }

      const result = await rateCard(cardId, grade);
      if (!result) {
        reply.status(404).send({ success: false, error: 'Card not found' });
        return;
      }
      recordCardReviewed();

      const next = getNextDueCard();
      const stats = getCardStats();
      reply.send({
        success: true,
        card: result.card,
        interval_days: result.intervalDays,
        ef: result.ef,
        next: next ? {
          success: true,
          card: next,
          due_count: stats.due,
          total_count: stats.total,
        } : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });
}
