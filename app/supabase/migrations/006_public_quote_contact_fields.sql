-- Adapts the quotes table for the current frontend's public quote form
-- (src/pages/QuotePage), which collects a request with no account/login step.
--
-- customer_id was `not null references profiles`, which made it impossible for an
-- anonymous visitor to ever satisfy the existing "Anyone can create quotes" policy —
-- inserting without a profile would violate the not-null constraint. Contact details
-- (name/email/phone/company) also had nowhere to live, since the original schema
-- assumed every quote belonged to a signed-in profile that already had them.

alter table public.quotes alter column customer_id drop not null;

alter table public.quotes add column if not exists contact_name text;
alter table public.quotes add column if not exists contact_email text;
alter table public.quotes add column if not exists contact_phone text;
alter table public.quotes add column if not exists company_name text;
alter table public.quotes add column if not exists deadline date;

-- Backfill requires a customer_id or contact_email so a quote is always reachable
-- by someone, whether they signed in or not.
alter table public.quotes add constraint quotes_has_contact
  check (customer_id is not null or contact_email is not null);
