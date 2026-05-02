# Inbound Handler patch spec

What changes to the existing Inbound Handler n8n workflow so the dashboard has real data to show.

Apply these in order. Each change is independent — test after each one before moving on.

---

## Change 1 · Persist every inbound user message

**Goal**: Every WhatsApp message from a customer gets inserted as a row in `messages` and a `conversations` row is upserted.

### Where to insert
Right after the node that parses the incoming webhook into `{ bot_id, user_phone, user_name, body, wa_message_id }` and **before** the Claude call.

### New nodes

**A. Upsert Conversation** (Supabase node)
- Operation: Upsert
- Table: `conversations`
- Match on: `bot_id, user_phone`
- Field mappings:
  - `bot_id` = `{{ $json.bot_id }}`
  - `user_phone` = `{{ $json.user_phone }}`
  - `user_name` = `{{ $json.user_name }}`
- Return `id` (becomes `conversation_id` for subsequent nodes).

**B. Insert User Message** (Supabase node)
- Operation: Create
- Table: `messages`
- Field mappings:
  - `conversation_id` = `{{ $('Upsert Conversation').first().json.id }}`
  - `direction` = `user`
  - `body` = `{{ $('Webhook').first().json.body }}` (or wherever the raw user text is in your flow)
  - `wa_message_id` = `{{ $('Webhook').first().json.wa_message_id }}`

The trigger `touch_conversation_on_message` will automatically update `conversations.last_message_at`, `message_count`, `last_preview`, and `unread_for_owner`.

### Dedup
Before inserting, optionally check `messages.wa_message_id` against the incoming `wa_message_id`. WhatsApp retries, so the same `wamid` may arrive twice. Easiest version: add a unique index on `messages.wa_message_id` and catch the conflict.

---

## Change 2 · Persist every bot reply

**Goal**: Whenever the bot calls `send_text_reply`, that reply is inserted as a `messages` row with `direction = 'bot'`.

### Where to insert
Inside the tool-result handling for `send_text_reply` (after WhatsApp API call, before returning to Claude).

### New node

**C. Insert Bot Message** (Supabase node)
- Operation: Create
- Table: `messages`
- Field mappings:
  - `conversation_id` = `{{ $('Upsert Conversation').first().json.id }}`
  - `direction` = `bot`
  - `body` = the `text` argument that was sent to WhatsApp
  - `fully_answered` = `{{ $json.fully_answered }}` (see Change 3)

---

## Change 3 · Add `fully_answered` to `send_text_reply` tool schema

**Goal**: Claude declares whether its reply fully answered the customer. When `false`, we log it to the unanswered queue.

### Tool schema change
In the Inbound Handler's Anthropic node, find the tool definition for `send_text_reply`. Add to `input_schema.properties`:

```json
"fully_answered": {
  "type": "boolean",
  "description": "True if your reply confidently answered the customer's question using the knowledge base. False if you had to punt, apologise for not knowing, promise to get back to them, or otherwise gave a non-answer."
}
```

Add `"fully_answered"` to `input_schema.required`.

### System prompt nudge
Append to the system prompt assembled in the Inbound Handler:

```
When calling send_text_reply, set fully_answered=true ONLY if you gave a concrete, useful answer to the customer's question using the knowledge base. If you said "I don't have that info", "let me check with the team", "someone will follow up", or anything similar — set fully_answered=false.
```

### When fully_answered is false → log to unanswered queue

After the `Insert Bot Message` node, add an IF node:

**D. If not fully answered**
- Condition: `{{ $('...').first().json.fully_answered === false }}`

**E. Insert Unanswered Question** (Supabase node, only on the `true` branch of D)
- Operation: Create
- Table: `unanswered_questions`
- Field mappings:
  - `bot_id` = `{{ $json.bot_id }}`
  - `conversation_id` = `{{ $('Upsert Conversation').first().json.id }}`
  - `user_phone` = `{{ $json.user_phone }}`
  - `question` = the last user message body (not the bot reply)
  - `status` = `open`

---

## Change 4 · Respect takeover mode

**Goal**: If `bots.takeover_mode = true`, don't let Claude reply. Pass through to the owner instead.

### Where to insert
Right after fetching the bot row at the top of the flow.

### Logic
- If `takeover_mode = true` and `takeover_until IS NULL OR takeover_until > now()`, skip the Claude call entirely.
- Instead, insert a `messages` row with `direction = 'user'` (the usual persistence) — but don't generate a bot reply.
- Optionally send a WhatsApp push notification to the owner's number via a separate workflow.

### Cleanup
Build a small 5-minute cron workflow that sets `takeover_mode = false` where `takeover_until < now()`.

---

## Testing checklist

1. Send a WhatsApp message to the bot → confirm a row in `conversations` + a row in `messages` with `direction = 'user'`.
2. Bot replies → confirm a second `messages` row with `direction = 'bot'` and `fully_answered = true` (if answered).
3. Ask the bot something it can't answer ("what's your VAT number?") → confirm `fully_answered = false` + a row in `unanswered_questions`.
4. Turn on `takeover_mode` via Supabase UI → send a message → confirm no bot reply + `messages` row still inserted.

---

## Rollback

All four changes are additive. To roll back:
- Disable the new Supabase + IF nodes (don't delete them).
- Remove `fully_answered` from the tool schema — Claude will just ignore it.
- `update bots set takeover_mode = false;` to un-stick any accidental takeovers.

The pre-existing send/receive behaviour is unaffected.
