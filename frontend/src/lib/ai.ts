const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL ?? 'http://localhost:8787/api/ai';
const PROXY_KEY = import.meta.env.VITE_PROXY_KEY ?? '';
 
export type AiKind = 'event_summary' | 'alert_draft' | 'claim_narrative';
 
export async function askAi(kind: AiKind, text: string): Promise<string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (PROXY_KEY) headers['x-demo-key'] = PROXY_KEY;
 
  const r = await fetch(PROXY_URL, { method: 'POST', headers, body: JSON.stringify({ kind, text }) });
  if (!r.ok) throw new Error(`AI request failed (${r.status}): ${await r.text()}`);
  const data = (await r.json()) as { text: string };
  if (!data.text) throw new Error('The AI returned an empty answer.');
  return data.text;
}