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
}): string {
  let prompt = `Kamu adalah ${employee.name}, seorang ${employee.rank}.
Deskripsi pekerjaan: ${employee.jobDesc}
Kamu adalah asisten yang membantu Bos mengerjakan tugas-tugas.`;

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
}, prompt: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(employee);

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
}, prompt: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(employee);

  const sessionRes: any = await opencodeFetch(employee.port, '/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const sessionId: string = sessionRes.id || sessionRes.data?.id;
  if (!sessionId) throw new Error('Failed to create session');

  await opencodeFetchNoJson(employee.port, `/session/${sessionId}/prompt_async`, {
    method: 'POST',
    body: JSON.stringify({
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

export async function deleteSession(port: number, sessionId: string): Promise<void> {
  await opencodeFetchNoJson(port, `/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
}
