import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const router = Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employeeId = req.params.id;

  const files = await prisma.file.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });

  const workDir = path.join(process.env.HOME || '/tmp', '.opencode', employeeId);
  let fsFiles: string[] = [];
  try {
    fsFiles = await walkDir(workDir);
  } catch {
  }

  res.json({ db: files, filesystem: fsFiles });
});

router.get('/read', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employeeId = req.params.id;
  const { filepath } = req.query;

  if (filepath) {
    const fullPath = path.join(process.env.HOME || '/tmp', '.opencode', employeeId, String(filepath));
    try {
      await fs.access(fullPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return res.json({ path: fullPath, content });
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
  }

  const { id } = req.query;
  if (id) {
    const file = await prisma.file.findUnique({ where: { id: String(id) } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    return res.json(file);
  }

  res.status(400).json({ error: 'filepath or id query param required' });
});

async function walkDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await walkDir(fullPath);
        files.push(...sub);
      } else {
        files.push(fullPath);
      }
    }
  } catch {
  }
  return files;
}

export { router as filesRouter };
