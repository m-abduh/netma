import { Router, Request, Response } from 'express';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const validUser = process.env.AUTH_USERNAME;
  const validPass = process.env.AUTH_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(500).json({ success: false, message: 'Auth not configured on server' });
  }

  if (username === validUser && password === validPass) {
    return res.json({ success: true, username });
  }

  return res.status(401).json({ success: false, message: 'Username atau password salah' });
});

export { router as authRouter };
