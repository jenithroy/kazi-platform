// Write operations against Meta — pausing, resuming and re-budgeting live ads.
//
// This is the only part of the module that spends money, so it is deliberately narrow:
// a fixed list of operations, only on entities the ERP has already synced, with budget
// ceilings, and every call written to audit_logs.

import { requireStaff, writeAuditLog } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/db.ts";
import { fromMinorUnits, toMinorUnits } from "../_shared/graph.ts";
import { handler, json, PublicError } from "../_shared/http.ts";
import { deactivateOnTokenError, graphForAccount } from "../_shared/tokens.ts";

type Level = "campaign" | "adset" | "ad";

const TABLE: Record<Level, string> = {
  campaign: "meta_campaigns",
  adset: "meta_adsets",
  ad: "meta_ads",
};

// A fat-fingered daily budget is an irreversible spend, so there is a hard ceiling in
// account currency. Raise it deliberately via the function secret, not in a hurry.
const MAX_DAILY_BUDGET = Number(Deno.env.get("META_MAX_DAILY_BUDGET") ?? 2000);
// Beyond this multiple of the current budget the caller must pass acknowledge_large_change,
// which the UI turns into a confirmation step — it catches "500" typed as "5000".
const LARGE_CHANGE_FACTOR = 3;

/**
 * Confirms the entity is one the ERP already knows about. Without this check the request
 * body could name any object id in any ad account the token can reach, and the ERP would
 * happily pause a stranger's campaign.
 */
async function loadEntity(db: ReturnType<typeof serviceClient>, level: Level, id: string) {
  const columns = level === "ad"
    ? "id, name, account_id, status"
    : "id, name, account_id, status, daily_budget, lifetime_budget";
  const { data } = await db.from(TABLE[level]).select(columns).eq("id", id).maybeSingle();
  if (!data) {
    throw new PublicError(
      `Unknown ${level} ${id} — run a sync first so the ERP knows about it`,
      404,
    );
  }
  return data as Record<string, unknown>;
}

Deno.serve(handler(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method !== "POST") throw new PublicError("Use POST", 405);

  const db = serviceClient();
  const body = await req.json().catch(() => ({}));
  const op = String(body.op ?? "");
  const level = String(body.level ?? "") as Level;
  const id = String(body.id ?? "");

  if (!TABLE[level]) throw new PublicError("level must be campaign, adset or ad", 400);
  if (!id) throw new PublicError("Missing entity id", 400);

  // Pausing is reversible and part of day-to-day work, so employees can do it; changing
  // what gets spent is an admin decision.
  const actor = await requireStaff(req, db, { admin: op === "set_budget" });
  const entity = await loadEntity(db, level, id);

  try {
    const graph = await graphForAccount(db);

    if (op === "set_status") {
      const status = String(body.status ?? "").toUpperCase();
      if (!["ACTIVE", "PAUSED"].includes(status)) {
        // Archive and delete are intentionally not exposed: they are effectively
        // irreversible in Ads Manager and have no place behind a table row toggle.
        throw new PublicError("status must be ACTIVE or PAUSED", 400);
      }

      await graph.request(id, { method: "POST", params: { status } });
      await db.from(TABLE[level]).update({ status, effective_status: status }).eq("id", id);

      await writeAuditLog(db, {
        user_id: actor.id,
        action: `meta_ads.${status === "ACTIVE" ? "resume" : "pause"}_${level}`,
        resource: TABLE[level],
        resource_id: id,
        details: { name: entity.name, from: entity.status, to: status },
      });

      return json({ id, status }, 200, origin);
    }

    if (op === "set_budget") {
      if (level === "ad") throw new PublicError("Ads do not carry a budget", 400);
      const field = body.field === "lifetime_budget" ? "lifetime_budget" : "daily_budget";
      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new PublicError("amount must be a positive number", 400);
      }
      if (field === "daily_budget" && amount > MAX_DAILY_BUDGET) {
        throw new PublicError(
          `Daily budget above the configured ceiling of ${MAX_DAILY_BUDGET}. Change it in Ads Manager if this is intended.`,
          400,
        );
      }

      const current = Number(entity[field] ?? 0);
      if (current > 0 && amount > current * LARGE_CHANGE_FACTOR && !body.acknowledge_large_change) {
        throw new PublicError(
          `That is more than ${LARGE_CHANGE_FACTOR}× the current ${field.replace("_", " ")} (${current}). Confirm to continue.`,
          409,
        );
      }

      // Meta expects minor units. Sending major units here would multiply every budget in
      // the account by 100 — this conversion is the whole reason budgets are normalised on
      // the way in, too.
      await graph.request(id, { method: "POST", params: { [field]: toMinorUnits(amount) } });

      // Read back rather than trusting the write: Meta silently adjusts budgets that fall
      // below the account minimum, and the ERP should show what is actually set.
      const fresh = await graph.request<Record<string, string>>(id, {
        params: { fields: "daily_budget,lifetime_budget,status,effective_status" },
      });
      await db
        .from(TABLE[level])
        .update({
          daily_budget: fromMinorUnits(fresh.daily_budget),
          lifetime_budget: fromMinorUnits(fresh.lifetime_budget),
          effective_status: fresh.effective_status ?? null,
        })
        .eq("id", id);

      await writeAuditLog(db, {
        user_id: actor.id,
        action: `meta_ads.set_${field}`,
        resource: TABLE[level],
        resource_id: id,
        details: { name: entity.name, from: current, to: amount },
      });

      return json(
        { id, daily_budget: fromMinorUnits(fresh.daily_budget), lifetime_budget: fromMinorUnits(fresh.lifetime_budget) },
        200,
        origin,
      );
    }

    throw new PublicError(`Unknown op "${op}"`, 400);
  } catch (err) {
    await deactivateOnTokenError(db, err);
    throw err;
  }
}));
