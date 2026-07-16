import { resolve, relative } from 'path';

export function createGuardrails(workdir: string) {
  const rootDir = resolve(workdir);

  function isPathAllowed(targetPath: string): boolean {
    const resolved = resolve(rootDir, targetPath);
    const rel = relative(rootDir, resolved);
    return !rel.startsWith('..') && !rel.startsWith('/');
  }

  function isCommandAllowed(command: string): boolean {
    const lower = command.toLowerCase();
    const blacklist = ['sudo', 'su', 'passwd', 'chmod 777', 'curl | bash', '| bash', '| sh'];
    return !blacklist.some(b => lower.includes(b));
  }

  return { isPathAllowed, isCommandAllowed, rootDir };
}
