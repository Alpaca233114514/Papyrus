import type { FastifyInstance } from 'fastify';
import { getAllNotes, createNote, updateNote, deleteNote, deleteNotes, getNoteById } from '../../core/notes.js';
import { importObsidianVault } from '../../core/notes.js';
import { recordNoteCreated } from '../../core/progress.js';

export default async function notesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (_request, reply) => {
    const notes = getAllNotes();
    reply.send({ success: true, notes, count: notes.length });
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as { title: string; folder?: string; content?: string; tags?: string[] };
    if (!body.title) {
      reply.status(400).send({ success: false, error: 'Title is required' });
      return;
    }
    const note = createNote(body.title, body.content ?? '', body.folder, body.tags ?? []);
    recordNoteCreated();
    reply.send({ success: true, note });
  });

  fastify.get('/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const note = getNoteById(noteId);
    if (!note) {
      reply.status(404).send({ success: false, error: 'Note not found' });
      return;
    }
    reply.send({ success: true, note });
  });

  fastify.patch('/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const body = request.body as { title?: string; folder?: string; content?: string; tags?: string[] };
    const note = updateNote(noteId, body);
    if (!note) {
      reply.status(404).send({ success: false, error: 'Note not found' });
      return;
    }
    reply.send({ success: true, note });
  });

  fastify.delete('/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const success = deleteNote(noteId);
    if (!success) {
      reply.status(404).send({ success: false, error: 'Note not found' });
      return;
    }
    reply.send({ success: true });
  });

  fastify.post('/batch-delete', async (request, reply) => {
    const body = request.body as { ids?: string[] };
    if (!body.ids || body.ids.length === 0) {
      reply.status(400).send({ success: false, error: 'ids is required' });
      return;
    }
    const deleted = deleteNotes(body.ids);
    reply.send({ success: true, deleted });
  });

  fastify.post('/import/obsidian', async (request, reply) => {
    const body = request.body as { vault_path?: string; exclude_folders?: string[] };
    if (!body.vault_path) {
      reply.status(400).send({ success: false, error: 'vault_path is required' });
      return;
    }
    try {
      const result = importObsidianVault(body.vault_path, body.exclude_folders);
      if (result.error) {
        reply.status(400).send({ success: false, error: result.error, imported: 0, errors: 0 });
        return;
      }
      reply.send({ success: true, imported: result.imported, skipped: 0, errors: result.errors });
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入过程中发生未知错误';
      reply.status(500).send({ success: false, error: message });
    }
  });
}
