# Auras Dashboard

Customer-facing Next.js 14 dashboard for Auras — the WhatsApp AI agent platform.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style primitives
- Supabase Auth (magic-link) + Postgres (reads) with Row-Level Security
- n8n webhooks for writes (creating bots, uploading docs)
- TanStack Query on the client
- Deploys to Vercel

## Architecture

Reads go direct to Supabase using the user's session (RLS enforces ownership).
Writes are POSTed to n8n webhooks so business logic stays in one place.

```
Browser ──GET──▶ Supabase (RLS: owner_user_id = auth.uid())
Browser ──POST─▶ n8n Webhook ──▶ Supabase (service role, bypasses RLS)
```

## Local setup

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in keys from Supabase dashboard
cp .env.example .env.local

# 3. Run migrations (Supabase SQL editor, or `supabase db push`)
#    supabase/migrations/001_owner_user_id.sql
#    supabase/migrations/002_dashboard_tables.sql

# 4. Dev server
npm run dev
```

Open http://localhost:3000 and sign in with your email.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add env vars from `.env.example` in Project Settings → Environment Variables.
4. In Supabase → Auth → URL Configuration, add the production domain to the allow-list.

## Project structure

```
app/
  page.tsx                    Landing page
  login/page.tsx              Magic-link sign-in
  auth/callback/route.ts      OAuth/magic-link code exchange
  auth/signout/route.ts       POST to sign out
  onboarding/page.tsx         First-time setup → POSTs to Bot Factory
  dashboard/
    layout.tsx                Sidebar + auth guard
    page.tsx                  Home: bot summary, stats, next steps
    conversations/page.tsx    (Week 2) inbox
    unanswered/page.tsx       (Week 2) teach-the-bot queue
    knowledge/page.tsx        (Week 3) uploads + FAQs
    settings/page.tsx         Business details + system prompt
components/ui/                Button, Input, Label, Card (shadcn-style)
lib/
  supabase/client.ts          Browser client
  supabase/server.ts          Server component client
  supabase/middleware.ts      Session refresh + route guard
  types.ts                    Row types
  utils.ts                    cn()
middleware.ts                 Wires updateSession into every request
supabase/migrations/          SQL schema additions
```

## Roadmap

- **Week 1 (now)**: Scaffold + auth + onboarding + bot → owner link.
- **Week 2**: Conversations inbox, unanswered queue, takeover mode.
- **Week 3**: Document uploads, FAQ editor, knowledge re-build.
- **Week 4**: Paystack billing, tone/hours settings, launch to waitlist.
