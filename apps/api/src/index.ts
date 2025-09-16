import Fastify from 'fastify';
import { z } from 'zod';
import { randomPuzzle } from './puzzle';
import { prisma } from './db';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

// GET /puzzle?difficulty=easy|medium|hard|expert
app.get('/puzzle', async (req) => {
  const schema = z.object({ difficulty: z.enum(['easy','medium','hard','expert']).optional() });
  const q = schema.parse(req.query ?? {});
  const { seed, board, solved } = randomPuzzle((q.difficulty ?? 'easy') as any);
  return { seed, board, solved };
});

// POST /leaderboard/submit
app.post('/leaderboard/submit', async (req, res) => {
  const schema = z.object({
    seed: z.string().min(1).max(100),
    difficulty: z.enum(['easy','medium','hard','expert']),
    seconds: z.number().int().min(0).max(24*3600),
    hintsUsed: z.number().int().min(0).max(9),
  });
  const body = schema.parse(req.body);

  const row = await prisma.gameRun.create({ data: body });
  return { ok: true, id: row.id };
});

// GET /leaderboard/:difficulty?limit=10
app.get('/leaderboard/:difficulty', async (req) => {
  const paramsSchema = z.object({ difficulty: z.enum(['easy','medium','hard','expert']) });
  const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });
  const params = paramsSchema.parse((req as any).params);
  const q = querySchema.parse((req as any).query);

  const rows = await prisma.gameRun.findMany({
    where: { difficulty: params.difficulty },
    orderBy: [
      { seconds: 'asc' },
      { hintsUsed: 'asc' },
      { createdAt: 'asc' },
    ],
    take: q.limit ?? 10,
  });

  return { entries: rows };
});

const PORT = 3001;
app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`API up on http://localhost:${PORT}`))
  .catch(err => { app.log.error(err); process.exit(1); });
