import http from "node:http";

const PORT = process.env.PORT || 8787;
const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.AI_MODEL || "openai/gpt-oss-120b";
const ORIGIN = process.env.ALLOW_ORIGIN || "http://localhost:5173";
const PROXY_KEY = process.env.PROXY_KEY || ""; // optional shared secret, sent as x-demo-key

const RULES =
  "Use ONLY the facts provided. Never invent numbers, names, dates, deadlines, legal conclusions, or policy terms. " +
  "If something is unknown, say it is unknown. Plain language, no markdown headings, no emojis.";

const SYSTEM = {
  event_summary:
    `You help an insurer's catastrophe team. Summarize the event in at most 120 words: what is happening, how many policyholders are affected, ` +
    `which are most urgent and why, and what to do next. ${RULES}`,

  alert_draft:
    `You write a short, calm outreach message from an insurer to a policyholder who has not yet reported an incident but is exposed to the same issue. ` +
    `Include what we are seeing, three concrete immediate steps, and how to reach us. Under 150 words. State that this is precautionary, not a finding. ${RULES}`,

  claim_narrative:
    `You write the opening narrative paragraph of a first notice of loss for an insurer. Under 150 words, neutral, factual, past tense. ${RULES}`,
};

http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-demo-key");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (req.method !== "POST" || req.url !== "/api/ai") return res.writeHead(404).end();
    if (PROXY_KEY && req.headers["x-demo-key"] !== PROXY_KEY) return res.writeHead(401).end("bad key");
    if (!KEY) return res.writeHead(500).end("GROQ_API_KEY is not set");

    try {
      let raw = "";

      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 60_000) return res.writeHead(413).end("too large");
      }

      const { kind, text } = JSON.parse(raw);

      if (!SYSTEM[kind] || typeof text !== "string" || !text.trim()) {
        return res.writeHead(400).end("bad request");
      }

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          reasoning_effort: "low",
          messages: [
            { role: "system", content: SYSTEM[kind] },
            { role: "user", content: text },
          ],
        }),
      });

      if (!r.ok) return res.writeHead(502).end(await r.text());

      const data = await r.json();

      const out = data.choices?.[0]?.message?.content?.trim() || "";

      res.writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ text: out }));

    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  })
  .listen(PORT, () => console.log(`AI proxy on :${PORT} using ${MODEL}`));
