import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Edit one monthly limit in plan_limits (main repo, scripts/066).
 * Admin-only: enforced by the middleware (lib/auth/admin.ts).
 * Only rows that already exist can be changed — new features are added by a
 * migration alongside the code that meters them.
 *
 *   -1 = no limit · 0 = not included in the plan · n = n per calendar month
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const plan = body?.plan_type
  const feature = body?.feature
  const limit = Number(body?.monthly_limit)
  if ((plan !== "scholar" && plan !== "genius") || typeof feature !== "string" || !feature) {
    return NextResponse.json({ error: "plan_type and feature are required" }, { status: 400 })
  }
  if (!Number.isInteger(limit) || limit < -1 || limit > 1_000_000) {
    return NextResponse.json({ error: "Limit must be a whole number from -1 to 1,000,000" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from("plan_limits")
    .select("monthly_limit")
    .eq("plan_type", plan)
    .eq("feature", feature)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: "Unknown feature for this plan" }, { status: 404 })

  const { error } = await admin
    .from("plan_limits")
    .update({ monthly_limit: limit })
    .eq("plan_type", plan)
    .eq("feature", feature)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "admin",
    action: "plan_limit.update",
    resource_type: "plan_limit",
    resource_id: `${plan}:${feature}`,
    before_state: { monthly_limit: row.monthly_limit },
    after_state: { monthly_limit: limit },
  })
  if (auditError) console.error("[plan-limits] audit log failed:", auditError.message)

  return NextResponse.json({ ok: true, plan_type: plan, feature, monthly_limit: limit })
}
