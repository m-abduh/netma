import { OPENCODE_PASSWORD } from '../config';

async function opencodeFetch(port: number, path: string, options: RequestInit = {}) {
  const url = `http://127.0.0.1:${port}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`opencode serve error (${res.status}): ${errText}`);
  }
  return res.json();
}

function buildSystemPrompt(employee: {
  name: string;
  rank: string;
  jobDesc: string;
  workStart: string;
  workEnd: string;
}): string {
  return `Kamu adalah ${employee.name}, seorang ${employee.rank}.
Deskripsi pekerjaan: ${employee.jobDesc}
Jam kerja: ${employee.workStart} - ${employee.workEnd}
Kamu adalah AI asisten yang membantu Bos mengerjakan tugas-tugas.`;
}

export async function chatWithEmployee(employee: {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  port: number;
  workStart: string;
  workEnd: string;
}, prompt: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(employee);
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  const sessionRes: any = await opencodeFetch(employee.port, '/api/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const sessionId: string = sessionRes.data?.id;
  if (!sessionId) throw new Error('Failed to create session');

  try {
    await opencodeFetch(employee.port, `/api/session/${sessionId}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt: { text: fullPrompt }, delivery: 'queue' }),
    });

    const maxAttempts = 180;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const historyRes: any = await opencodeFetch(employee.port, `/api/session/${sessionId}/history`);
      const events: any[] = historyRes.data || [];

      const textEnded = events.find((e: any) => e.type === 'session.next.text.ended');
      if (textEnded?.data?.text) {
        return textEnded.data.text;
      }

      const stepEnded = events.find((e: any) => e.type === 'session.next.step.ended');
      if (stepEnded && stepEnded.data?.finish === 'stop') {
        const precedingText = events.find((e: any) => e.type === 'session.next.text.ended');
        if (precedingText?.data?.text) return precedingText.data.text;
        break;
      }
    }

    throw new Error('Timeout waiting for response');
  } finally {
    opencodeFetch(employee.port, `/api/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  }
}
