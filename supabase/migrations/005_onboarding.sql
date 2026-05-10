-- Onboarding wizard support: track WhatsApp provisioning state per bot.
--
-- New bots default to whatsapp_setup_status='using_shared' — they go live on
-- the shared Auras number immediately, identified by their trigger_keyword.
-- Customers who later want their own dedicated number transition through
-- 'pending_provisioning' -> 'connected'.

alter table public.bots
  add column if not exists whatsapp_setup_status text not null default 'using_shared',
  add column if not exists whatsapp_phone_number text,
  add column if not exists whatsapp_phone_number_id text;

comment on column public.bots.whatsapp_setup_status is
  'One of: using_shared, pending_provisioning, connected, failed.';
comment on column public.bots.whatsapp_phone_number is
  'Raw number the customer typed when upgrading, e.g. +27821234567.';
comment on column public.bots.whatsapp_phone_number_id is
  'Meta Cloud API Phone Number ID once we have provisioned and connected the line.';

alter table public.bots
  drop constraint if exists bots_whatsapp_setup_status_check;
alter table public.bots
  add constraint bots_whatsapp_setup_status_check
  check (whatsapp_setup_status in ('using_shared', 'pending_provisioning', 'connected', 'failed'));

-- trigger_keyword has to be unique across the whole table so the Inbound
-- Handler can route messages on the shared number unambiguously. Existing
-- rows should already have unique values from the Bot Factory generator;
-- if not, that needs cleaning up before this constraint can be added.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bots_trigger_keyword_unique'
  ) then
    alter table public.bots
      add constraint bots_trigger_keyword_unique unique (trigger_keyword);
  end if;
end$$;
