import type { FastifyInstance } from 'fastify';
import { listFiles, createFolder, saveFile, deleteFileItem, getFileStream, getFileById } from '../../core/files.js';

export default async function filesRoutes(fastify: FastifyInstance): Promise<void> {
  // List all files/folders
  fastify.get('/', async (_request, reply) => {
    try {
      const files = listFiles();
      reply.send({ success: true, files, count: files.length });
    } catch (err) {
      _request.log.error({ err }, 'Failed to load files');
      reply.status(500).send({ success: false, error: 'Failed to load files' });
    }
  });

  // Get single file
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = getFileById(id);
    if (!file) {
      reply.status(404).send({ success: false, error: '文件不存在' });
      return;
    }
    reply.send({ success: true, file });
  });

  // Create folder
  fastify.post('/folder', async (request, reply) => {
    try {
      const body = request.body as { name?: string; parentId?: string };
      if (!body.name || !body.name.trim()) {
        reply.status(400).send({ success: false, error: '文件夹名称不能为空' });
        return;
      }
      const folder = createFolder(body.name, body.parentId);
      reply.send({ success: true, file: folder });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  // Upload file(s) — accepts JSON with base64 content
  fastify.post('/upload', async (request, reply) => {
    try {
      const body = request.body as {
        files: Array<{ name: string; content: string; mimeType?: string }>;
        parentId?: string;
      };

      if (!body.files || body.files.length === 0) {
        reply.status(400).send({ success: false, error: '未提供文件' });
        return;
      }

      const saved: Array<{ id: string; name: string; size: number }> = [];
      const errors: Array<{ name: string; error: string }> = [];
      for (const f of body.files) {
        if (!f.name || !f.content) {
          errors.push({ name: f.name || '(未命名)', error: '缺少名称或内容' });
          continue;
        }
        try {
          const record = saveFile(f.name, f.content, f.mimeType, body.parentId);
          saved.push({ id: record.id, name: record.name, size: record.size });
        } catch (saveErr) {
          const msg = saveErr instanceof Error ? saveErr.message : '保存失败';
          errors.push({ name: f.name, error: msg });
        }
      }

      if (saved.length === 0) {
        reply.status(400).send({ success: false, error: '所有文件均保存失败', errors });
        return;
      }

      reply.send({ success: true, files: saved, count: saved.length, errors: errors.length > 0 ? errors : undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  // Preview file (inline, not attachment)
  fastify.get('/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = getFileStream(id);

    if (!result) {
      reply.status(404).send({ success: false, error: '文件不存在或已被删除' });
      return;
    }

    const { stream, file } = result;
    reply.type(file.mime_type || 'application/octet-stream');
    reply.header('Content-Disposition', 'inline');
    reply.header('Content-Length', file.size);
    reply.send(stream);
  });

  // Download file
  fastify.get('/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = getFileStream(id);

    if (!result) {
      reply.status(404).send({ success: false, error: '文件不存在或已被删除' });
      return;
    }

    const { stream, file } = result;
    reply.type(file.mime_type || 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    reply.header('Content-Length', file.size);
    reply.send(stream);
  });

  // Delete file/folder
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const file = getFileById(id);
      if (!file) {
        reply.status(404).send({ success: false, error: '文件不存在' });
        return;
      }
      const result = deleteFileItem(id);
      reply.send({ success: true, deleted: result.deleted });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });
}
