import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser } from "@/lib/auth/admin"
import { readBillingRollout, publicPricing } from "@/lib/billing/pricing"
import { collectRolloutEvidence, verifyProducts, polarEnvironment } from "@/lib/billing/rollout-validation"
import { createSubscriptionCheckout } from "@/lib/polar"
export const dynamic = "force-dynamic"
async function context() {
  const client = await createClient(), { data: { user } } = await client.auth.getUser()
  if (!user || !(await isAdminUser(client, user))) return null
  return { user, admin: createAdminClient() }
}
export async function GET() {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const config = await readBillingRollout(ctx.admin)
    const { data: evidence, error } = await ctx.admin.from("billing_rollout_evidence").select("*").eq("revision", config.revision).eq("environment", polarEnvironment())
    if (error) throw error
    return NextResponse.json({ config, pricing: publicPricing(config), environment: polarEnvironment(), evidence,
      legacyProductHint: process.env.POLAR_PRODUCT_ID_GENIUS || null }, { headers: { "Cache-Control": "private, no-store" } })
  } catch { return NextResponse.json({ error: "Apply the Phases 2/3 migration and check database access" }, { status: 503 }) }
}
export async function POST(req: Request) {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Action required" }, { status: 400 })
  if (["configure", "verify", "publish"].includes(body.action) && !Number.isInteger(body.revision)) return NextResponse.json({ error: "Reload the configuration before continuing" }, { status: 400 })
  try {
    const config = await readBillingRollout(ctx.admin), environment = polarEnvironment()
    if (!config.revision) throw new Error("Apply the Phases 2/3 migration first")
    if (body.action === "configure") {
      for (const id of [body.config?.legacy_product_id, body.config?.monthly_product_id, body.config?.annual_product_id]) {
        if (id && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Product IDs must be Polar UUIDs")
      }
      await verifyProducts({ ...config, ...body.config })
      const { data, error } = await ctx.admin.rpc("configure_billing_rollout", { p_actor: ctx.user.id, p_expected_revision: body.revision, p_config: { ...body.config, environment } })
      if (error) throw error
      return NextResponse.json({ ok: true, config: data })
    }
    if (body.action === "test_checkout") {
      if (!["month", "year"].includes(body.interval) || typeof body.testUserId !== "string") throw new Error("Select an interval and an existing test user")
      await verifyProducts(config)
      const { data: target, error } = await ctx.admin.auth.admin.getUserById(body.testUserId)
      if (error || !target?.user?.email_confirmed_at) throw new Error("Use an existing verified test account")
      const { data: existingPlan, error: existingPlanError } = await ctx.admin.rpc("user_plan", { p_user_id: target.user.id })
      if (existingPlanError || existingPlan !== "scholar") throw new Error("Choose a test account without existing Genius access")
      const site = new URL(process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.quillglow.com")
      if (site.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(site.hostname)) throw new Error("Invalid main site URL")
      const checkout = await createSubscriptionCheckout((body.interval === "year" ? config.annual_product_id : config.monthly_product_id)!, target.user.id,
        target.user.email, `${site.origin}/upgrade/success?checkout_id={CHECKOUT_ID}`, body.interval)
      return NextResponse.json({ url: checkout.url, checkoutId: checkout.id,
        note: "Creating a link does not charge the account. Complete it manually in the indicated Polar environment." })
    }
    if (body.action === "verify") {
      if (body.revision !== config.revision) throw { code: "40001", message: "Configuration changed. Reload before verifying." }
      const results = await collectRolloutEvidence(ctx.admin, config, body)
      const { error } = await ctx.admin.from("billing_rollout_evidence").upsert(results.map((r) => ({ ...r, revision: config.revision,
        environment, actor_id: ctx.user.id, verified_at: new Date().toISOString() })), { onConflict: "revision,environment,kind" })
      if (error) throw error
      return NextResponse.json({ ok: true, gates: results.map((r) => r.kind) })
    }
    if (body.action === "publish") {
      if (!config.launch_at || Date.parse(config.launch_at) > Date.now() + 7 * 86400000) throw new Error("Choose a launch time within the next seven days")
      const { data: saved, error: readError } = await ctx.admin.from("billing_rollout_evidence").select("kind,evidence").eq("revision", config.revision).eq("environment", environment)
      if (readError) throw readError
      const find = (kind: string) => saved?.find((r: any) => r.kind === kind)?.evidence
      await collectRolloutEvidence(ctx.admin, config, { monthlyCheckoutId: find("monthly_buy")?.checkoutId,
        annualCheckoutId: find("annual_buy")?.checkoutId, discountCheckoutId: find("discount_buy")?.checkoutId,
        canceledSubscriptionId: find("cancel")?.subscriptionId, phase1Confirmed: find("phase1_review")?.operatorAttestedPageReview === true })
      const { data, error } = await ctx.admin.rpc("authorize_billing_rollout", { p_actor: ctx.user.id, p_revision: body.revision, p_environment: environment })
      if (error) throw error
      return NextResponse.json({ ok: true, config: data })
    }
    if (body.action === "disable") {
      const { error } = await ctx.admin.rpc("disable_billing_rollout", { p_actor: ctx.user.id }); if (error) throw error
      return NextResponse.json({ ok: true })
    }
    if (body.action === "phase3") {
      if (typeof body.enabled !== "boolean") throw new Error("Enabled must be a boolean")
      const { error } = await ctx.admin.rpc("set_billing_growth_enabled", { p_actor: ctx.user.id, p_enabled: body.enabled }); if (error) throw error
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    console.error("[billing-rollout]", error?.message)
    return NextResponse.json({ error: error?.message || "Could not complete this action" }, { status: error?.code === "40001" ? 409 : 400 })
  }
}
