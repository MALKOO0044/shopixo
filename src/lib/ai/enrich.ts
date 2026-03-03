type GenOpts = { locale?: 'en' | 'ar'; };

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

async function callLLM(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Fallback: return a safe deterministic stub to avoid blocking flows
    return user.slice(0, 512);
  }
  const model = process.env.AI_MODEL_TEXT || 'gpt-4o-mini';
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    return user.slice(0, 512);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || user.slice(0, 512);
}

export async function generateTitle(base: string, opts: GenOpts = {}): Promise<string> {
  const system = 'You are a concise e-commerce product title writer.';
  const user = `Title: ${base}\nRules: <= 60 chars, no emojis, capitalize properly.`;
  const out = await callLLM(system, user);
  return out.trim();
}

export async function generateDescription(base: string, opts: GenOpts = {}): Promise<string> {
  const system = 'You write product descriptions with bullets and a short paragraph.';
  const user = `Product: ${base}\nWrite 1 short paragraph and 3–5 bullets.`;
  const out = await callLLM(system, user);
  return out.trim();
}

export async function translateAr(text: string): Promise<string> {
  const system = 'Translate to Arabic with natural phrasing and RTL awareness. Keep meaning and tone.';
  const user = text;
  const out = await callLLM(system, user);
  return out.trim();
}
