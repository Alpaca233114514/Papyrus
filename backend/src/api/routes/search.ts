import type { FastifyInstance } from 'fastify';
import { loadAllNotes } from '../../db/database.js';
import { loadAllCards } from '../../db/database.js';

export default async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (request, reply) => {
    const { query } = request.query as { query?: string };
    if (!query) {
      reply.send({ success: true, query: '', results: [], total: 0, notes_count: 0, cards_count: 0 });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const notes = loadAllNotes().filter(
      n => n.title.toLowerCase().includes(lowerQuery) ||
           n.content.toLowerCase().includes(lowerQuery) ||
           n.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );

    const cards = loadAllCards().filter(
      c => c.q.toLowerCase().includes(lowerQuery) || c.a.toLowerCase().includes(lowerQuery)
    );

    const results = [
      ...notes.map(n => ({
        id: n.id,
        type: 'note' as const,
        title: n.title,
        preview: n.preview,
        folder: n.folder,
        tags: n.tags,
        matched_field: n.title.toLowerCase().includes(lowerQuery) ? 'title' : 'content',
        updated_at: n.updated_at,
      })),
      ...cards.map(c => ({
        id: c.id,
        type: 'card' as const,
        title: c.q,
        preview: c.a,
        folder: '',
        tags: c.tags,
        matched_field: c.q.toLowerCase().includes(lowerQuery) ? 'question' : 'answer',
        updated_at: 0,
      })),
    ];

    reply.send({
      success: true,
      query,
      results,
      total: results.length,
      notes_count: notes.length,
      cards_count: cards.length,
    });
  });
}
