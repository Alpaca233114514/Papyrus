import type { FastifyInstance } from 'fastify';
import { loadAllNotes, getNoteById, insertNote, updateNote, deleteNoteById } from '../../db/database.js';
import type { Note } from '../../core/types.js';
import { logger } from '../server.js';

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
  fastify.get('/health', async (_request, reply) => {
    reply.send({ status: 'ok', service: 'mcp' });
  });

  fastify.get('/notes', async (_request, reply) => {
    const notes = loadAllNotes(logger);
    reply.send({
      success: true,
      notes: notes.map(noteToInfo),
      total: notes.length,
    });
  });

  fastify.get('/notes/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const note = getNoteById(noteId);
    if (!note) {
      reply.status(404).send({ success: false, note: null, error: 'note not found' });
      return;
    }
    reply.send({ success: true, note: noteToDetail(note) });
  });

  fastify.post('/notes', async (request, reply) => {
    const payload = request.body as {
      title: string;
      folder?: string;
      content?: string;
      tags?: string[];
    };

    const now = Date.now() / 1000;
    const note: Note = {
      id: String(Date.now()),
      title: payload.title,
      folder: payload.folder ?? '默认',
      content: payload.content ?? '',
      preview: (payload.content ?? '').slice(0, 200),
      tags: payload.tags ?? [],
      created_at: now,
      updated_at: now,
      word_count: (payload.content ?? '').split(/\s+/).filter(Boolean).length,
      hash: '',
      headings: [],
      outgoing_links: [],
      incoming_count: 0,
    };

    insertNote(note, logger);
    reply.send({ success: true, note: noteToDetail(note) });
  });

  fastify.patch('/notes/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const payload = request.body as Partial<Pick<Note, 'title' | 'folder' | 'content' | 'tags'>>;

    const note = getNoteById(noteId);
    if (!note) {
      reply.status(404).send({ success: false, note: null, error: 'note not found' });
      return;
    }

    if (payload.title !== undefined) note.title = payload.title;
    if (payload.folder !== undefined) note.folder = payload.folder;
    if (payload.content !== undefined) {
      note.content = payload.content;
      note.preview = payload.content.slice(0, 200);
      note.word_count = payload.content.split(/\s+/).filter(Boolean).length;
    }
    if (payload.tags !== undefined) note.tags = payload.tags;
    note.updated_at = Date.now() / 1000;

    updateNote(note, logger);
    reply.send({ success: true, note: noteToDetail(note) });
  });

  fastify.delete('/notes/:noteId', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const ok = deleteNoteById(noteId, logger);
    if (!ok) {
      reply.status(404).send({ success: false, error: 'note not found' });
      return;
    }
    reply.send({ success: true });
  });

  fastify.post('/notes/search', async (request, reply) => {
    const payload = request.body as {
      query: string;
      limit?: number;
      search_content?: boolean;
    };

    const notes = loadAllNotes(logger);
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
  });

  fastify.post('/vault/index', async (_request, reply) => {
    const notes = loadAllNotes(logger);
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
  });

  fastify.post('/vault/read', async (request, reply) => {
    const payload = request.body as { ids: string[]; format?: string; include_links?: boolean };
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
  });
}
