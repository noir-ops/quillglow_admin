import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

/**
 * Edit one monthly limit in plan_limits (main repo, scripts/066).
 * Admin-only: checked here as well as in middleware.
 * Only rows that already exist can be changed — new features are added by a
 * migration alongside the code that meters them.
 *
 *   -1 = no limit · 0 = not included in the plan · n = n per calendar month
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const plan = body?.plan_type
  const feature = body?.feature
  const limit = body?.monthly_limit
  const expected = body?.expected_limit
  if ((plan !== "scholar" && plan !== "genius") || typeof feature !== "string" || !feature) {
    return NextResponse.json({ error: "plan_type and feature are required" }, { status: 400 })
  }
  if (!Number.isInteger(limit) || limit < -1 || limit > 1_000_000) {
    return NextResponse.json({ error: "Limit must be a whole number from -1 to 1,000,000" }, { status: 400 })
  }
  if (!Number.isInteger(expected) || expected < -1) return NextResponse.json({ error: "Reload the limits before saving" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("update_plan_limit", {
    p_actor_id: user.id, p_plan: plan, p_feature: feature, p_limit: limit, p_expected_limit: expected,
  })
  if (error) {
    const status = error.code === "40001" ? 409 : error.code === "P0002" ? 404 : error.code === "22023" ? 400 : 503
    console.error("[plan-limits] update failed:", error.message)
    return NextResponse.json({ error: status < 500 ? error.message : "Could not save the limit. Check the Phase 1 migration and try again." }, { status })
  }
  return NextResponse.json(data)
}
