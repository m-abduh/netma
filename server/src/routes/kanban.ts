import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.get('/columns', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const columns = await prisma.kanbanColumn.findMany({
    orderBy: { order: 'asc' },
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: { employee: true },
      },
    },
  });
  res.json(columns);
});

router.post('/columns', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { title } = req.body;
  const maxOrder = await prisma.kanbanColumn.aggregate({ _max: { order: true } });
  const column = await prisma.kanbanColumn.create({
    data: { title, order: (maxOrder._max.order ?? -1) + 1 },
  });
  res.json(column);
});

router.put('/columns/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { title, order } = req.body;
  const column = await prisma.kanbanColumn.update({
    where: { id: req.params.id },
    data: { title, order },
  });
  res.json(column);
});

router.delete('/columns/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.kanbanColumn.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.get('/tasks', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const tasks = await prisma.kanbanTask.findMany({
    orderBy: { order: 'asc' },
    include: { employee: true, column: true },
  });
  res.json(tasks);
});

router.post('/tasks', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { columnId, employeeId, title, description, priority, deadline, source } = req.body;

  const maxOrder = await prisma.kanbanTask.aggregate({
    _max: { order: true },
    where: { columnId },
  });

  const task = await prisma.kanbanTask.create({
    data: {
      columnId,
      employeeId,
      title,
      description,
      priority,
      deadline: deadline ? new Date(deadline) : undefined,
      source: source || 'manual',
      order: (maxOrder._max.order ?? -1) + 1,
    },
    include: { employee: true, column: true },
  });
  res.json(task);
});

router.put('/tasks/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { columnId, employeeId, title, description, priority, deadline, order } = req.body;
  const task = await prisma.kanbanTask.update({
    where: { id: req.params.id },
    data: {
      columnId,
      employeeId,
      title,
      description,
      priority,
      deadline: deadline ? new Date(deadline) : undefined,
      order,
    },
    include: { employee: true, column: true },
  });
  res.json(task);
});

router.delete('/tasks/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.kanbanTask.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export { router as kanbanRouter };
