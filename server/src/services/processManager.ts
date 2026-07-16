import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getProjectDir } from '../config';

interface ProcessEntry {
  process: ChildProcess;
  port: number;
}

class ProcessManager {
  private processes: Map<number, ProcessEntry> = new Map();

  async start(employee: { id: string; name: string; rank: string; jobDesc: string; model: string; port: number }): Promise<{ pid: number }> {
    try {
      execSync(`fuser -k ${employee.port}/tcp 2>/dev/null`, { stdio: 'ignore' });
    } catch {}

    const configDir = path.join(process.env.HOME || '/tmp', '.opencode', employee.id);
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.join(configDir, 'config.json');
    const config = {
      model: employee.model,
      systemPrompt: `Kamu adalah ${employee.name}, seorang ${employee.rank}. Deskripsi pekerjaan: ${employee.jobDesc}`,
      port: employee.port,
      hostname: '127.0.0.1',
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const projectDir = getProjectDir();
    const proc = spawn('opencode', ['serve', '--port', String(employee.port), '--hostname', '127.0.0.1'], {
      cwd: projectDir,
      env: {
        ...process.env,
        OPENCODE_CONFIG_DIR: configDir,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const entry: ProcessEntry = { process: proc, port: employee.port };
    this.processes.set(employee.port, entry);

    let startReject: ((err: Error) => void) | null = null;

    proc.on('exit', (code) => {
      if (this.processes.get(employee.port) === entry) {
        this.processes.delete(employee.port);
      }
      if (startReject && code !== 0 && code !== null) {
        startReject(new Error(`opencode exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      if (this.processes.get(employee.port) === entry) {
        this.processes.delete(employee.port);
      }
      startReject?.(err);
    });

    await new Promise<void>((resolve, reject) => {
      startReject = reject;
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for opencode to start'));
      }, 30000);

      const poll = () => {
        fetch(`http://127.0.0.1:${employee.port}/`, { signal: AbortSignal.timeout(3000) })
          .then(() => { clearTimeout(timeout); resolve(); })
          .catch(() => { setTimeout(poll, 500); });
      };
      setTimeout(poll, 1000);
    });

    return { pid: proc.pid || 0 };
  }

  stop(port: number): void {
    const entry = this.processes.get(port);
    if (!entry) return;
    try {
      entry.process.kill('SIGTERM');
      setTimeout(() => {
        try { entry.process.kill('SIGKILL'); } catch {}
      }, 5000);
    } catch {}
    this.processes.delete(port);
  }

  isRunning(port: number): boolean {
    const entry = this.processes.get(port);
    if (!entry) return false;
    return entry.process.exitCode === null;
  }

  getPids(): Record<number, number> {
    const result: Record<number, number> = {};
    for (const [port, entry] of this.processes) {
      if (entry.process.pid) result[port] = entry.process.pid;
    }
    return result;
  }
}

let instance: ProcessManager;

export function getProcessManager(): ProcessManager {
  if (!instance) instance = new ProcessManager();
  return instance;
}
