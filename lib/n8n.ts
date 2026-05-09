// Server-only helpers for POSTing to n8n webhooks.
// Called from Server Actions; never imported into client components.

import "server-only";

const WEBHOOKS = {
  save_faq: process.env.N8N_SAVE_FAQ_URL,
  ingest_doc: process.env.N8N_INGEST_DOC_URL,
  rebuild_prompt: process.env.N8N_REBUILD_PROMPT_URL,
  update_bot: process.env.N8N_UPDATE_BOT_URL,
  bot_factory: process.env.N8N_BOT_FACTORY_URL,
} as const;

type WebhookName = keyof typeof WEBHOOKS;

export async function callN8n<T = unknown>(
  name: WebhookName,
  userId: string,
  payload: Record<string, unknown>
): Promise<T> {
  const url = WEBHOOKS[name];
  const secret = process.env.AURAS_WEBHOOK_SECRET;

  if (!url) throw new Error(`Webhook URL for ${name} is not configured`);
  if (!secret) throw new Error("AURAS_WEBHOOK_SECRET is not configured");

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "X-User-Id": userId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `n8n webhook ${name} failed: ${res.status} ${text.slice(0, 200)}`
    );
  }

  return res.json() as Promise<T>;
}
