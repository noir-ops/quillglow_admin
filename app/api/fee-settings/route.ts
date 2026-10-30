import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Platform fee rates, read and written by the admin panel only.
 *
 * `platform_fee_settings` has RLS on with NO anon/authenticated policies
 * (see migration 041), so every access here goes through the service-role
 * client. Same pattern as /api/ai-settings.
 *
 * These numbers are charged to real benefactors by the benefactor app's
 * checkout route, so validation is strict — a stray 150 in a percent field
 * would overcharge someone by 150%.
 */

/** Mirrors the defaults in migration 041 and the benefactor app's lib/fees. */
const DEFAULTS = {
  id: "global",
  tech_fee_pct: 1.5,
  processing_fee_pct: 1.0,
  provider_name: "Polar",
  provider_fee_pct_estimate: 4.0,
  provider_fee_fixed_estimate: 0.4,
  disclosure_note:
    "Polar, our payment processor, deducts its own processing fee from this transaction. The estimate above is approximate and may vary by card type, currency, and region — see polar.sh/resources/pricing for current rates.",
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from("platform_fee_settings").select("*").eq("id", "global").maybeSingle()

  if (error) {
    console.error("[fee-settings] read failed:", error.message)
    return NextResponse.json({ error: "Failed to load fee settings" }, { status: 500 })
  }

  return NextResponse.json({ settings: data ?? DEFAULTS })
}

export async function POST(req: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const num = (v: unknown) => (typeof v === "number" ? v : Number.parseFloat(String(v)))

  const techFeePct = num(body.tech_fee_pct)
  const processingFeePct = num(body.processing_fee_pct)
  const providerFeePct = num(body.provider_fee_pct_estimate)
  const providerFeeFixed = num(body.provider_fee_fixed_estimate)
  const providerName = String(body.provider_name ?? "").trim()
  const disclosureNote = String(body.disclosure_note ?? "").trim()

  // Percent fields: numeric(6,4) in the DB, and these are charged for real.
  // 100 is already an absurd rate; anything above it is certainly a typo.
  const pctFields: Array<[string, number]> = [
    ["Technology fee", techFeePct],
    ["Processing fee", processingFeePct],
    ["Provider fee estimate", providerFeePct],
  ]
  for (const [label, value] of pctFields) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return NextResponse.json({ error: `${label} must be between 0 and 100` }, { status: 400 })
    }
  }

  if (!Number.isFinite(providerFeeFixed) || providerFeeFixed < 0 || providerFeeFixed > 1000) {
    return NextResponse.json({ error: "Provider fixed fee must be between 0 and 1000" }, { status: 400 })
  }
  if (!providerName) {
    return NextResponse.json({ error: "Payment provider name is required" }, { status: 400 })
  }
  if (!disclosureNote) {
    return NextResponse.json({ error: "Disclosure note is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("platform_fee_settings")
    .upsert(
      {
        id: "global",
        tech_fee_pct: techFeePct,
        processing_fee_pct: processingFeePct,
        provider_name: providerName,
        provider_fee_pct_estimate: providerFeePct,
        provider_fee_fixed_estimate: providerFeeFixed,
        disclosure_note: disclosureNote,
        updated_by: user.id,
      },
      { onConflict: "id" },
    )
    .select()
    .single()

  if (error) {
    console.error("[fee-settings] write failed:", error.message)
    return NextResponse.json({ error: "Failed to save fee settings" }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
