-- 001_owner_user_id.sql
-- Link bots to the auth.users account that owns them.

alter table public.bots
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists bots_owner_user_id_idx on public.bots(owner_user_id);

-- Takeover mode: let the owner pause the bot for a specific customer.
alter table public.bots
  add column if not exists takeover_mode boolean not null default false;

alter table public.bots
  add column if not exists takeover_until timestamptz;

-- Row-level security: owners see only their own bots.
alter table public.bots enable row level security;

drop policy if exists "bots_owner_select" on public.bots;
create policy "bots_owner_select"
  on public.bots for select
  using ( owner_user_id = auth.uid() );

drop policy if exists "bots_owner_update" on public.bots;
create policy "bots_owner_update"
  on public.bots for update
  using ( owner_user_id = auth.uid() )
  with check ( owner_user_id = auth.uid() );

-- NOTE: inserts happen from n8n (Bot Factory) using the service-role key,
-- which bypasses RLS. No insert policy is needed for end users.
