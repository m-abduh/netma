import fs from 'fs';
import path from 'path';

export const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || 'netma-secret';

const CONFIG_PATH = path.join(__dirname, '../project-dir.json');

export function getProjectDir(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const dir = path.resolve(cfg.path || path.join(process.env.HOME || '/tmp', 'netma-workspace'));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const dir = path.join(process.env.HOME || '/tmp', 'netma-workspace');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}
