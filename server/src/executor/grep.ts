import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, relative } from 'path';

export function grep({ pattern, include, path }: { pattern: string; include?: string; path: string }): string {
  const results: string[] = [];
  const regex = new RegExp(pattern, 'g');
  const files = walkDir(path, include);

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          const rel = relative(path, file);
          results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
        }
      }
    } catch {}
  }

  return results.length ? results.join('\n') : 'No matches found';
}

function walkDir(dir: string, include?: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...walkDir(fullPath, include));
        }
      } else if (entry.isFile()) {
        if (!include || entry.name.endsWith(include.replace('*', ''))) {
          files.push(fullPath);
        }
      }
    }
  } catch {}
  return files;
}
