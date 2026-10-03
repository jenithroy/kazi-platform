-- Migration: brand outreach — personalised email sequences sent from Google Workspace
--
-- Staff connect their own Workspace mailboxes, import the brands they want to pitch, and
-- enrol them in sequences: a first email, then follow-ups in the same thread a few days
-- apart. The outreach-worker edge function runs every minute (pg_cron, see
-- docs/outreach.md). Each run it reads every connected mailbox's new mail through the Gmail
-- API — stopping a sequence the moment a prospect replies, bounces or asks to be left alone —
-- then sends whatever is due, inside each sequence's sending hours and each mailbox's daily
-- limit, spaced a few minutes apart so it reads like a person working through their inbox.
--
-- Everything here is staff-only. Google credentials live in their own table that only the
-- service role (edge functions) can read, and the functions encrypt them before storing.
--
-- Needs 007 (is_staff/is_admin, touch_updated_at). Safe to re-run.

-- ---------------------------------------------------------------------------------------
-- Mailboxes (Google Workspace accounts connected through OAuth by the outreach-api function)
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_mailboxes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  from_name text not null default '' check (char_length(from_name) <= 100),
  signature text not null default '' check (char_length(signature) <= 2000),
  connected_by uuid references public.profiles(id) on delete set null,
  -- 'error': Google stopped accepting the stored access (reconnect to fix).
  -- 'disconnected': access revoked from /admin; the row stays so sent history keeps its sender.
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'disconnected')),
  last_error text,
  -- At most daily_limit emails in any 24 hours. While warm-up is on, a newly connected
  -- mailbox starts at warmup_start a day and adds warmup_increment each day until it
  -- reaches daily_limit, so a sudden jump in volume doesn't trip spam filters.
  daily_limit integer not null default 40 check (daily_limit between 1 and 500),
  warmup_enabled boolean not null default true,
  warmup_start integer not null default 10 check (warmup_start between 1 and 500),
  warmup_increment integer not null default 5 check (warmup_increment between 1 and 100),
  warmup_started_at timestamptz not null default now(),
  -- A random pause of between min and max seconds follows every send.
  min_gap_seconds integer not null default 240 check (min_gap_seconds between 30 and 3600),
  max_gap_seconds integer not null default 600 check (max_gap_seconds between 30 and 7200),
  next_send_at timestamptz not null default now(),
  gmail_history_id text,
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_mailboxes_gap check (max_gap_seconds >= min_gap_seconds)
);

-- OAuth tokens, AES-GCM encrypted by the edge functions (key: the OUTREACH_SECRET function
-- secret). No grants and no policies for anon/authenticated: only the service role reads it.
create table if not exists public.outreach_mailbox_credentials (
  mailbox_id uuid primary key references public.outreach_mailboxes(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scopes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------
-- Prospects (the people at brands being pitched)
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  email_domain text generated always as (split_part(email, '@', 2)) stored,
  first_name text,
  last_name text,
  company text,
  title text,
  website text,
  phone text,
  linkedin_url text,
  city text,
  country text,
  -- Extra columns from an imported spreadsheet, usable in emails as {{column_name}}.
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  tags text[] not null default '{}',
  source text,
  -- new → contacted → replied are set by the worker; the rest are set by staff (or by the
  -- worker for bounces and opt-outs).
  status text not null default 'new' check (status in (
    'new', 'contacted', 'replied', 'interested', 'meeting', 'customer', 'not_interested', 'bounced', 'unsubscribed'
  )),
  notes text,
  last_contacted_at timestamptz,
  replied_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_prospects_status on public.outreach_prospects (status);
create index if not exists outreach_prospects_domain on public.outreach_prospects (email_domain);
create index if not exists outreach_prospects_tags on public.outreach_prospects using gin (tags);
create index if not exists outreach_prospects_created on public.outreach_prospects (created_at desc);

-- ---------------------------------------------------------------------------------------
-- Do-not-contact list: an email address, or a whole domain (no @)
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_suppressions (
  id uuid primary key default gen_random_uuid(),
  value text not null unique check (value = lower(value) and value ~ '^([^@\s]+@)?[^@\s]+\.[^@\s]+$'),
  reason text not null default 'manual'
    check (reason in ('unsubscribed', 'bounced', 'not_interested', 'complained', 'manual')),
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.outreach_is_suppressed(p_email text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.outreach_suppressions
    where value in (lower(p_email), split_part(lower(p_email), '@', 2))
  );
$$;

-- ---------------------------------------------------------------------------------------
-- Sequences and their emails
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  mailbox_id uuid references public.outreach_mailboxes(id) on delete set null,
  -- Emails only go out on send_days (ISO weekdays, 1 = Monday) between send_from and
  -- send_until, in this time zone. An invalid zone name fails the insert.
  timezone text not null default 'Europe/London'
    check ((timestamptz '2000-01-01 00:00:00+00' at time zone timezone) is not null),
  send_days smallint[] not null default '{1,2,3,4,5}'
    check (cardinality(send_days) between 1 and 7 and send_days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  send_from time not null default '09:00',
  send_until time not null default '17:00',
  -- When anyone at a company replies, stop the sequence for their colleagues too.
  stop_on_domain_reply boolean not null default true,
  -- Adds an unsubscribe link (and one-click List-Unsubscribe headers) to every email.
  unsubscribe_link boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_sequences_window check (send_until > send_from)
);

create table if not exists public.outreach_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.outreach_sequences(id) on delete cascade,
  position integer not null check (position between 1 and 20),
  -- Days after the previous email (ignored for the first).
  wait_days integer not null default 3 check (wait_days between 0 and 60),
  -- Required on the first email. Left empty on a follow-up, it's sent as a reply in the
  -- same thread ("Re: <first subject>"); filled in, it starts a new thread.
  subject text check (subject is null or char_length(subject) <= 200),
  body text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deferred so outreach_save_sequence can renumber steps in one transaction.
  constraint outreach_steps_position unique (sequence_id, position) deferrable initially deferred
);

-- ---------------------------------------------------------------------------------------
-- Enrolments: one prospect working through one sequence
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.outreach_sequences(id) on delete cascade,
  prospect_id uuid not null references public.outreach_prospects(id) on delete cascade,
  -- The mailbox the thread started from; follow-ups stay on it.
  mailbox_id uuid references public.outreach_mailboxes(id) on delete set null,
  status text not null default 'active' check (status in (
    'active', 'paused', 'error', 'completed', 'replied', 'bounced', 'unsubscribed', 'stopped'
  )),
  status_detail text,
  last_step_position integer not null default 0 check (last_step_position >= 0),
  -- When the next email becomes due. It goes out at the first moment after this that's
  -- inside the sequence's sending hours and the mailbox has capacity.
  next_send_at timestamptz not null default now(),
  gmail_thread_id text,
  thread_subject text,
  -- Message-IDs sent so far, for the In-Reply-To/References headers that keep follow-ups
  -- threaded in the prospect's inbox.
  rfc_message_ids text[] not null default '{}',
  last_sent_at timestamptz,
  finished_at timestamptz,
  enrolled_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_enrollments_once unique (sequence_id, prospect_id)
);

-- A prospect is only ever in one sequence at a time.
create unique index if not exists outreach_enrollments_one_in_flight
  on public.outreach_enrollments (prospect_id) where status in ('active', 'paused', 'error');
create index if not exists outreach_enrollments_due
  on public.outreach_enrollments (next_send_at) where status = 'active';
create index if not exists outreach_enrollments_thread
  on public.outreach_enrollments (gmail_thread_id) where gmail_thread_id is not null;
create index if not exists outreach_enrollments_sequence on public.outreach_enrollments (sequence_id, status);

-- ---------------------------------------------------------------------------------------
-- Messages: every email sent, and every reply, auto-reply and bounce received
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid references public.outreach_mailboxes(id) on delete set null,
  prospect_id uuid references public.outreach_prospects(id) on delete cascade,
  enrollment_id uuid references public.outreach_enrollments(id) on delete set null,
  sequence_id uuid references public.outreach_sequences(id) on delete set null,
  step_position integer,
  direction text not null check (direction in ('outbound', 'inbound')),
  kind text not null check (kind in ('sequence', 'test', 'reply', 'auto_reply', 'bounce')),
  from_email text,
  to_email text,
  subject text,
  body text,
  snippet text,
  gmail_message_id text,
  gmail_thread_id text,
  occurred_at timestamptz not null default now(),
  -- Replies: when someone dealt with it in /admin.
  handled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists outreach_messages_gmail_id
  on public.outreach_messages (mailbox_id, gmail_message_id) where gmail_message_id is not null;
create index if not exists outreach_messages_prospect on public.outreach_messages (prospect_id, occurred_at desc);
create index if not exists outreach_messages_mailbox on public.outreach_messages (mailbox_id, direction, occurred_at desc);
create index if not exists outreach_messages_kind on public.outreach_messages (kind, occurred_at desc);

-- ---------------------------------------------------------------------------------------
-- Worker bookkeeping (service role only, except that staff can see when it last ran)
-- ---------------------------------------------------------------------------------------

create table if not exists public.outreach_worker_state (
  id boolean primary key default true check (id),
  locked_until timestamptz,
  last_run_at timestamptz,
  last_run_summary jsonb,
  last_error text
);

insert into public.outreach_worker_state (id) values (true) on conflict (id) do nothing;

-- Whether a domain has mail servers, checked before a prospect's first email.
create table if not exists public.outreach_domain_checks (
  domain text primary key,
  accepts_mail boolean not null,
  checked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------

drop trigger if exists outreach_mailboxes_touch on public.outreach_mailboxes;
create trigger outreach_mailboxes_touch before update on public.outreach_mailboxes
  for each row execute function public.touch_updated_at();

drop trigger if exists outreach_prospects_touch on public.outreach_prospects;
create trigger outreach_prospects_touch before update on public.outreach_prospects
  for each row execute function public.touch_updated_at();

drop trigger if exists outreach_sequences_touch on public.outreach_sequences;
create trigger outreach_sequences_touch before update on public.outreach_sequences
  for each row execute function public.touch_updated_at();

drop trigger if exists outreach_steps_touch on public.outreach_steps;
create trigger outreach_steps_touch before update on public.outreach_steps
  for each row execute function public.touch_updated_at();

drop trigger if exists outreach_enrollments_touch on public.outreach_enrollments;
create trigger outreach_enrollments_touch before update on public.outreach_enrollments
  for each row execute function public.touch_updated_at();

-- Stamps finished_at, and stops staff from restarting an enrolment that already ended (a
-- prospect who replied or opted out must never get the next follow-up by accident).
-- SECURITY INVOKER: current_user has to be the caller's role.
create or replace function public.outreach_enrollment_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if old.status in ('completed', 'replied', 'bounced', 'unsubscribed', 'stopped')
     and new.status in ('active', 'paused', 'error')
     and current_user in ('anon', 'authenticated') then
    raise exception 'This prospect has already finished this sequence.'
      using errcode = '22023';
  end if;
  if new.status in ('completed', 'replied', 'bounced', 'unsubscribed', 'stopped') then
    new.finished_at := coalesce(new.finished_at, now());
  else
    new.finished_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists outreach_enrollments_status on public.outreach_enrollments;
create trigger outreach_enrollments_status before update of status on public.outreach_enrollments
  for each row execute function public.outreach_enrollment_status_change();

-- Adding an address or domain to the do-not-contact list ends its enrolments at once, and
-- records the outcome on the prospect. SECURITY DEFINER: staff can add to the list but can
-- only change an enrolment's status columns themselves.
create or replace function public.outreach_apply_suppression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  whole_domain boolean := position('@' in new.value) = 0;
begin
  update public.outreach_enrollments e
     set status = case new.reason when 'bounced' then 'bounced' when 'unsubscribed' then 'unsubscribed' else 'stopped' end,
         status_detail = case new.reason
           when 'bounced' then null
           when 'unsubscribed' then 'Asked not to be contacted'
           else 'On the do-not-contact list'
         end
    from public.outreach_prospects p
   where p.id = e.prospect_id
     and e.status in ('active', 'paused', 'error')
     and (case when whole_domain then p.email_domain = new.value else p.email = new.value end);

  if not whole_domain and new.reason in ('bounced', 'unsubscribed', 'not_interested') then
    update public.outreach_prospects
       set status = new.reason
     where email = new.value and status <> 'customer';
  end if;
  return null;
end;
$$;

drop trigger if exists outreach_suppressions_apply on public.outreach_suppressions;
create trigger outreach_suppressions_apply after insert on public.outreach_suppressions
  for each row execute function public.outreach_apply_suppression();

-- ---------------------------------------------------------------------------------------
-- Staff functions (SECURITY INVOKER: row level security applies as usual)
-- ---------------------------------------------------------------------------------------

-- Saves a sequence's settings and its full list of emails in one go. p_steps is the new
-- list in order: [{ id?, wait_days, subject, body }]; steps not in it are deleted. Emails
-- already sent to prospects who are still in the sequence can be edited but not removed or
-- moved, so nobody skips or repeats an email. Returns the sequence id (new when
-- p_sequence_id is null).
create or replace function public.outreach_save_sequence(p_sequence_id uuid, p_settings jsonb, p_steps jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  seq_id uuid := p_sequence_id;
  max_sent integer;
  step jsonb;
  step_id uuid;
  new_pos integer := 0;
  old_pos integer;
  kept uuid[] := '{}';
  removed record;
begin
  if not public.is_staff() then
    raise exception 'Only staff can edit sequences' using errcode = '42501';
  end if;
  if jsonb_typeof(p_steps) is distinct from 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'A sequence needs at least one email' using errcode = '22023';
  end if;
  if jsonb_array_length(p_steps) > 20 then
    raise exception 'A sequence can have at most 20 emails' using errcode = '22023';
  end if;

  if seq_id is null then
    insert into public.outreach_sequences (name)
    values (coalesce(nullif(btrim(p_settings->>'name'), ''), 'Untitled sequence'))
    returning id into seq_id;
  end if;

  update public.outreach_sequences s
     set name = coalesce(nullif(btrim(p_settings->>'name'), ''), s.name),
         mailbox_id = case when p_settings ? 'mailbox_id' then nullif(p_settings->>'mailbox_id', '')::uuid else s.mailbox_id end,
         timezone = coalesce(p_settings->>'timezone', s.timezone),
         send_days = coalesce(
           (select array_agg(day::smallint order by day::smallint) from jsonb_array_elements_text(p_settings->'send_days') as day),
           s.send_days),
         send_from = coalesce((p_settings->>'send_from')::time, s.send_from),
         send_until = coalesce((p_settings->>'send_until')::time, s.send_until),
         stop_on_domain_reply = coalesce((p_settings->>'stop_on_domain_reply')::boolean, s.stop_on_domain_reply),
         unsubscribe_link = coalesce((p_settings->>'unsubscribe_link')::boolean, s.unsubscribe_link)
   where s.id = seq_id;
  if not found then
    raise exception 'That sequence no longer exists' using errcode = 'P0002';
  end if;

  select coalesce(max(e.last_step_position), 0) into max_sent
    from public.outreach_enrollments e
   where e.sequence_id = seq_id and e.status in ('active', 'paused', 'error');

  for removed in
    select st.position from public.outreach_steps st
     where st.sequence_id = seq_id
       and st.id not in (
         select nullif(value->>'id', '')::uuid from jsonb_array_elements(p_steps)
          where nullif(value->>'id', '') is not null
       )
  loop
    if removed.position <= max_sent then
      raise exception 'Email % has already gone to prospects who are still in this sequence, so it can''t be removed', removed.position
        using errcode = '22023';
    end if;
  end loop;

  for step in select value from jsonb_array_elements(p_steps) loop
    new_pos := new_pos + 1;
    if new_pos = 1 and coalesce(btrim(step->>'subject'), '') = '' then
      raise exception 'The first email needs a subject' using errcode = '22023';
    end if;
    if coalesce(btrim(step->>'body'), '') = '' then
      raise exception 'Email % is empty', new_pos using errcode = '22023';
    end if;

    step_id := nullif(step->>'id', '')::uuid;
    if step_id is not null then
      select st.position into old_pos from public.outreach_steps st where st.id = step_id and st.sequence_id = seq_id;
      if not found then
        raise exception 'Email % was removed by someone else — reload the page', new_pos using errcode = 'P0002';
      end if;
      if old_pos <> new_pos and least(old_pos, new_pos) <= max_sent then
        raise exception 'Emails that prospects in this sequence have already received can''t be moved'
          using errcode = '22023';
      end if;
      update public.outreach_steps
         set position = new_pos,
             wait_days = case when new_pos = 1 then 0 else coalesce((step->>'wait_days')::integer, 3) end,
             subject = nullif(btrim(step->>'subject'), ''),
             body = step->>'body'
       where id = step_id;
    else
      insert into public.outreach_steps (sequence_id, position, wait_days, subject, body)
      values (
        seq_id,
        new_pos,
        case when new_pos = 1 then 0 else coalesce((step->>'wait_days')::integer, 3) end,
        nullif(btrim(step->>'subject'), ''),
        step->>'body'
      )
      returning id into step_id;
    end if;
    kept := kept || step_id;
  end loop;

  delete from public.outreach_steps st where st.sequence_id = seq_id and st.id <> all (kept);

  -- Re-time follow-ups already waiting, so a changed delay applies to them too.
  update public.outreach_enrollments e
     set next_send_at = e.last_sent_at + make_interval(days => st.wait_days)
    from public.outreach_steps st
   where e.sequence_id = seq_id
     and e.status in ('active', 'paused', 'error')
     and e.last_sent_at is not null
     and st.sequence_id = e.sequence_id
     and st.position = e.last_step_position + 1
     and e.next_send_at is distinct from e.last_sent_at + make_interval(days => st.wait_days);

  return seq_id;
end;
$$;

-- Enrols prospects in a sequence, skipping anyone on the do-not-contact list, anyone whose
-- status means they shouldn't get cold email (they replied, are a customer, bounced…),
-- anyone already in this sequence, and anyone currently in another one.
create or replace function public.outreach_enroll(p_sequence_id uuid, p_prospect_ids uuid[])
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_staff() then
    raise exception 'Only staff can enrol prospects' using errcode = '42501';
  end if;
  if not exists (select 1 from public.outreach_sequences where id = p_sequence_id and status <> 'archived') then
    raise exception 'That sequence doesn''t exist or is archived' using errcode = 'P0002';
  end if;

  with classified as (
    select p.id,
      case
        when public.outreach_is_suppressed(p.email) then 'suppressed'
        when p.status not in ('new', 'contacted') then 'status'
        when exists (
          select 1 from public.outreach_enrollments e where e.prospect_id = p.id and e.sequence_id = p_sequence_id
        ) then 'already'
        when exists (
          select 1 from public.outreach_enrollments e
          where e.prospect_id = p.id and e.status in ('active', 'paused', 'error')
        ) then 'busy'
        else 'ok'
      end as outcome
    from public.outreach_prospects p
    where p.id = any (p_prospect_ids)
  ),
  inserted as (
    insert into public.outreach_enrollments (sequence_id, prospect_id)
    select p_sequence_id, c.id from classified c where c.outcome = 'ok'
    on conflict do nothing
    returning 1
  )
  select jsonb_build_object(
    'added', (select count(*) from inserted),
    'suppressed', (select count(*) from classified where outcome = 'suppressed'),
    'status', (select count(*) from classified where outcome = 'status'),
    'already', (select count(*) from classified where outcome = 'already'),
    'busy', (select count(*) from classified where outcome = 'busy')
  ) into result;
  return result;
end;
$$;

-- Adds tags to many prospects at once (PostgREST can't append to arrays in a bulk update).
create or replace function public.outreach_add_tags(p_ids uuid[], p_tags text[])
returns integer
language sql
set search_path = ''
as $$
  with updated as (
    update public.outreach_prospects p
       set tags = (
         select coalesce(array_agg(distinct tag order by tag), '{}')
           from unnest(p.tags || p_tags) as tag
          where btrim(tag) <> ''
       )
     where p.id = any (p_ids)
    returning 1
  )
  select count(*)::integer from updated;
$$;

create or replace function public.outreach_tag_counts()
returns table (tag text, prospects integer)
language sql
stable
set search_path = ''
as $$
  select tag, count(*)::integer
    from public.outreach_prospects, unnest(tags) as tag
   group by tag
   order by tag;
$$;

-- ---------------------------------------------------------------------------------------
-- Worker functions (service role only)
-- ---------------------------------------------------------------------------------------

-- A lease, so overlapping cron invocations never send the same email twice.
create or replace function public.outreach_claim_worker(p_seconds integer)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.outreach_worker_state
     set locked_until = now() + make_interval(secs => p_seconds)
   where id and (locked_until is null or locked_until < now());
  return found;
end;
$$;

create or replace function public.outreach_finish_worker(p_summary jsonb, p_error text)
returns void
language sql
set search_path = ''
as $$
  update public.outreach_worker_state
     set locked_until = null, last_run_at = now(), last_run_summary = p_summary, last_error = p_error
   where id;
$$;

-- The next emails a mailbox could send, follow-ups first. Sending hours are checked by the
-- worker, which knows each sequence's time zone.
create or replace function public.outreach_due_enrollments(p_mailbox_id uuid, p_limit integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(due)), '[]'::jsonb)
  from (
    select e.id as enrollment_id,
           e.last_step_position,
           e.gmail_thread_id,
           e.thread_subject,
           e.rfc_message_ids,
           e.mailbox_id as thread_mailbox_id,
           s.id as sequence_id,
           s.timezone,
           s.send_days,
           to_char(s.send_from, 'HH24:MI') as send_from,
           to_char(s.send_until, 'HH24:MI') as send_until,
           s.unsubscribe_link,
           st.position as step_position,
           st.subject as step_subject,
           st.body as step_body,
           jsonb_build_object(
             'id', p.id, 'email', p.email, 'first_name', p.first_name, 'last_name', p.last_name,
             'company', p.company, 'title', p.title, 'website', p.website, 'phone', p.phone,
             'linkedin_url', p.linkedin_url, 'city', p.city, 'country', p.country, 'fields', p.fields,
             'status', p.status
           ) as prospect
      from public.outreach_enrollments e
      join public.outreach_sequences s on s.id = e.sequence_id and s.status = 'active'
      join public.outreach_prospects p on p.id = e.prospect_id
      left join public.outreach_steps st on st.sequence_id = s.id and st.position = e.last_step_position + 1
     where e.status = 'active'
       and e.next_send_at <= now()
       and coalesce(e.mailbox_id, s.mailbox_id) = p_mailbox_id
     order by (e.last_step_position > 0) desc, e.next_send_at
     limit p_limit
  ) due;
$$;

-- Records a sent email and moves the enrolment on to its next step (or completes it).
create or replace function public.outreach_record_send(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  enrollment public.outreach_enrollments;
  step_position integer := (p->>'step_position')::integer;
  next_wait integer;
begin
  select * into enrollment from public.outreach_enrollments where id = (p->>'enrollment_id')::uuid for update;
  if not found then
    raise exception 'Enrolment % not found', p->>'enrollment_id';
  end if;

  insert into public.outreach_messages (
    mailbox_id, prospect_id, enrollment_id, sequence_id, step_position, direction, kind,
    from_email, to_email, subject, body, gmail_message_id, gmail_thread_id
  ) values (
    (p->>'mailbox_id')::uuid, enrollment.prospect_id, enrollment.id, enrollment.sequence_id, step_position,
    'outbound', 'sequence', p->>'from_email', p->>'to_email', p->>'subject', p->>'body',
    p->>'gmail_message_id', p->>'gmail_thread_id'
  );

  select st.wait_days into next_wait
    from public.outreach_steps st
   where st.sequence_id = enrollment.sequence_id and st.position = step_position + 1;

  update public.outreach_enrollments
     set last_step_position = step_position,
         mailbox_id = (p->>'mailbox_id')::uuid,
         gmail_thread_id = p->>'gmail_thread_id',
         thread_subject = case when (p->>'new_thread')::boolean then p->>'subject' else thread_subject end,
         rfc_message_ids = case
           when (p->>'new_thread')::boolean then array_remove(array[p->>'rfc_message_id'], null)
           when p->>'rfc_message_id' is null then rfc_message_ids
           else rfc_message_ids || (p->>'rfc_message_id')
         end,
         last_sent_at = now(),
         next_send_at = case when next_wait is null then next_send_at else now() + make_interval(days => next_wait) end,
         status = case when next_wait is null then 'completed' else status end,
         status_detail = case when next_wait is null then 'Sent every email — no reply' else null end
   where id = enrollment.id;

  update public.outreach_prospects
     set status = case when status = 'new' then 'contacted' else status end,
         last_contacted_at = now()
   where id = enrollment.prospect_id;

  update public.outreach_mailboxes
     set next_send_at = now() + make_interval(secs => coalesce((p->>'next_gap_seconds')::integer, 300))
   where id = (p->>'mailbox_id')::uuid;
end;
$$;

-- Records a reply, auto-reply or bounce found in a mailbox and applies its effects:
--   reply      → the enrolment ends as 'replied'; colleagues at the same company stop too
--                (if the sequence says so and it isn't a free-mail domain); an opt-out
--                ("unsubscribe", "remove me"…) also goes on the do-not-contact list
--   auto_reply → kept for reference; the sequence carries on
--   bounce     → the address goes on the do-not-contact list and the enrolment ends
-- Matched by Gmail thread first, then by sender (replies) or failed recipient (bounces).
-- Returns what it did: 'reply', 'unsubscribe', 'auto_reply', 'bounce', 'duplicate' or
-- 'ignored' (not about any prospect).
create or replace function public.outreach_record_inbound(p jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  mailbox uuid := (p->>'mailbox_id')::uuid;
  kind text := p->>'kind';
  enrollment public.outreach_enrollments;
  prospect public.outreach_prospects;
  sequence_stops_domain boolean := false;
  inserted integer;
begin
  if p->>'gmail_thread_id' is not null then
    select * into enrollment from public.outreach_enrollments
     where gmail_thread_id = p->>'gmail_thread_id' and mailbox_id = mailbox
     order by created_at desc limit 1;
  end if;

  if enrollment.id is not null then
    select * into prospect from public.outreach_prospects where id = enrollment.prospect_id;
  else
    select * into prospect from public.outreach_prospects
     where email = lower(coalesce(case when kind = 'bounce' then p->>'failed_recipient' else p->>'from_email' end, ''));
    if prospect.id is null then
      return 'ignored';
    end if;
    select * into enrollment from public.outreach_enrollments
     where prospect_id = prospect.id
     order by (status in ('active', 'paused', 'error')) desc, created_at desc limit 1;
  end if;

  insert into public.outreach_messages (
    mailbox_id, prospect_id, enrollment_id, sequence_id, step_position, direction, kind,
    from_email, to_email, subject, snippet, gmail_message_id, gmail_thread_id, occurred_at
  ) values (
    mailbox, prospect.id, enrollment.id, enrollment.sequence_id, enrollment.last_step_position, 'inbound', kind,
    lower(p->>'from_email'), lower(p->>'to_email'), p->>'subject', p->>'snippet',
    p->>'gmail_message_id', p->>'gmail_thread_id', coalesce((p->>'occurred_at')::timestamptz, now())
  )
  on conflict (mailbox_id, gmail_message_id) where gmail_message_id is not null do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return 'duplicate';
  end if;

  if kind = 'auto_reply' then
    return 'auto_reply';
  end if;

  if kind = 'bounce' then
    if enrollment.id is not null and enrollment.status in ('active', 'paused', 'error', 'completed') then
      update public.outreach_enrollments
         set status = 'bounced', status_detail = null
       where id = enrollment.id;
    end if;
    insert into public.outreach_suppressions (value, reason, note)
    values (prospect.email, 'bounced', 'Bounced: ' || coalesce(p->>'subject', ''))
    on conflict (value) do nothing;
    update public.outreach_prospects set status = 'bounced' where id = prospect.id and status <> 'customer';
    return 'bounce';
  end if;

  -- A reply.
  if enrollment.id is not null and enrollment.status in ('active', 'paused', 'error', 'completed') then
    update public.outreach_enrollments
       set status = 'replied', status_detail = null
     where id = enrollment.id;
    select s.stop_on_domain_reply into sequence_stops_domain
      from public.outreach_sequences s where s.id = enrollment.sequence_id;
  end if;

  update public.outreach_prospects
     set status = case when status in ('new', 'contacted') then 'replied' else status end,
         replied_at = now()
   where id = prospect.id;

  if coalesce(sequence_stops_domain, false) and not coalesce((p->>'free_mail_domain')::boolean, false) then
    update public.outreach_enrollments e
       set status = 'stopped', status_detail = 'A colleague at ' || prospect.email_domain || ' replied'
      from public.outreach_prospects colleague
     where colleague.id = e.prospect_id
       and colleague.email_domain = prospect.email_domain
       and colleague.id <> prospect.id
       and e.status in ('active', 'paused', 'error');
  end if;

  if coalesce((p->>'unsubscribe')::boolean, false) then
    insert into public.outreach_suppressions (value, reason, note)
    values (prospect.email, 'unsubscribed', 'Asked by email: ' || left(coalesce(p->>'snippet', ''), 200))
    on conflict (value) do nothing;
    update public.outreach_prospects set status = 'unsubscribed' where id = prospect.id and status <> 'customer';
    return 'unsubscribe';
  end if;

  return 'reply';
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Reporting views (security_invoker, so the caller's row level security applies)
-- ---------------------------------------------------------------------------------------

create or replace view public.outreach_sequence_stats
with (security_invoker = true) as
select s.id as sequence_id,
       count(e.id)::integer as enrolled,
       count(e.id) filter (where e.status = 'active')::integer as active,
       count(e.id) filter (where e.status = 'paused')::integer as paused,
       count(e.id) filter (where e.status = 'error')::integer as errors,
       count(e.id) filter (where e.status = 'completed')::integer as completed,
       count(e.id) filter (where e.status = 'replied')::integer as replied,
       count(e.id) filter (where e.status = 'bounced')::integer as bounced,
       count(e.id) filter (where e.status in ('unsubscribed', 'stopped'))::integer as stopped,
       count(e.id) filter (where e.last_step_position > 0)::integer as contacted
  from public.outreach_sequences s
  left join public.outreach_enrollments e on e.sequence_id = s.id
 group by s.id;

create or replace view public.outreach_step_stats
with (security_invoker = true) as
select st.sequence_id,
       st.position as step_position,
       (select count(*) from public.outreach_messages m
         where m.sequence_id = st.sequence_id and m.step_position = st.position
           and m.direction = 'outbound' and m.kind = 'sequence')::integer as sent,
       (select count(*) from public.outreach_enrollments e
         where e.sequence_id = st.sequence_id and e.status = 'replied'
           and e.last_step_position = st.position)::integer as replied
  from public.outreach_steps st;

-- ---------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------

alter table public.outreach_mailboxes enable row level security;
alter table public.outreach_mailbox_credentials enable row level security;
alter table public.outreach_prospects enable row level security;
alter table public.outreach_suppressions enable row level security;
alter table public.outreach_sequences enable row level security;
alter table public.outreach_steps enable row level security;
alter table public.outreach_enrollments enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_worker_state enable row level security;
alter table public.outreach_domain_checks enable row level security;

drop policy if exists "Staff can see mailboxes" on public.outreach_mailboxes;
create policy "Staff can see mailboxes"
  on public.outreach_mailboxes for select to authenticated
  using (public.is_staff());

drop policy if exists "Owners and admins can change mailbox settings" on public.outreach_mailboxes;
create policy "Owners and admins can change mailbox settings"
  on public.outreach_mailboxes for update to authenticated
  using (public.is_staff() and (connected_by = auth.uid() or public.is_admin()))
  with check (public.is_staff() and (connected_by = auth.uid() or public.is_admin()));

drop policy if exists "Staff manage prospects" on public.outreach_prospects;
create policy "Staff manage prospects"
  on public.outreach_prospects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff can see the do-not-contact list" on public.outreach_suppressions;
create policy "Staff can see the do-not-contact list"
  on public.outreach_suppressions for select to authenticated
  using (public.is_staff());

drop policy if exists "Staff can add to the do-not-contact list" on public.outreach_suppressions;
create policy "Staff can add to the do-not-contact list"
  on public.outreach_suppressions for insert to authenticated
  with check (public.is_staff());

drop policy if exists "Admins can remove from the do-not-contact list" on public.outreach_suppressions;
create policy "Admins can remove from the do-not-contact list"
  on public.outreach_suppressions for delete to authenticated
  using (public.is_admin());

drop policy if exists "Staff manage sequences" on public.outreach_sequences;
create policy "Staff manage sequences"
  on public.outreach_sequences for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff manage sequence emails" on public.outreach_steps;
create policy "Staff manage sequence emails"
  on public.outreach_steps for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff can see enrolments" on public.outreach_enrollments;
create policy "Staff can see enrolments"
  on public.outreach_enrollments for select to authenticated
  using (public.is_staff());

drop policy if exists "Staff can enrol prospects" on public.outreach_enrollments;
create policy "Staff can enrol prospects"
  on public.outreach_enrollments for insert to authenticated
  with check (public.is_staff());

drop policy if exists "Staff can pause, resume and stop enrolments" on public.outreach_enrollments;
create policy "Staff can pause, resume and stop enrolments"
  on public.outreach_enrollments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff can remove enrolments that haven't sent anything" on public.outreach_enrollments;
create policy "Staff can remove enrolments that haven't sent anything"
  on public.outreach_enrollments for delete to authenticated
  using (public.is_staff() and last_step_position = 0);

drop policy if exists "Staff can see messages" on public.outreach_messages;
create policy "Staff can see messages"
  on public.outreach_messages for select to authenticated
  using (public.is_staff());

drop policy if exists "Staff can mark replies handled" on public.outreach_messages;
create policy "Staff can mark replies handled"
  on public.outreach_messages for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff can see when the worker last ran" on public.outreach_worker_state;
create policy "Staff can see when the worker last ran"
  on public.outreach_worker_state for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------------------
-- Grants (new tables aren't exposed to the Data API without them — not even to the
-- service role)
-- ---------------------------------------------------------------------------------------

revoke all on public.outreach_mailbox_credentials, public.outreach_domain_checks from anon, authenticated;
revoke all on public.outreach_mailboxes, public.outreach_prospects, public.outreach_suppressions,
  public.outreach_sequences, public.outreach_steps, public.outreach_enrollments, public.outreach_messages,
  public.outreach_worker_state, public.outreach_sequence_stats, public.outreach_step_stats
  from anon;

grant select on public.outreach_mailboxes, public.outreach_prospects, public.outreach_suppressions,
  public.outreach_sequences, public.outreach_steps, public.outreach_enrollments, public.outreach_messages,
  public.outreach_worker_state, public.outreach_sequence_stats, public.outreach_step_stats
  to authenticated;
grant insert, update, delete on public.outreach_prospects, public.outreach_sequences, public.outreach_steps
  to authenticated;
grant insert, delete on public.outreach_suppressions, public.outreach_enrollments to authenticated;
-- Column grants keep the worker's bookkeeping (threads, cursors, counters) out of reach.
grant update (status, status_detail, next_send_at) on public.outreach_enrollments to authenticated;
grant update (from_name, signature, status, daily_limit, warmup_enabled, warmup_start, warmup_increment,
  min_gap_seconds, max_gap_seconds) on public.outreach_mailboxes to authenticated;
grant update (handled_at, handled_by) on public.outreach_messages to authenticated;

grant all on public.outreach_mailboxes, public.outreach_mailbox_credentials, public.outreach_prospects,
  public.outreach_suppressions, public.outreach_sequences, public.outreach_steps, public.outreach_enrollments,
  public.outreach_messages, public.outreach_worker_state, public.outreach_domain_checks
  to service_role;
grant select on public.outreach_sequence_stats, public.outreach_step_stats to service_role;

revoke all on function public.outreach_is_suppressed(text) from public;
revoke all on function public.outreach_save_sequence(uuid, jsonb, jsonb) from public;
revoke all on function public.outreach_enroll(uuid, uuid[]) from public;
revoke all on function public.outreach_add_tags(uuid[], text[]) from public;
revoke all on function public.outreach_tag_counts() from public;
grant execute on function public.outreach_is_suppressed(text) to authenticated, service_role;
grant execute on function public.outreach_save_sequence(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.outreach_enroll(uuid, uuid[]) to authenticated;
grant execute on function public.outreach_add_tags(uuid[], text[]) to authenticated;
grant execute on function public.outreach_tag_counts() to authenticated;

revoke all on function public.outreach_claim_worker(integer) from public;
revoke all on function public.outreach_finish_worker(jsonb, text) from public;
revoke all on function public.outreach_due_enrollments(uuid, integer) from public;
revoke all on function public.outreach_record_send(jsonb) from public;
revoke all on function public.outreach_record_inbound(jsonb) from public;
revoke all on function public.outreach_enrollment_status_change() from public;
revoke all on function public.outreach_apply_suppression() from public;
grant execute on function public.outreach_claim_worker(integer) to service_role;
grant execute on function public.outreach_finish_worker(jsonb, text) to service_role;
grant execute on function public.outreach_due_enrollments(uuid, integer) to service_role;
grant execute on function public.outreach_record_send(jsonb) to service_role;
grant execute on function public.outreach_record_inbound(jsonb) to service_role;
