import type { FastifyInstance } from 'fastify';
import {
  loadAllProviders,
  saveProvider,
  deleteProvider,
  setDefaultProvider,
  updateProviderEnabled,
  saveApiKey,
  deleteApiKey,
  saveModel,
  deleteModel,
  runInTransaction,
} from '../../db/database.js';
import { getDb } from '../../db/database.js';
import type { Provider } from '../../core/types.js';

export default async function providersRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (request, reply) => {
    try {
      const providers = loadAllProviders();
      reply.send({ success: true, providers });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as Partial<Provider>;
    try {
      const id = runInTransaction(() => {
        const providerId = saveProvider(body);

        if (body.apiKeys) {
          for (const key of body.apiKeys) {
            saveApiKey(providerId, key);
          }
        }
        if (body.models) {
          for (const model of body.models) {
            saveModel(providerId, model);
          }
        }

        return providerId;
      });

      reply.send({ success: true, provider: { ...body, id }, message: 'Provider created' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        reply.status(409).send({ success: false, error: '相同配置的服务商已存在' });
        return;
      }
      reply.status(500).send({ success: false, error: `添加供应商失败: ${msg}` });
    }
  });

  fastify.put('/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as Partial<Provider>;
    try {
      runInTransaction(() => {
        saveProvider({ ...body, id: providerId });

        const incomingKeyIds = new Set(body.apiKeys?.map(k => k.id).filter(Boolean) ?? []);
        if (body.apiKeys) {
          for (const key of body.apiKeys) {
            const savedKeyId = saveApiKey(providerId, key);
            incomingKeyIds.add(savedKeyId);
          }
        }
        const db = getDb();
        const allKeys = db.prepare('SELECT id FROM api_keys WHERE provider_id = ?').all(providerId) as { id: string }[];
        for (const row of allKeys) {
          if (!incomingKeyIds.has(row.id)) {
            deleteApiKey(row.id);
          }
        }
      });
      reply.send({ success: true, message: 'Provider updated' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        reply.status(409).send({ success: false, error: '相同配置的服务商已存在' });
        return;
      }
      reply.status(500).send({ success: false, error: `更新供应商失败: ${msg}` });
    }
  });

  fastify.delete('/:providerId', async (request, reply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const success = deleteProvider(providerId);
      if (!success) {
        reply.status(404).send({ success: false, error: 'Provider not found' });
        return;
      }
      reply.send({ success: true, message: 'Provider deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/:providerId/default', async (request, reply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      setDefaultProvider(providerId);
      reply.send({ success: true, message: 'Default provider set' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/:providerId/enabled', async (request, reply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const body = request.body as { enabled?: boolean };
      updateProviderEnabled(providerId, body.enabled ?? false);
      reply.send({ success: true, message: 'Provider enabled status updated' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/:providerId/models', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as { name: string; modelId: string; port?: string; capabilities?: string[]; apiKeyId?: string; enabled?: boolean };
    try {
      const modelId = saveModel(providerId, body);
      reply.send({ success: true, modelId, message: 'Model added' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        reply.status(409).send({ success: false, error: '该模型已存在于当前供应商' });
        return;
      }
      if (msg.includes('FOREIGN KEY')) {
        reply.status(400).send({ success: false, error: `添加模型失败:外键约束失败,apiKeyId 或 providerId 不存在 (${msg})` });
        return;
      }
      reply.status(500).send({ success: false, error: `添加模型失败: ${msg}` });
    }
  });

  fastify.put('/:providerId/models/:modelId', async (request, reply) => {
    const { providerId, modelId } = request.params as { providerId: string; modelId: string };
    const body = request.body as { name?: string; modelId?: string; port?: string; capabilities?: string[]; apiKeyId?: string; enabled?: boolean };
    try {
      saveModel(providerId, { ...body, id: modelId });
      reply.send({ success: true, message: 'Model updated' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('FOREIGN KEY')) {
        reply.status(400).send({ success: false, error: `更新模型失败:外键约束失败,apiKeyId 或 providerId 不存在 (${msg})` });
        return;
      }
      reply.status(500).send({ success: false, error: `更新模型失败: ${msg}` });
    }
  });

  fastify.delete('/:providerId/models/:modelId', async (request, reply) => {
    try {
      const { modelId } = request.params as { modelId: string };
      const deleted = deleteModel(modelId);
      if (!deleted) {
        reply.status(404).send({ success: false, error: 'Model not found' });
        return;
      }
      reply.send({ success: true, message: 'Model deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.post('/:providerId/apikeys', async (request, reply) => {
    try {
      const { providerId } = request.params as { providerId: string };
      const body = request.body as { id?: string; name: string; key: string };
      const keyId = saveApiKey(providerId, body);
      reply.send({ success: true, keyId, message: 'API key added' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });

  fastify.delete('/:providerId/apikeys/:keyId', async (request, reply) => {
    try {
      const { keyId } = request.params as { keyId: string };
      deleteApiKey(keyId);
      reply.send({ success: true, message: 'API key deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '服务器内部错误';
      request.log.error({ err }, message);
      reply.status(500).send({ success: false, error: message });
    }
  });
}
