-- 002_dashboard_tables.sql
-- Tables that back the customer-facing dashboard.

create table if not exists public.unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid,
  user_phone text,
  question text not null,
  asked_at timestamptz not null default now(),
  status text not null default 'open',   -- open | resolved | ignored
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists unanswered_questions_bot_id_idx
  on public.unanswered_questions(bot_id);
create index if not exists unanswered_questions_status_idx
  on public.unanswered_questions(status);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  extracted_text text,
  uploaded_at timestamptz not null default now()
);

create index if not exists documents_bot_id_idx on public.documents(bot_id);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists faqs_bot_id_idx on public.faqs(bot_id);

-- RLS: owners can read/write only rows tied to their own bots.
alter table public.unanswered_questions enable row level security;
alter table public.documents enable row level security;
alter table public.faqs enable row level security;

-- Helper: is bot_id owned by the current user?
-- Using a SECURITY DEFINER function avoids recursive RLS issues.
create or replace function public.is_bot_owner(target_bot uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bots
    where id = target_bot
      and owner_user_id = auth.uid()
  );
$$;

-- unanswered_questions policies
drop policy if exists "uq_owner_select" on public.unanswered_questions;
create policy "uq_owner_select"
  on public.unanswered_questions for select
  using ( public.is_bot_owner(bot_id) );

drop policy if exists "uq_owner_update" on public.unanswered_questions;
create policy "uq_owner_update"
  on public.unanswered_questions for update
  using ( public.is_bot_owner(bot_id) )
  with check ( public.is_bot_owner(bot_id) );

-- documents policies
drop policy if exists "doc_owner_select" on public.documents;
create policy "doc_owner_select"
  on public.documents for select
  using ( public.is_bot_owner(bot_id) );

drop policy if exists "doc_owner_delete" on public.documents;
create policy "doc_owner_delete"
  on public.documents for delete
  using ( public.is_bot_owner(bot_id) );

-- faqs policies
drop policy if exists "faq_owner_all" on public.faqs;
create policy "faq_owner_all"
  on public.faqs for all
  using ( public.is_bot_owner(bot_id) )
  with check ( public.is_bot_owner(bot_id) );
