-- 006_bots_insert_policy.sql
-- Allow authenticated users to insert their own bot row.
--
-- Background: migration 001 set up SELECT and UPDATE policies on bots but
-- intentionally left out an INSERT policy because all inserts originated from
-- n8n (Bot Factory) using the service-role key, which bypasses RLS.
--
-- The self-serve onboarding flow (app/onboarding/actions.ts -> createBot)
-- now inserts directly from the dashboard using the user-scoped supabase
-- client. That hits RLS and fails with:
--   "new row violates row-level security policy for table 'bots'"
--
-- Adding an INSERT policy that pins owner_user_id to the authenticated user
-- closes the gap without widening service-role surface area.

drop policy if exists "bots_owner_insert" on public.bots;
create policy "bots_owner_insert"
  on public.bots for insert
  with check ( owner_user_id = auth.uid() );
