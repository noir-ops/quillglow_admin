import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser } from "@/lib/auth/admin"
export const dynamic = "force-dynamic"

async function adminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return await isAdminUser(supabase, user) ? user : null
}
export async function GET() {
  if (!(await adminUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const { error, count } = await admin.from("notification_email_outbox").select("id", { count: "exact", head: true }).eq("status", "pending")
  const { count: failed } = await admin.from("notification_email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed")
  return NextResponse.json({ apiKeyConfigured: !!process.env.MAILERSEND_API_KEY,
    sender: process.env.MAILERSEND_FROM_EMAIL || null, queueReady: !error, pending: count ?? 0, failed: failed ?? 0,
    smtpStatus: "Configure and verify in Supabase Authentication settings; application API keys do not configure Auth SMTP." })
}
/** A test can only go to the signed-in, verified admin's own email. */
export async function POST() {
  const user = await adminUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!user.email || !user.email_confirmed_at) return NextResponse.json({ error: "Your admin email must be verified" }, { status: 400 })
  const key = process.env.MAILERSEND_API_KEY
  const sender = process.env.MAILERSEND_FROM_EMAIL
  if (!key || !sender) return NextResponse.json({ error: "Set MAILERSEND_API_KEY and MAILERSEND_FROM_EMAIL on the admin deployment" }, { status: 400 })
  try {
    const response = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: { email: sender, name: process.env.MAILERSEND_FROM_NAME || "QuillGlow" },
        to: [{ email: user.email }], subject: "QuillGlow email delivery test",
        text: "This is a delivery test you requested in QuillGlow Admin. If it arrived in spam, check your sending domain authentication and sender reputation." }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return NextResponse.json({ error: `Email provider rejected the test (HTTP ${response.status}). Check provider activity logs.` }, { status: 502 })
    return NextResponse.json({ accepted: true, message: "Test accepted by the email provider. Check your inbox and spam folder to confirm delivery." })
  } catch { return NextResponse.json({ error: "Could not reach the email provider" }, { status: 502 }) }
}
