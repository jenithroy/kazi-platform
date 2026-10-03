// Supabase Edge Function: the outreach worker, called every minute by pg_cron (see
// docs/outreach.md). Reads new replies and bounces, then sends whatever is due.
//
// It isn't called with a user session, so JWT verification is off for it (supabase/config.toml)
// and it checks the shared OUTREACH_CRON_SECRET header instead.

import { ConfigError, secretsMatch } from "../_shared/outreach/crypto.ts";
import { errorMessage, json, serviceClient } from "../_shared/outreach/http.ts";
import { runWorker } from "../_shared/outreach/worker.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("OUTREACH_CRON_SECRET") ?? "";
  if (!expected) return json({ error: "The OUTREACH_CRON_SECRET function secret isn't set." }, 503);
  if (!secretsMatch(req.headers.get("x-outreach-cron-secret") ?? "", expected)) return json({ error: "Forbidden" }, 403);

  try {
    return json(await runWorker(serviceClient()));
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, error instanceof ConfigError ? 503 : 500);
  }
});
