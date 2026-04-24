import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../../utils/paths.js';
import { loadAllCards, saveAllCards, insertCard } from '../../db/database.js';
import { loadAllNotes, saveAllNotes, insertNote } from '../../db/database.js';

export default async function dataRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/backup', async (_request, reply) => {
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const backupPath = path.join(paths.backupDir, `papyrus_backup_${timestamp}.db`);
    fs.mkdirSync(paths.backupDir, { recursive: true });
    fs.copyFileSync(paths.dbFile, backupPath);
    reply.send({ success: true, path: backupPath });
  });

  fastify.get('/export', async (_request, reply) => {
    const cards = loadAllCards();
    const notes = loadAllNotes();
    reply.send({
      success: true,
      cards,
      notes,
      config: {},
    });
  });

  fastify.post('/import', async (request, reply) => {
    const body = request.body as { cards?: unknown[]; notes?: unknown[] };
    let imported = 0;

    if (body.cards && Array.isArray(body.cards)) {
      for (const c of body.cards) {
        if (c && typeof c === 'object') {
          const card = c as Record<string, unknown>;
          insertCard({
            id: String(card.id || Date.now()),
            q: String(card.q || card.question || ''),
            a: String(card.a || card.answer || ''),
            next_review: Number(card.next_review || 0),
            interval: Number(card.interval || 0),
            ef: Number(card.ef || 2.5),
            repetitions: Number(card.repetitions || 0),
            tags: Array.isArray(card.tags) ? card.tags.map(String) : [],
          });
          imported++;
        }
      }
    }

    if (body.notes && Array.isArray(body.notes)) {
      for (const n of body.notes) {
        if (n && typeof n === 'object') {
          const note = n as Record<string, unknown>;
          insertNote({
            id: String(note.id || Date.now()),
            title: String(note.title || ''),
            folder: String(note.folder || '默认'),
            content: String(note.content || ''),
            preview: String(note.preview || ''),
            tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
            created_at: Number(note.created_at || 0),
            updated_at: Number(note.updated_at || 0),
            word_count: Number(note.word_count || 0),
            hash: String(note.hash || ''),
            headings: Array.isArray(note.headings) ? note.headings as Array<{ level: number; text: string }> : [],
            outgoing_links: Array.isArray(note.outgoing_links) ? note.outgoing_links.map(String) : [],
            incoming_count: Number(note.incoming_count || 0),
          });
          imported++;
        }
      }
    }

    reply.send({ success: true, imported });
  });
}
