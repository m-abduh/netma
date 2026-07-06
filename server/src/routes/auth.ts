import { Router, Request, Response } from 'express';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const validEmail = process.env.AUTH_EMAIL;
  const validPass = process.env.AUTH_PASSWORD;

  if (!validEmail || !validPass) {
    return res.status(500).json({ success: false, message: 'Auth not configured on server' });
  }

  if (email === validEmail && password === validPass) {
    return res.json({ success: true, email });
  }

  return res.status(401).json({ success: false, message: 'Email atau password salah' });
});

export { router as authRouter };
