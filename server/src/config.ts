import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '../project-dir.json');

function expandTilde(p: string): string {
  return p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p;
}

export function getProjectDir(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    const dir = path.resolve(expandTilde(cfg.path || path.join(os.homedir(), 'netma-workspace')));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    const dir = path.join(os.homedir(), 'netma-workspace');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}
