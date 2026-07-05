import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { OPENCODE_PASSWORD } from '../config';

interface ProcessEntry {
  process: ChildProcess;
  port: number;
}

class ProcessManager {
  private processes: Map<number, ProcessEntry> = new Map();

  private buildSystemPrompt(employee: { name: string; rank: string; jobDesc: string }): string {
    return `Kamu adalah ${employee.name}, seorang ${employee.rank}.
Deskripsi pekerjaan: ${employee.jobDesc}
Kamu adalah asisten yang membantu Bos mengerjakan tugas-tugas.`;
  }

  async start(employee: { id: string; name: string; rank: string; jobDesc: string; model: string; port: number }): Promise<{ pid: number }> {
    try {
      execSync(`fuser -k ${employee.port}/tcp 2>/dev/null`, { stdio: 'ignore' });
    } catch {}

    const configDir = path.join(process.env.HOME || '/tmp', '.opencode', employee.id);
    fs.mkdirSync(configDir, { recursive: true });

    const configPath = path.join(configDir, 'config.json');
    const config = {
      model: employee.model,
      systemPrompt: this.buildSystemPrompt(employee),
      port: employee.port,
      hostname: '127.0.0.1',
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const proc = spawn('opencode', ['serve', '--port', String(employee.port), '--hostname', '127.0.0.1'], {
      env: {
        ...process.env,
        OPENCODE_CONFIG_DIR: configDir,
        OPENCODE_SERVER_PASSWORD: OPENCODE_PASSWORD,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.processes.set(employee.port, { process: proc, port: employee.port });

    proc.on('exit', (code) => {
      this.processes.delete(employee.port);
    });

    proc.on('error', (err) => {
      this.processes.delete(employee.port);
      throw err;
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for opencode to start'));
      }, 30000);

      proc.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString();
        if (msg.includes('listening') || msg.includes('started') || msg.includes('Server')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString();
        if (msg.includes('listening') || msg.includes('started') || msg.includes('Server')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      proc.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`opencode exited with code ${code}`));
        }
      });
    });

    return { pid: proc.pid || 0 };
  }

  stop(port: number): void {
    const entry = this.processes.get(port);
    if (!entry) return;

    try {
      entry.process.kill('SIGTERM');
      setTimeout(() => {
        try {
          entry.process.kill('SIGKILL');
        } catch {}
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
      if (entry.process.pid) {
        result[port] = entry.process.pid;
      }
    }
    return result;
  }
}

let instance: ProcessManager;

export function getProcessManager(): ProcessManager {
  if (!instance) {
    instance = new ProcessManager();
  }
  return instance;
}
