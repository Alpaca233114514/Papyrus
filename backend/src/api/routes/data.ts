import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { paths } from '../../utils/paths.js';
import {
  loadAllCards, saveAllCards, insertCard, checkpointDb, runInTransaction,
  loadAllNotes, saveAllNotes, insertNote,
} from '../../db/database.js';

function safeNumber(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export default async function dataRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/backup', async (_request, reply) => {
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const uniqueSuffix = `${Date.now() % 1000}`;
    const backupPath = path.join(paths.backupDir, `papyrus_backup_${timestamp}_${uniqueSuffix}.db`);
    fs.mkdirSync(paths.backupDir, { recursive: true });
    checkpointDb();
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

    try {
      runInTransaction(() => {
        if (body.cards && Array.isArray(body.cards)) {
          for (const c of body.cards) {
            if (c && typeof c === 'object') {
              const card = c as Record<string, unknown>;
              insertCard({
                id: String(card.id || uuidv4().replace(/-/g, '')),
                q: String(card.q || card.question || ''),
                a: String(card.a || card.answer || ''),
                next_review: safeNumber(card.next_review, 0),
                interval: safeNumber(card.interval, 0),
                ef: safeNumber(card.ef, 2.5),
                repetitions: safeNumber(card.repetitions, 0),
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
                id: String(note.id || uuidv4().replace(/-/g, '')),
                title: String(note.title || ''),
                folder: String(note.folder || '默认'),
                content: String(note.content || ''),
                preview: String(note.preview || ''),
                tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
                created_at: safeNumber(note.created_at, 0),
                updated_at: safeNumber(note.updated_at, 0),
                word_count: safeNumber(note.word_count, 0),
                hash: String(note.hash || ''),
                headings: Array.isArray(note.headings) ? note.headings as Array<{ level: number; text: string }> : [],
                outgoing_links: Array.isArray(note.outgoing_links) ? note.outgoing_links.map(String) : [],
                incoming_count: safeNumber(note.incoming_count, 0),
              });
              imported++;
            }
          }
        }
      });
    } catch (e) {
      reply.status(400).send({ success: false, error: e instanceof Error ? e.message : String(e) });
      return;
    }

    reply.send({ success: true, imported });
  });
}
