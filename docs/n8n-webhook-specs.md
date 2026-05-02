# n8n webhook specs — dashboard writes

The dashboard never writes to Supabase directly (except for read caches). Every "create / update / delete" goes through an n8n webhook so business logic stays in one place.

Build these four webhooks. For each, the dashboard expects:
- `POST` with `Content-Type: application/json`
- Response `200 OK` with `{ "ok": true }` on success, `4xx/5xx` on failure.
- `Authorization: Bearer <AURAS_WEBHOOK_SECRET>` header — validate this at the top of each webhook.

Add the webhook URLs to `.env.local`:
```
AURAS_WEBHOOK_SECRET=<generate with openssl rand -hex 32>
NEXT_PUBLIC_BOT_FACTORY_WEBHOOK_URL=https://aurasmsg.app.n8n.cloud/webhook/...
N8N_SAVE_FAQ_URL=https://aurasmsg.app.n8n.cloud/webhook/...
N8N_INGEST_DOC_URL=https://aurasmsg.app.n8n.cloud/webhook/...
N8N_REBUILD_PROMPT_URL=https://aurasmsg.app.n8n.cloud/webhook/...
N8N_UPDATE_BOT_URL=https://aurasmsg.app.n8n.cloud/webhook/...
```

---

## 1 · Save FAQ

**Purpose**: Create / update an FAQ, then trigger a system prompt rebuild.

**Endpoint**: `POST /webhook/<uuid>-save-faq`

**Request body**:
```json
{
  "bot_id": "uuid",
  "faq_id": "uuid (optional — present for edits)",
  "question": "string",
  "answer": "string",
  "delete": false
}
```

**Nodes**:
1. **Validate** — IF `body.bot_id` missing → return 400.
2. **Check ownership** — Supabase select from `bots where id = bot_id and owner_user_id = <from token>`. (See auth section below.)
3. **Branch on delete**:
   - If `delete = true`: Supabase delete from `faqs where id = faq_id`.
   - If `faq_id` set: Supabase update.
   - Else: Supabase insert.
4. **Trigger Rebuild System Prompt** — HTTP Request POST to the Rebuild webhook with `{ bot_id }`.
5. **Respond** `{ "ok": true }`.

---

## 2 · Ingest Document

**Purpose**: Pull uploaded file from Supabase Storage, extract text, store in `documents`, trigger prompt rebuild.

**Endpoint**: `POST /webhook/<uuid>-ingest-doc`

**Request body**:
```json
{
  "bot_id": "uuid",
  "file_name": "price-list.pdf",
  "storage_path": "bot-documents/<bot_id>/<uuid>.pdf",
  "mime_type": "application/pdf"
}
```

**Nodes**:
1. **Validate + ownership check** — same as above.
2. **Download from Supabase Storage** — HTTP Request to `${SUPABASE_URL}/storage/v1/object/${storage_path}` with service-role Authorization header, response as binary.
3. **Extract text** — branch on `mime_type`:
   - `application/pdf` → use an HTTP Request to a PDF-to-text service (or a Code node with `pdf-parse` if n8n's Code node supports npm modules on your tier).
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → mammoth.js (DOCX → text).
   - `text/*` → pass through.
   - Images → send to Anthropic Vision with "describe the content" prompt.
4. **Insert into `documents`** — Supabase create with `file_name`, `storage_path`, `extracted_text`.
5. **Trigger Rebuild System Prompt** with `{ bot_id }`.
6. **Respond** `{ "ok": true, "document_id": "..." }`.

Heavy-lift gotcha: if the PDF is scanned (image-only), pdf-parse returns empty. Fall back to sending pages to Anthropic Vision.

---

## 3 · Rebuild System Prompt

**Purpose**: Recompute the bot's `system_prompt` from company info + docs + FAQs. Called every time knowledge changes.

**Endpoint**: `POST /webhook/<uuid>-rebuild-prompt`

**Request body**:
```json
{ "bot_id": "uuid" }
```

**Nodes**:
1. **Validate**.
2. **Fetch bot** — Supabase select `bots where id = bot_id`.
   - If `system_prompt_source = 'manual'` → return early (owner manually edited, don't overwrite).
3. **Fetch docs** — Supabase select `documents.extracted_text where bot_id = bot_id order by uploaded_at desc limit 20`.
4. **Fetch FAQs** — Supabase select `faqs where bot_id = bot_id order by created_at desc limit 50`.
5. **Fetch recent website scrape** — from the original crawl (already stored; if not, skip).
6. **Compose prompt** (Code node):
   ```js
   const bot = $('Fetch bot').first().json;
   const docs = $('Fetch docs').all().map(d => d.json.extracted_text).join('\n\n---\n\n');
   const faqs = $('Fetch FAQs').all()
     .map(f => `Q: ${f.json.question}\nA: ${f.json.answer}`)
     .join('\n\n');

   const prompt = `You are a friendly WhatsApp customer service assistant for ${bot.company_name}.
   Respond in short, casual messages (2-4 sentences). Never use markdown. If you don't know, say so honestly and offer to have someone follow up.

   KNOWLEDGE BASE:
   ${bot.raw_scrape || ''}

   ${docs ? 'UPLOADED DOCUMENTS:\n' + docs : ''}

   ${faqs ? 'FAQs:\n' + faqs : ''}

   When calling send_text_reply, set fully_answered=true only if you gave a concrete useful answer. Otherwise false.`;
   return [{ json: { system_prompt: prompt, bot_id: bot.id } }];
   ```
7. **Update bot** — Supabase update `bots set system_prompt = :system_prompt where id = :bot_id`.
8. **Respond** `{ "ok": true, "length": <chars> }`.

---

## 4 · Update Bot

**Purpose**: Owner edits business details or manually overrides the system prompt.

**Endpoint**: `POST /webhook/<uuid>-update-bot`

**Request body**:
```json
{
  "bot_id": "uuid",
  "patch": {
    "company_name": "...",
    "contact_email": "...",
    "contact_phone": "...",
    "takeover_mode": true,
    "takeover_until": "2026-04-25T12:00:00Z",
    "system_prompt": "...",
    "system_prompt_source": "manual"
  }
}
```

**Nodes**:
1. **Validate + ownership**.
2. **Whitelist patch keys** (Code node) — only let through the keys above. Never allow `id`, `owner_user_id`, `status` to be patched from the dashboard.
3. **Supabase update** `bots set ... where id = bot_id`.
4. **Respond** `{ "ok": true }`.

Note: when `system_prompt` is in the patch, set `system_prompt_source = 'manual'` so future knowledge changes don't overwrite.

---

## Auth model for webhooks

The dashboard's POST includes:
- `Authorization: Bearer ${AURAS_WEBHOOK_SECRET}` — shared secret, validates the caller is the dashboard.
- `X-User-Id: <auth.uid()>` — the signed-in Supabase user. The dashboard gets this from `session.user.id` and the server action trusts it (because the bearer secret vouches for the request).

In each webhook's first node, add an IF:
```
$headers.authorization !== `Bearer ${env.AURAS_WEBHOOK_SECRET}`
  → return 401
```

In ownership checks, use `X-User-Id`:
```
select id from bots where id = :bot_id and owner_user_id = :x_user_id
```

Return 403 if no row.

---

## One-time `bots` column addition

Add this column to support Update Bot webhook:

```sql
alter table public.bots
  add column if not exists system_prompt_source text default 'auto';
```

Include this in a follow-up migration `004_system_prompt_source.sql`.
