import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
    include: { employee: true },
  });
  res.json(notes);
});

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { title, content, employeeId } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  const note = await prisma.note.create({
    data: { title, content, employeeId },
    include: { employee: true },
  });
  res.json(note);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  await prisma.note.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export { router as notesRouter };
