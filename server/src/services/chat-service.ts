import { createGroqClient } from '../executor/groq';
import { runLoop, buildSystemMessage } from '../executor/loop';
import { getProjectDir } from '../config';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

interface EmployeeInfo {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  mode?: string;
  port?: number;
  supervisorName?: string;
  supervisorRank?: string;
  subordinates?: { name: string; rank: string }[];
}

function buildConfig(model: string) {
  return {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: GROQ_BASE_URL,
    model: model || 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_iterations: 25,
    command_timeout: 60000,
    task_timeout: 300000,
    blacklist: [],
    working_dir: getProjectDir(),
  };
}

function buildSystemPrompt(employee: {
  name: string;
  rank: string;
  jobDesc: string;
  supervisorName?: string;
  supervisorRank?: string;
  subordinates?: { name: string; rank: string }[];
}, mode: 'plan' | 'build' = 'plan'): string {
  let prompt = `Kamu adalah ${employee.name}, seorang ${employee.rank}.
Deskripsi pekerjaan: ${employee.jobDesc}
Kamu adalah asisten yang membantu Bos mengerjakan tugas-tugas.
PENTING: Jika suatu perintah gagal dijalankan (misalnya karena network error, command timeout, atau file not found), JANGAN mengulang perintah yang sama lebih dari 2 kali. Coba pendekatan alternatif atau laporkan ke Bos bahwa tugas gagal beserta penyebabnya. Jika sudah 3 kali mencoba dan tetap gagal, akhiri dengan melaporkan kegagalan secara jelas.`;

  if (mode === 'plan') {
    prompt += `\nKamu sedang dalam mode PLAN. Kamu HANYA boleh melakukan analisis, riset, perencanaan, dan memberikan penjelasan. DILARANG KERAS menulis kode, membuat file, atau mengeksekusi perintah apapun. Output kamu hanya boleh berupa teks analisis dan rencana, TIDAK BOLEH mengandung kode atau perintah eksekusi.`;
  } else {
    prompt += `\nKamu sedang dalam mode BUILD. Fokus pada eksekusi dan implementasi. Tulis kode, buat perubahan konkret, dan deliver hasil. Jangan terlalu lama menganalisis — langsung action. Utamakan output berupa kode, perintah, dan implementasi.`;
  }

  if (employee.supervisorName) {
    prompt += `\nAtasanmu: ${employee.supervisorName} (${employee.supervisorRank}). Jika Bos memberi tugas melalui atasanmu, koordinasikan dengan atasanmu.`;
  }

  if (employee.subordinates && employee.subordinates.length > 0) {
    const list = employee.subordinates.map((s) => `${s.name} (${s.rank})`).join(', ');
    prompt += `\nBawahan langsungmu: ${list}. Jika Bos memberi tugas, buatlah rencana dan tugaskan bawahanmu yang sesuai.`;
  }

  return prompt;
}

export async function chatWithEmployee(
  employee: EmployeeInfo,
  prompt: string,
  mode?: 'plan' | 'build',
  history?: { role: string; content: string }[]
): Promise<string> {
  const activeMode = mode || (employee.mode as 'plan' | 'build') || 'plan';
  const systemPrompt = buildSystemPrompt(employee, activeMode);
  const config = buildConfig(employee.model);

  const messages: any[] = [
    { role: 'system' as const, content: systemPrompt },
  ];

  if (history && history.length > 0) {
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  const result = await runLoop(prompt, config, messages);

  const lastAssistant = [...result].reverse().find(m => m.role === 'assistant');
  return lastAssistant?.content || '';
}

export async function directChat(
  systemPrompt: string,
  prompt: string,
  model: string
): Promise<string> {
  const config = buildConfig(model);
  const messages = [{ role: 'system' as const, content: systemPrompt }];
  const result = await runLoop(prompt, config, messages);
  const lastAssistant = [...result].reverse().find(m => m.role === 'assistant');
  return lastAssistant?.content || '';
}
