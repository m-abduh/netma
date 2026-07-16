import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

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
  const { name, rank, jobDesc, model, supervisorId } = req.body;
  if (supervisorId) {
    const sup = await prisma.employee.findUnique({ where: { id: supervisorId } });
    if (!sup) return res.status(400).json({ error: 'Supervisor not found' });
  }
  const employee = await prisma.employee.create({
    data: { name, rank, jobDesc, model, supervisorId: supervisorId || null },
  });
  await prisma.auditLog.create({
    data: { actor: 'Bos', action: 'CRUD', target: employee.id, detail: `Tambah karyawan ${name}` },
  });
  res.json(employee);
});

router.put('/:id', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { name, rank, jobDesc, model, positionX, positionY, supervisorId } = req.body;
  if (supervisorId === req.params.id) return res.status(400).json({ error: 'Cannot be own supervisor' });
  if (supervisorId) {
    const sup = await prisma.employee.findUnique({ where: { id: supervisorId } });
    if (!sup) return res.status(400).json({ error: 'Supervisor not found' });
  }
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (rank !== undefined) data.rank = rank;
  if (jobDesc !== undefined) data.jobDesc = jobDesc;
  if (model !== undefined) data.model = model;
  if (positionX !== undefined) data.positionX = positionX;
  if (positionY !== undefined) data.positionY = positionY;
  if (supervisorId !== undefined) data.supervisorId = supervisorId || null;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data,
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

  try {
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { status: 'online' },
    });
    await prisma.auditLog.create({
      data: { actor: 'Bos', action: 'Turn ON/OFF', target: employee.id, detail: `${employee.name} → ON` },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to turn on: ${err.message}` });
  }
});

router.post('/:id/turn-off', async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ error: 'Not found' });

  try {
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { status: 'offline' },
    });
    await prisma.auditLog.create({
      data: { actor: 'Bos', action: 'Turn ON/OFF', target: employee.id, detail: `${employee.name} → OFF` },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to turn off: ${err.message}` });
  }
});

export { router as employeesRouter };
