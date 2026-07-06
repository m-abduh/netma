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

async function opencodeFetchNoJson(port: number, path: string, options: RequestInit = {}) {
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
  return res;
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
Kamu adalah asisten yang membantu Bos mengerjakan tugas-tugas.`;

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

export async function chatWithEmployee(employee: {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  port: number;
  supervisorName?: string;
  supervisorRank?: string;
  subordinates?: { name: string; rank: string }[];
}, prompt: string, mode: 'plan' | 'build' = 'plan'): Promise<string> {
  const systemPrompt = buildSystemPrompt(employee, mode);

  const sessionRes: any = await opencodeFetch(employee.port, '/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const sessionId: string = sessionRes.id || sessionRes.data?.id;
  if (!sessionId) throw new Error('Failed to create session');

  try {
    const msgRes: any = await opencodeFetch(employee.port, `/session/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({
        agent: mode,
        system: systemPrompt,
        parts: [{ type: 'text', text: prompt }],
      }),
      signal: AbortSignal.timeout(180000),
    });

    const parts: any[] = msgRes.parts || [];
    const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('').trim();
    if (text) return text;

    if (msgRes.info?.content) return msgRes.info.content;

    throw new Error('Empty response from opencode');
  } finally {
    opencodeFetch(employee.port, `/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  }
}

export async function createSessionAsync(employee: {
  id: string;
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  port: number;
  supervisorName?: string;
  supervisorRank?: string;
  subordinates?: { name: string; rank: string }[];
}, prompt: string, mode: 'plan' | 'build' = 'plan'): Promise<string> {
  const systemPrompt = buildSystemPrompt(employee, mode);

  const sessionRes: any = await opencodeFetch(employee.port, '/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const sessionId: string = sessionRes.id || sessionRes.data?.id;
  if (!sessionId) throw new Error('Failed to create session');

  await opencodeFetchNoJson(employee.port, `/session/${sessionId}/prompt_async`, {
    method: 'POST',
    body: JSON.stringify({
      agent: mode,
      system: systemPrompt,
      parts: [{ type: 'text', text: prompt }],
    }),
  });

  return sessionId;
}

export async function pollMessageParts(port: number, sessionId: string): Promise<{
  text: string;
  reasoning: string;
  isComplete: boolean;
}> {
  const msgRes: any = await opencodeFetch(port, `/session/${sessionId}/message?limit=1`);
  // opencode bisa return array [message] atau { data: [message] }
  const list: any[] = Array.isArray(msgRes)
    ? msgRes
    : Array.isArray(msgRes.data)
      ? msgRes.data
      : msgRes.messages
        ? msgRes.messages
        : [msgRes];
  const msg = list[list.length - 1] || list[0] || msgRes;
  const parts: any[] = msg.parts || [];
  const isComplete = msg.info?.finish === 'stop' || msg.completed || msg.state === 'done' || msg.status === 'done' || msg.done === true;
  const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('');
  const reasoning = parts.filter((p: any) => p.type === 'reasoning').map((p: any) => p.reasoning || p.text).join('');
  return { text, reasoning, isComplete };
}

export async function* streamMessageParts(
  port: number,
  sessionId: string,
  signal?: AbortSignal
): AsyncGenerator<{ text: string; reasoning: string; isComplete: boolean }> {
  const url = `http://127.0.0.1:${port}/event`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString('base64')}`,
    },
    signal,
  });
  if (!res.ok) throw new Error(`SSE connection failed (${res.status})`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const partTypes = new Map<string, 'text' | 'reasoning'>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(trimmed.slice(6));
          const { type, properties } = event;
          if (properties?.sessionID !== sessionId) continue;

          if (type === 'message.part.updated') {
            const part = properties.part;
            if (part?.type === 'reasoning' || part?.type === 'text') {
              partTypes.set(part.id, part.type);
            }
          } else if (type === 'message.part.delta') {
            const { partID, delta } = properties;
            if (!delta) continue;
            const partType = partTypes.get(partID) || 'text';
            if (partType === 'reasoning') {
              yield { text: '', reasoning: delta, isComplete: false };
            } else {
              yield { text: delta, reasoning: '', isComplete: false };
            }
          } else if (type === 'message.updated') {
            if (properties.info?.finish === 'stop') {
              yield { text: '', reasoning: '', isComplete: true };
              return;
            }
          } else if (type === 'session.status') {
            if (properties.status?.type === 'idle') {
              yield { text: '', reasoning: '', isComplete: true };
              return;
            }
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function deleteSession(port: number, sessionId: string): Promise<void> {
  await opencodeFetchNoJson(port, `/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
}
