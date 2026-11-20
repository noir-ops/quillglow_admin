import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser } from "@/lib/auth/admin"
export const dynamic = "force-dynamic"
export async function GET() {
  const client = await createClient(), { data: { user } } = await client.auth.getUser()
  if (!user || !(await isAdminUser(client, user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await createAdminClient().rpc("billing_growth_report", { p_days: 30 })
  if (error) return NextResponse.json({ error: "Growth data unavailable; check the migration" }, { status: 503 })
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } })
}
