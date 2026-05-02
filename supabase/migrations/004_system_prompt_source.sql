-- 004_system_prompt_source.sql
-- Distinguishes auto-built system prompts (from docs/FAQs) vs. manually edited ones.
-- Rebuild System Prompt webhook skips bots with source = 'manual'.

alter table public.bots
  add column if not exists system_prompt_source text not null default 'auto'
    check (system_prompt_source in ('auto', 'manual'));
