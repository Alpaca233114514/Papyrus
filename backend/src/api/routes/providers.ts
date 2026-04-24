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
} from '../../db/database.js';
import type { Provider } from '../../core/types.js';

export default async function providersRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async (_request, reply) => {
    const providers = loadAllProviders();
    reply.send({ success: true, providers });
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as Partial<Provider>;
    const id = saveProvider(body);

    if (body.apiKeys) {
      for (const key of body.apiKeys) {
        saveApiKey(id, key);
      }
    }
    if (body.models) {
      for (const model of body.models) {
        saveModel(id, model);
      }
    }

    reply.send({ success: true, provider: { ...body, id }, message: 'Provider created' });
  });

  fastify.put('/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as Partial<Provider>;
    saveProvider({ ...body, id: providerId });
    reply.send({ success: true, message: 'Provider updated' });
  });

  fastify.delete('/:providerId', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const success = deleteProvider(providerId);
    if (!success) {
      reply.status(404).send({ success: false, error: 'Provider not found' });
      return;
    }
    reply.send({ success: true, message: 'Provider deleted' });
  });

  fastify.post('/:providerId/default', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    setDefaultProvider(providerId);
    reply.send({ success: true, message: 'Default provider set' });
  });

  fastify.post('/:providerId/enabled', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as { enabled?: boolean };
    updateProviderEnabled(providerId, body.enabled ?? false);
    reply.send({ success: true, message: 'Provider enabled status updated' });
  });

  fastify.post('/:providerId/models', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as { name: string; modelId: string; port?: string; capabilities?: string[]; apiKeyId?: string; enabled?: boolean };
    const modelId = saveModel(providerId, body);
    reply.send({ success: true, modelId, message: 'Model added' });
  });

  fastify.put('/:providerId/models/:modelId', async (request, reply) => {
    const { providerId, modelId } = request.params as { providerId: string; modelId: string };
    const body = request.body as { name?: string; modelId?: string; port?: string; capabilities?: string[]; apiKeyId?: string; enabled?: boolean };
    saveModel(providerId, { ...body, id: modelId });
    reply.send({ success: true, message: 'Model updated' });
  });

  fastify.delete('/:providerId/models/:modelId', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    deleteModel(modelId);
    reply.send({ success: true, message: 'Model deleted' });
  });

  fastify.post('/:providerId/apikeys', async (request, reply) => {
    const { providerId } = request.params as { providerId: string };
    const body = request.body as { id?: string; name: string; key: string };
    const keyId = saveApiKey(providerId, body);
    reply.send({ success: true, keyId, message: 'API key added' });
  });

  fastify.delete('/:providerId/apikeys/:keyId', async (request, reply) => {
    const { keyId } = request.params as { keyId: string };
    deleteApiKey(keyId);
    reply.send({ success: true, message: 'API key deleted' });
  });
}
