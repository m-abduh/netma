const OPENCODE_API = 'https://opencode.ai/zen/v1/chat/completions';

function getModelId(model: string): string {
  return model.replace('opencode/', '');
}

export async function chatWithEmployee(employee: {
  name: string;
  rank: string;
  jobDesc: string;
  model: string;
  workStart: string;
  workEnd: string;
}, prompt: string): Promise<string> {
  const systemPrompt = `Kamu adalah ${employee.name}, seorang ${employee.rank}.
Deskripsi pekerjaan: ${employee.jobDesc}
Jam kerja: ${employee.workStart} - ${employee.workEnd}
Kamu adalah AI asisten yang membantu Bos mengerjakan tugas-tugas.`;

  const response = await fetch(OPENCODE_API, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer public',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModelId(employee.model),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || JSON.stringify(data);
}
