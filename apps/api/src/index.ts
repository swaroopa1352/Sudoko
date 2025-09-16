import Fastify from 'fastify';
import { z } from 'zod';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

// Minimal puzzle endpoint (placeholder board)
app.get('/puzzle', async () => {
  return { seed: 'demo', board: '0'.repeat(81) };
});


const PORT = 3001;
app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API up on http://localhost:${PORT}`))
  .catch(err => {
    app.log.error(err);
    process.exit(1);
  });
