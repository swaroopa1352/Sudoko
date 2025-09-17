import type { FastifyInstance } from 'fastify';
import { prisma } from './db';
import { z } from 'zod';
import bcrypt from 'bcrypt';

export async function authRoutes(app: FastifyInstance) {
  const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
  });

  // Register
  app.post('/auth/register', async (req, reply) => {
    const { email, password } = userSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(409).send({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,          // true in production (HTTPS)
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return { ok: true };
  });

  // Login
  app.post('/auth/login', async (req, reply) => {
    const { email, password } = userSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' });
    reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return { ok: true };
  });

  // Logout
  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  // Me
  app.get('/me', { preHandler: [app.authenticate] }, async (req: any) => {
    // req.user is injected by jwtVerify
    return { email: req.user.email };
  });
}
