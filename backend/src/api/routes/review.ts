import type { FastifyInstance } from 'fastify';
import { getNextDueCard, rateCard } from '../../core/cards.js';
import { recordCardReviewed } from '../../core/progress.js';

export default async function reviewRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/next', async (_request, reply) => {
    const card = getNextDueCard();
    if (!card) {
      reply.send({ success: true, card: null, message: 'No cards due for review' });
      return;
    }
    reply.send({ success: true, card });
  });

  fastify.post('/:cardId/rate', async (request, reply) => {
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
    reply.send({
      success: true,
      card: result.card,
      interval_days: result.intervalDays,
      ef: result.ef,
      next: next ?? null,
    });
  });
}
