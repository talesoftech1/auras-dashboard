-- 003_conversations.sql
-- Persist every WhatsApp conversation + message so the dashboard inbox has data.
-- Inbound Handler writes to these tables (see docs/inbound-handler-patch.md).

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  user_phone text not null,
  user_name text,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  message_count integer not null default 0,
  unread_for_owner boolean not null default true,
  -- Caches the last user message so list views don't need a join/aggregate.
  last_preview text,
  unique (bot_id, user_phone)
);

create index if not exists conversations_bot_id_idx
  on public.conversations(bot_id);
create index if not exists conversations_last_message_idx
  on public.conversations(bot_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  -- 'user' = from the customer via WhatsApp
  -- 'bot'  = reply the bot sent
  -- 'owner' = owner took over and typed this themselves
  -- 'system' = automated note (e.g. "owner took over", "bot resumed")
  direction text not null check (direction in ('user', 'bot', 'owner', 'system')),
  body text not null,
  wa_message_id text,                -- WhatsApp's wamid for dedup
  fully_answered boolean,            -- bot-only: did Claude say it fully answered
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages(conversation_id, created_at);
create index if not exists messages_wa_message_id_idx
  on public.messages(wa_message_id);

-- Keep conversations.last_message_at + message_count + last_preview in sync on insert.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      message_count = message_count + 1,
      -- Only cache user-side previews (what the owner wants to scan).
      last_preview = case
        when new.direction = 'user' then left(new.body, 200)
        else last_preview
      end,
      unread_for_owner = case
        when new.direction = 'user' then true
        else unread_for_owner
      end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- RLS: owner reads only their own conversations + messages.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conv_owner_select" on public.conversations;
create policy "conv_owner_select"
  on public.conversations for select
  using ( public.is_bot_owner(bot_id) );

drop policy if exists "conv_owner_update" on public.conversations;
create policy "conv_owner_update"
  on public.conversations for update
  using ( public.is_bot_owner(bot_id) )
  with check ( public.is_bot_owner(bot_id) );

drop policy if exists "msg_owner_select" on public.messages;
create policy "msg_owner_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and public.is_bot_owner(c.bot_id)
    )
  );

-- Inserts happen from n8n via service-role key which bypasses RLS.
-- No insert policy needed for end users.

-- Link unanswered_questions back to the real conversation.
alter table public.unanswered_questions
  drop constraint if exists unanswered_questions_conversation_id_fkey;
alter table public.unanswered_questions
  add constraint unanswered_questions_conversation_id_fkey
  foreign key (conversation_id) references public.conversations(id) on delete set null;
