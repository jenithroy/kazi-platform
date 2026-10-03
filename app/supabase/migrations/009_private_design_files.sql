-- Migration: keep customers' design files private
--
-- 003's "Allow owners to view" policy never checked the owner (`using (bucket_id =
-- 'design-files')`), so anyone with the site's public anon key could list and download every
-- file attached to a quote. This replaces it with a real owner check.
--
-- Nothing on the site reads these files back: QuotePage only uploads them (insert), and staff
-- open them from the Supabase dashboard, which these policies don't apply to. Files uploaded
-- by logged-out visitors have no owner, so only staff can read those. Staff access is
-- unchanged ("Allow employees to view all" from 003).
--
-- Safe to re-run.

-- Signed-in customers can see the files they uploaded themselves.
drop policy if exists "Allow owners to view" on storage.objects;
drop policy if exists "Owners can view their design files" on storage.objects;
create policy "Owners can view their design files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'design-files' and owner_id = (select auth.uid())::text);

-- A public bucket serves every file by URL without checking any policy, so make sure this one
-- stays private even if it was switched in the dashboard.
update storage.buckets set public = false where id = 'design-files';
