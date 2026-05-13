import type { FastifyInstance } from 'fastify';
import { loadAllNotes, getNoteById, deleteNoteById } from '../../db/database.js';
import type { Note } from '../../core/types.js';
import { createNote, updateNote } from '../../core/notes.js';

function noteToInfo(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    title: note.title,
    folder: note.folder,
    preview: note.preview,
    tags: note.tags,
    word_count: note.word_count,
    updated_at: note.updated_at,
  };
}

function noteToDetail(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    title: note.title,
    folder: note.folder,
    content: note.content,
    preview: note.preview,
    tags: note.tags,
    word_count: note.word_count,
    created_at: note.created_at,
    updated_at: note.updated_at,
    headings: note.headings,
    outgoing_links: note.outgoing_links,
    incoming_count: note.incoming_count,
  };
}

export default async function mcpRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (request, reply) => {
    try {
      reply.send({ status: 'ok', service: 'mcp' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.get('/notes', async (request, reply) => {
    try {
      const notes = loadAllNotes();
      reply.send({
        success: true,
        notes: notes.map(noteToInfo),
        total: notes.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.get('/notes/:noteId', async (request, reply) => {
    try {
      const { noteId } = request.params as { noteId: string };
      const note = getNoteById(noteId);
      if (!note) {
        reply.status(404).send({ success: false, note: null, error: 'note not found' });
        return;
      }
      reply.send({ success: true, note: noteToDetail(note) });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/notes', async (request, reply) => {
    try {
      const payload = request.body as {
        title: string;
        folder?: string;
        content?: string;
        tags?: string[];
      };
      if (!payload.title || typeof payload.title !== 'string') {
        reply.status(400).send({ success: false, error: 'title 字段必须为非空字符串' });
        return;
      }

      const note = createNote(payload.title, payload.content ?? '', payload.folder, payload.tags ?? []);
      reply.send({ success: true, note: noteToDetail(note) });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.patch('/notes/:noteId', async (request, reply) => {
    try {
      const { noteId } = request.params as { noteId: string };
      const payload = request.body as Partial<Pick<Note, 'title' | 'folder' | 'content' | 'tags'>>;

      const updated = await updateNote(noteId, payload);
      if (!updated) {
        reply.status(404).send({ success: false, note: null, error: 'note not found' });
        return;
      }

      reply.send({ success: true, note: noteToDetail(updated) });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.delete('/notes/:noteId', async (request, reply) => {
    try {
      const { noteId } = request.params as { noteId: string };
      const ok = deleteNoteById(noteId);
      if (!ok) {
        reply.status(404).send({ success: false, error: 'note not found' });
        return;
      }
      reply.send({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/notes/search', async (request, reply) => {
    try {
      const payload = request.body as {
        query: string;
        limit?: number;
        search_content?: boolean;
      };
      if (!payload.query || typeof payload.query !== 'string') {
        reply.status(400).send({ success: false, error: 'query 字段必须为非空字符串' });
        return;
      }

      const notes = loadAllNotes();
      const query = payload.query.toLowerCase();
      const limit = payload.limit ?? 20;
      const searchContent = payload.search_content ?? true;

      const results: Note[] = [];
      for (const note of notes) {
        if (note.title.toLowerCase().includes(query)) {
          results.push(note);
          continue;
        }
        if (note.tags.some(tag => tag.toLowerCase().includes(query))) {
          results.push(note);
          continue;
        }
        if (searchContent && note.content.toLowerCase().includes(query)) {
          results.push(note);
          continue;
        }
      }

      reply.send({
        success: true,
        notes: results.slice(0, limit).map(noteToInfo),
        total: results.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/vault/index', async (request, reply) => {
    try {
      const notes = loadAllNotes();
      reply.send({
        success: true,
        notes: notes.map(n => ({
          id: n.id,
          title: n.title,
          folder: n.folder,
          preview: n.preview,
          tags: n.tags,
          word_count: n.word_count,
          updated_at: n.updated_at,
          headings: n.headings,
          outgoing_links: n.outgoing_links,
          incoming_count: n.incoming_count,
        })),
        total: notes.length,
        cursor: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/vault/read', async (request, reply) => {
    try {
      const payload = request.body as { ids: string[]; format?: string; include_links?: boolean };
      if (!payload.ids || !Array.isArray(payload.ids)) {
        reply.status(400).send({ success: false, error: 'ids 字段必须为数组' });
        return;
      }
      const notes: Note[] = [];
      for (const id of payload.ids) {
        const note = getNoteById(id);
        if (note) notes.push(note);
      }

      const format = payload.format ?? 'summary';
      const includeLinks = payload.include_links ?? false;

      const results = notes.map(n => {
        if (format === 'summary') {
          return {
            id: n.id,
            title: n.title,
            preview: n.preview,
            tags: n.tags,
            word_count: n.word_count,
          };
        }
        const detail: Record<string, unknown> = noteToDetail(n);
        if (includeLinks) {
          detail.linked_notes = n.outgoing_links.map(linkId => {
            const linked = getNoteById(linkId);
            return linked ? { id: linked.id, title: linked.title } : null;
          }).filter(Boolean);
        }
        return detail;
      });

      reply.send({ success: true, notes: results });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });
}
