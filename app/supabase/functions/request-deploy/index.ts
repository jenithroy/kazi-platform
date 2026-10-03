// Supabase Edge Function: lets staff rebuild the static site from /admin ("Publish site").
//
// The Cloudflare Pages deploy hook URL stays a function secret — anyone holding it can
// trigger builds, so it never reaches the browser. Deploy with:
//   supabase functions deploy request-deploy
//   supabase secrets set CLOUDFLARE_DEPLOY_HOOK_URL=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/…
// SUPABASE_URL and SUPABASE_ANON_KEY are provided to every function automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cloudflare queues every hook call as a full build; this stops double clicks queuing two.
const MIN_SECONDS_BETWEEN_PUBLISHES = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Act as the caller, so row level security applies exactly as it does in /admin.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: isStaff, error: roleError } = await supabase.rpc("is_staff");
  if (roleError || isStaff !== true) return json({ error: "Only staff accounts can publish the site." }, 403);

  const hookUrl = Deno.env.get("CLOUDFLARE_DEPLOY_HOOK_URL");
  if (!hookUrl) {
    return json(
      { error: "Publishing isn't set up yet: the CLOUDFLARE_DEPLOY_HOOK_URL secret is missing (see docs/seo-admin.md)." },
      500,
    );
  }

  const { data: recent } = await supabase
    .from("site_deploys")
    .select("created_at")
    .eq("ok", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const last = recent?.[0]?.created_at;
  if (last && Date.now() - new Date(last).getTime() < MIN_SECONDS_BETWEEN_PUBLISHES * 1000) {
    return json({ error: "A publish started less than a minute ago. Try again shortly so the next build includes your latest edits." }, 429);
  }

  let ok = false;
  let message: string;
  try {
    const response = await fetch(hookUrl, { method: "POST" });
    ok = response.ok;
    message = ok ? "Build started on Cloudflare Pages" : `Cloudflare responded with ${response.status}`;
  } catch (error) {
    message = `Couldn't reach Cloudflare: ${error instanceof Error ? error.message : String(error)}`;
  }

  const { error: logError } = await supabase.from("site_deploys").insert({ ok, message });
  if (logError) console.error("Couldn't record the publish", logError);

  return json({ ok, message }, ok ? 200 : 502);
});
