import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const PORT_RANGE_START = 21000;
const PORT_RANGE_END = 21999;

async function findAvailablePort(prisma: PrismaClient, excludePort?: number): Promise<number> {
  const used = await prisma.employee.findMany({ select: { port: true } });
  const usedPorts = new Set(used.map((e) => e.port));
  if (excludePort) usedPorts.delete(excludePort);
  for (let p = PORT_RANGE_START; p <= PORT_RANGE_END; p++) {
    if (!usedPorts.has(p)) return p;
  }
  throw new Error('No available port');
}

router.get('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(employees);
});

router.get('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

router.post('/', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { name, rank, jobDesc, model, workStart, workEnd } = req.body;
  const port = await findAvailablePort(prisma);
  const employee = await prisma.employee.create({
    data: { name, rank, jobDesc, model, port, workStart, workEnd },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'CRUD', target: employee.id, detail: `Tambah karyawan ${name}` },
  });
  res.json(employee);
});

router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { name, rank, jobDesc, model, workStart, workEnd, positionX, positionY } = req.body;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: { name, rank, jobDesc, model, workStart, workEnd, positionX, positionY },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Edit job', target: employee.id, detail: `Edit karyawan ${name}` },
  });
  res.json(employee);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!emp) return res.status(404).json({ error: 'Not found' });
  await prisma.employee.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'CRUD', target: emp.id, detail: `Hapus karyawan ${emp.name}` },
  });
  res.json({ success: true });
});

router.post('/:id/turn-on', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  if (employee.status === 'online') return res.json(employee);

  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { status: 'online' },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Turn ON/OFF', target: employee.id, detail: `${employee.name} → ON` },
  });
  res.json(updated);
});

router.post('/:id/turn-off', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  if (employee.status === 'offline') return res.json(employee);

  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { status: 'offline' },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'Turn ON/OFF', target: employee.id, detail: `${employee.name} → OFF` },
  });
  res.json(updated);
});

export { router as employeesRouter };
