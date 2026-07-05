import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { date, actor, action, page = '1', limit = '50' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where: any = {};

  if (date) {
    const start = new Date(String(date));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }
  if (actor) where.actor = String(actor);
  if (action) where.action = String(action);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, page: Number(page), limit: Number(limit) });
});

export { router as logsRouter };
