import Fastify from 'fastify';
import cors from '@fastify/cors';
import { paths } from '../utils/paths.js';
import { PapyrusLogger } from '../utils/logger.js';
import { MCPServer } from '../mcp/server.js';

const logger = new PapyrusLogger(paths.logDir, 'INFO');

const app = Fastify({
  logger: {
    level: 'warn',
  },
});

// Error handler
app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  logger.error(`API Error: ${error.message}`);
  reply.status(error.statusCode ?? 500).send({
    success: false,
    error: error.message,
  });
});

// Not found handler
app.setNotFoundHandler((_request, reply) => {
  reply.status(404).send({ success: false, error: 'Not found' });
});

const PORT = process.env.PAPYRUS_PORT ? parseInt(process.env.PAPYRUS_PORT, 10) : 8000;

export async function initApp(): Promise<void> {
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed'), false);
    },
    credentials: true,
  });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok' }));

  // Register routes
  const { default: cardsRoutes } = await import('./routes/cards.js');
  const { default: reviewRoutes } = await import('./routes/review.js');
  const { default: notesRoutes } = await import('./routes/notes.js');
  const { default: searchRoutes } = await import('./routes/search.js');
  const aiRoutes = (await import('./routes/ai.js')).default ?? (async () => {});
  const { default: dataRoutes } = await import('./routes/data.js');
  const { default: progressRoutes } = await import('./routes/progress.js');
  const { default: logsRoutes } = await import('./routes/logs.js');
  const { default: markdownRoutes } = await import('./routes/markdown.js');
  const { default: providersRoutes } = await import('./routes/providers.js');
  const { default: updateRoutes } = await import('./routes/update.js');
  const { default: mcpRoutes } = await import('./routes/mcp.js');

  app.register(cardsRoutes, { prefix: '/api/cards' });
  app.register(reviewRoutes, { prefix: '/api/review' });
  app.register(notesRoutes, { prefix: '/api/notes' });
  app.register(searchRoutes, { prefix: '/api/search' });
  app.register(aiRoutes, { prefix: '/api' });
  app.register(dataRoutes, { prefix: '/api' });
  app.register(progressRoutes, { prefix: '/api/progress' });
  app.register(logsRoutes, { prefix: '/api/config/logs' });
  app.register(markdownRoutes, { prefix: '/api/markdown' });
  app.register(providersRoutes, { prefix: '/api/providers' });
  app.register(updateRoutes, { prefix: '/api/update' });
  app.register(mcpRoutes, { prefix: '/api/mcp' });
}

let mcpServer: MCPServer | null = null;

export async function start(): Promise<void> {
  await initApp();
  try {
    await app.listen({ port: PORT, host: '127.0.0.1' });
    logger.info(`Papyrus backend started on http://127.0.0.1:${PORT}`);

    mcpServer = new MCPServer({ logger });
    await mcpServer.start();
  } catch (err) {
    logger.error(`Failed to start server: ${err}`);
    throw err;
  }
}

export { app, logger };

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await start();
}
