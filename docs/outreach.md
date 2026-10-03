# Outreach

`/admin/outreach` sends personal email sequences to brands Kazi wants to work with. They go out from staff members' own Google Workspace mailboxes, so they sit in Sent like any other email and replies arrive in the normal inbox:

- **Prospects**: the people to contact. Import a CSV, or add them one at a time. Any extra column (for example an icebreaker line written for each person) can be used in emails.
- **Sequences**: a first email and a few follow-ups, sent days apart. Each follow-up replies in the same thread. Emails can be personalised, previewed for any prospect and sent to yourself as a test.
- **Replies**: everything prospects send back, with buttons to record the outcome (interested, meeting booked, not interested).
- **Mailboxes**: the connected Google accounts, each with its sender name, signature, daily limit and warm-up.
- **Do not contact**: addresses and whole domains that are never emailed. Unsubscribes, bounces and "remove me" replies are added automatically.

It uses no paid email service. Google Workspace sends the mail through the Gmail API, which is free. The rest runs on the existing Supabase project.

## How it works

```
/admin/outreach ──reads/writes──▶ Supabase (prospects, sequences, enrolments, messages)
      │                                   ▲
      └─ connect / test ─▶ outreach-api ──┤
                                          │
pg_cron, every minute ─▶ outreach-worker ─┴─▶ Gmail API (each connected mailbox)
                                                 │
 prospect clicks "unsubscribe" ─▶ outreach-unsubscribe
```

Every minute, the worker does two things for each connected mailbox:

1. **Reads the new mail.** It goes through the mail that arrived since its last run, using Gmail's history, and matches it to prospects by thread or sender:
   - **Reply**: ends that prospect's sequence. With "Stop for the whole company" on, it also ends the sequences of everyone else at the same domain. Gmail, Outlook and other free-mail addresses don't count as a company.
   - **Reply asking to stop** ("unsubscribe", "remove me", "not interested, please stop", …): also adds the address to the do-not-contact list.
   - **Out-of-office reply**: recorded, and the sequence carries on.
   - **Bounce**: ends the sequence and adds the address to the do-not-contact list.
2. **Sends the next email that's due**, at most one per mailbox per minute. An email only goes out when all of these hold:
   - It's inside the sequence's sending days and hours, in the sequence's time zone.
   - The mailbox is under its limit for the last 24 hours.
   - The mailbox's random pause since its previous email is over (4–10 minutes by default).

   Follow-ups take priority over first emails. Before a prospect's first email, the worker checks that their domain can receive email at all.

The worker doesn't track opens or clicks. Tracking pixels and rewritten links make cold email look like marketing and push it toward spam. Replies are the measure that counts.

**Who can do what.** Staff accounts (`employee` and `admin`) can use everything. A mailbox's settings can only be changed or disconnected by whoever connected it, or by an admin. Only admins can take someone off the do-not-contact list. Row level security in `app/supabase/migrations/008_outreach.sql` enforces this.

## Setup

### 1. Fix the domain's email authentication first

This step matters for every email the company sends from Google Workspace, not just outreach. On 2 October 2026, kazimanufacturing.com's DNS had:

| Record | Current value | Problem |
| --- | --- | --- |
| SPF (`TXT` on `kazimanufacturing.com`) | `v=spf1 include:spf.forwardemail.net -all` | Doesn't include Google, and `-all` tells receivers to reject anything else. Google Workspace mail **fails SPF**. |
| DMARC (`TXT` on `_dmarc`) | none | Gmail and Yahoo expect one from bulk senders, and its absence costs trust. |
| DKIM (`TXT` on `google._domainkey`) | present | Fine, as long as signing is switched on (below). |

The MX record already points to Google (`smtp.google.com`), so the ForwardEmail settings are leftovers. In Cloudflare, go to **DNS → Records** for kazimanufacturing.com:

1. Edit the SPF TXT record to read `v=spf1 include:_spf.google.com ~all`. If anything else sends mail as @kazimanufacturing.com, add its `include:` too. There must only ever be one SPF record.
2. Add a TXT record named `_dmarc` with `v=DMARC1; p=none; rua=mailto:dmarc@kazimanufacturing.com`. Create that address, or point the reports at a mailbox someone reads. After a few weeks of clean reports, change `p=none` to `p=quarantine`.
3. In the Google Admin console, go to **Apps → Google Workspace → Gmail → Authenticate email**. Check that kazimanufacturing.com says **Authenticating email with DKIM**. If it doesn't, press **Start authentication**.

To check the result, send an email to a Gmail address and choose **⋮ → Show original**. SPF, DKIM and DMARC should all read `PASS`.

### 2. Apply the database migration

In the Supabase SQL Editor, run `app/supabase/migrations/008_outreach.sql`. It needs 007, so run that first if it hasn't been applied.

### 3. Create the Google OAuth client

Do this signed in with a Kazi Google Workspace account, so the project belongs to the Workspace organisation.

1. In [Google Cloud console](https://console.cloud.google.com/), create a project, e.g. "Kazi Outreach".
2. Go to **APIs & Services → Library**, search for **Gmail API** and enable it.
3. Go to **APIs & Services → OAuth consent screen** (called **Google Auth Platform** in newer consoles):
   - Choose **Internal** as the user type. Only accounts in your Workspace can connect, and Google doesn't need to review the app.
   - App name: "Kazi Outreach". Use your own email for both contact addresses.
4. Go to **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: `https://kazimanufacturing.com/admin/outreach/connect/`. Add `http://localhost:3000/admin/outreach/connect/` as well for local development.
   - Copy the **client ID** and **client secret**.

### 4. Deploy the edge functions

With the [Supabase CLI](https://supabase.com/docs/guides/cli) logged in, run this from `app/`. `<ref>` is the project ref, the `oiychkunnhzmtouolmdv` part of the Supabase URL.

```sh
supabase secrets set --project-ref <ref> \
  GOOGLE_CLIENT_ID='<client id>' \
  GOOGLE_CLIENT_SECRET='<client secret>' \
  OUTREACH_SECRET="$(openssl rand -base64 48)" \
  OUTREACH_CRON_SECRET="$(openssl rand -hex 32)" \
  OUTREACH_SITE_URL='https://kazimanufacturing.com'

supabase functions deploy outreach-api --project-ref <ref>
supabase functions deploy outreach-worker --no-verify-jwt --project-ref <ref>
supabase functions deploy outreach-unsubscribe --no-verify-jwt --project-ref <ref>
```

Note down `OUTREACH_CRON_SECRET` for step 5. Run `supabase secrets list` to see the names, but not the values.

- `OUTREACH_SECRET` encrypts the stored Google tokens and signs unsubscribe links. If you ever change it, every mailbox has to be reconnected and links in emails already sent stop working.
- `outreach-worker` and `outreach-unsubscribe` are called without a user session: one by the scheduler, the other by mail apps' one-click unsubscribe. `supabase/config.toml` turns JWT checks off for both. They check the cron secret and the signed link instead.

Without the CLI, use **Edge Functions → Deploy a new function** for each folder and **Edge Functions → Secrets** for the secrets. In each function's settings, turn off **Enforce JWT verification** for the worker and the unsubscribe function. The editor needs the files in `supabase/functions/_shared/outreach/` too, so the CLI is easier.

### 5. Schedule the worker

In the SQL Editor, replace the two placeholders and run:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<OUTREACH_CRON_SECRET>', 'outreach_cron_secret');

select cron.schedule('outreach-worker', '* * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/outreach-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-outreach-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'outreach_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
```

The Outreach overview's **Worker** card shows when the worker last ran. You can also run `select * from cron.job_run_details order by start_time desc limit 5;` and look at **Edge Functions → outreach-worker → Logs**. To stop all sending at once, run `select cron.unschedule('outreach-worker');`.

### 6. Connect mailboxes

Each person who'll send outreach goes to **/admin/outreach → Mailboxes → Connect a Google account** and signs in. Google asks for permission to send email and to read mail. Outreach only reads metadata and the opening snippet of new messages, to spot replies, bounces and out-of-office messages from prospects.

After connecting, set the **sender name** and a plain-text **signature**. For prospects in the US, include the company's postal address in the signature (see Rules below).

### 7. Before the first send

- Add a section about prospecting to the privacy policy. Suggested wording is under Rules below.
- Write a sequence, preview it for a few real prospects, and use **Send me a test** on each email.
- Start small. Warm-up is on by default: 10 emails a day, then 5 more each day up to the daily limit.

## Writing emails that get replies

- **Keep the first email short**: under about 125 words, one point, one question. Leave follow-ups to two or three sentences.
- **Personalise it.** Use `{{first_name}}` and `{{company}}`, and ideally a line written for each person, imported as a column such as `icebreaker`. Write icebreakers as full sentences, ending with a full stop.
- **Use plain text, with at most one link**, and no images or attachments. The editor's checks flag these.
- **Leave follow-ups' subject empty**, so they reply in the same thread.
- **Say how to opt out**, e.g. "If this isn't relevant, just let me know and I won't follow up." Alternatively, switch on the sequence's unsubscribe link.

**Personalisation:**

| Write | Becomes |
| --- | --- |
| `{{first_name}}` | Anna. If it's empty, the email isn't sent, and the enrolment shows *Needs attention*. |
| `{{first_name\|there}}` | Anna, or "there" when there's no first name |
| `{{company}}`, `{{title}}`, `{{website}}`, `{{city}}`, `{{country}}`, `{{last_name}}` | The prospect's details |
| `{{icebreaker}}` | Any imported column, by its name in lower case with underscores |
| `{{sender_first_name}}`, `{{sender_name}}` | From the mailbox's sender name |
| `{{random: Hi\|Hello\|Hey}}` | One option picked per prospect, so emails aren't identical |

## Keeping mailboxes healthy

- **Volume.** Workspace allows around 2,000 emails a day per account, but cold outreach should stay at 30–50 per mailbox. For more volume, add mailboxes rather than raising limits.
- **Warm-up.** A new mailbox starts low and ramps up automatically. Leave it on.
- **Bounce rate.** Keep it under 3%. The overview warns when it isn't. Old or scraped lists bounce, so check them with an email verifier before importing.
- **Watch Gmail's spam signals** in [Google Postmaster Tools](https://postmaster.google.com/) once volume grows.
- **Optional: a separate sending domain.** Some teams send outreach from a second domain, such as kazi-manufacturing.com, so a reputation problem can't touch the main domain's customer email. That costs a domain and a Workspace user, and needs its own SPF, DKIM and DMARC.

## Rules

This is a summary, not legal advice. Check with an adviser before emailing new countries.

- **UK:** emailing people at companies (limited companies, LLPs, public bodies) doesn't need their prior consent under PECR. Every email must say who it's from and give a working way to opt out. Sole traders and most partnerships count as individuals and do need consent. UK GDPR still applies to their names and work addresses:
  - Rely on legitimate interests.
  - Keep only what's needed.
  - Tell people about it (the privacy policy wording below).
  - Stop when anyone objects. Outreach does this automatically with the do-not-contact list.
- **EU:** this varies. Germany and several other countries require consent even for B2B email, so leave them out unless an adviser says otherwise.
- **US (CAN-SPAM):**
  - Honour opt-outs.
  - Don't use misleading subjects. Never start a first email with "Re:"; the editor flags this.
  - Include a postal address. Put it in the signature.
- **Canada and Australia:** these need consent. A business address published together with the person's role can count as implied consent in some cases. Check before emailing.

Suggested addition to the privacy policy:

> **Business prospecting.** We sometimes email people at businesses that might need clothing manufacturing, using business contact details that are publicly available or that were shared with us (for example on a company website or LinkedIn). We rely on our legitimate interest in finding new customers. We keep only what we need: your name, role, company, work email, and a record of the emails we've exchanged. You can ask us to stop at any time by replying "unsubscribe", using the link in our email, or writing to hello@kazimanufacturing.com. We'll keep your address on a do-not-contact list so you aren't contacted again.

## Troubleshooting

| What you see | What to do |
| --- | --- |
| Mailbox says *Reconnect needed* | The account's password changed, or access was removed in the Google account. Connect it again. Sequences and history are kept. |
| "Gmail's daily sending limit … was reached" | Sending resumes by itself after a few hours. Lower the mailbox's daily limit. |
| Overview says the worker hasn't run | Check the pg_cron job (step 5) and `cron.job_run_details`. Make sure the vault secret matches `OUTREACH_CRON_SECRET`. |
| Google shows `redirect_uri_mismatch` | The redirect URI in step 3 must exactly match the address the admin is opened at, including the trailing slash. |
| Google shows `org_internal` or "access blocked" | You're signing in with an account outside the Workspace. Use your company account. |
| "Couldn't reach the outreach-api function" | The functions aren't deployed, or the site's Supabase URL is wrong (step 4). |
| An enrolment says *Needs attention* | The message says why: usually a missing `{{variable}}` for that prospect. Fill it in, or add a fallback, then press **Retry**. |

## What's stored

- Prospects' details and tags.
- Every email sent, including its text.
- For replies, auto-replies and bounces: the sender, subject and Gmail's short snippet. Mail that isn't about a prospect isn't stored.
- The do-not-contact list.
- Google refresh and access tokens, AES-GCM encrypted. They're kept in a table only the edge functions can read, not even admins.

Disconnecting a mailbox revokes Google access. The mailbox's history stays, so past emails still show who sent them.
