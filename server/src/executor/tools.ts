import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import { grep } from './grep';

export interface ToolContext {
  isPathAllowed: (path: string) => boolean;
  isCommandAllowed: (command: string) => boolean;
  rootDir: string;
}

export function createTools(guardrails: ToolContext, commandTimeout: number) {
  const { isPathAllowed, isCommandAllowed, rootDir } = guardrails;

  function wrapPath(path: string): string {
    const fullPath = resolve(rootDir, path);
    if (!isPathAllowed(fullPath)) {
      throw new Error(`Path not allowed: ${path} (outside working directory)`);
    }
    return fullPath;
  }

  return {
    read_file: async ({ path, offset, limit }: { path: string; offset?: number; limit?: number }) => {
      const fullPath = wrapPath(path);
      if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
      let content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const start = offset ? offset - 1 : 0;
      const end = limit ? start + limit : lines.length;
      const slice = lines.slice(start, end);
      return slice.join('\n') + (end < lines.length ? '\n... (truncated)' : '');
    },

    write_file: async ({ path, content }: { path: string; content: string }) => {
      const fullPath = wrapPath(path);
      const dir = fullPath.split('/').slice(0, -1).join('/');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(fullPath, content, 'utf-8');
      return `Wrote ${path} (${content.length} bytes)`;
    },

    edit_file: async ({ path, old_string, new_string }: { path: string; old_string: string; new_string: string }) => {
      const fullPath = wrapPath(path);
      if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
      let content = readFileSync(fullPath, 'utf-8');
      if (!content.includes(old_string)) {
        throw new Error(`old_string not found in ${path}`);
      }
      const newContent = content.replace(old_string, new_string);
      writeFileSync(fullPath, newContent, 'utf-8');
      return `Edited ${path} — replaced "${old_string.substring(0, 30)}..."`;
    },

    run_command: async ({ command, workdir, timeout }: { command: string; workdir?: string; timeout?: number }) => {
      if (!isCommandAllowed(command)) {
        throw new Error(`Command not allowed: ${command}`);
      }
      const cwd = workdir ? resolve(rootDir, workdir) : rootDir;
      const t = timeout || commandTimeout;
      try {
        const stdout = execSync(command, { cwd, timeout: t, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        const lines = stdout.split('\n');
        if (lines.length > 10000) {
          return lines.slice(0, 10000).join('\n') + '\n... (truncated, 10000 lines max)';
        }
        return stdout || '(no output)';
      } catch (e: any) {
        if (e.stdout) return e.stdout + '\n' + (e.stderr || '');
        throw new Error(e.stderr || e.message);
      }
    },

    search_files: async ({ pattern, path }: { pattern: string; path?: string }) => {
      const searchPath = path ? resolve(rootDir, path) : rootDir;
      if (!isPathAllowed(searchPath)) throw new Error(`Path not allowed: ${path}`);
      const results = globSync(pattern, { cwd: searchPath, nodir: true });
      return results.length ? results.join('\n') : 'No files found';
    },

    search_content: async ({ pattern, include, path }: { pattern: string; include?: string; path?: string }) => {
      const searchPath = path ? resolve(rootDir, path) : rootDir;
      if (!isPathAllowed(searchPath)) throw new Error(`Path not allowed: ${path}`);
      return grep({ pattern, include, path: searchPath });
    },

    list_dir: async ({ path }: { path: string }) => {
      const fullPath = wrapPath(path);
      if (!existsSync(fullPath)) throw new Error(`Directory not found: ${path}`);
      const entries = readdirSync(fullPath, { withFileTypes: true });
      return entries.map(e => e.name + (e.isDirectory() ? '/' : '')).join('\n');
    },

    create_dir: async ({ path }: { path: string }) => {
      const fullPath = wrapPath(path);
      mkdirSync(fullPath, { recursive: true });
      return `Created directory: ${path}`;
    },

    delete_file: async ({ path }: { path: string }) => {
      const fullPath = wrapPath(path);
      if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
      unlinkSync(fullPath);
      return `Deleted: ${path}`;
    },

    get_file_info: async ({ path }: { path: string }) => {
      const fullPath = wrapPath(path);
      if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
      const stat = statSync(fullPath);
      return {
        size: stat.size,
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
        is_directory: stat.isDirectory(),
      };
    },
  };
}
