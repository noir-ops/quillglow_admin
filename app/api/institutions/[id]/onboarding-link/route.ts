import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Stripe's onboarding link (an Account Link) is single-use and expires
 * quickly, so it can never be pre-generated and stored — this route is
 * called fresh, right when the admin clicks "Payout setup," and the link
 * must be opened immediately after.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: institution, error } = await admin
    .from("institutions")
    .select("id, name, contact_email")
    .eq("id", id)
    .maybeSingle()

  if (error || !institution) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 })
  }

  const quillglowUrl = process.env.QUILLGLOW_APP_URL
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (!quillglowUrl || !internalSecret) {
    return NextResponse.json(
      { error: "QUILLGLOW_APP_URL / INTERNAL_API_SECRET are not configured in the admin app" },
      { status: 500 },
    )
  }

  // rail: 2 — institutions are always Rail 2 (institutional funding).
  const res = await fetch(`${quillglowUrl}/api/internal/payout-onboarding-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": internalSecret },
    body: JSON.stringify({ email: institution.contact_email, name: institution.name, rail: 2 }),
  })

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "Failed to build onboarding link" }, { status: 502 })
  }

  return NextResponse.json({ url: data.url, institutionName: institution.name })
}
