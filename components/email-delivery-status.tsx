"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function EmailDeliveryStatus() {
  const [status, setStatus] = useState<{ apiKeyConfigured: boolean; sender: string | null; queueReady: boolean; pending: number; failed: number } | null>(null)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch("/api/email-status", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) throw new Error("Could not load email delivery status")
      const data = await r.json()
      if (!cancelled) setStatus(data)
    }).catch((e) => { if (!cancelled) setMessage(e.message) })
    return () => { cancelled = true }
  }, [])
  async function test() {
    setBusy(true); setMessage("")
    try {
      const r = await fetch("/api/email-status", { method: "POST" })
      const data = await r.json()
      setMessage(data.message || data.error || "Email test failed")
    } catch { setMessage("Email test could not be completed") }
    finally { setBusy(false) }
  }
  return <Card>
    <CardHeader><CardTitle>Email delivery</CardTitle><CardDescription>Authentication emails and app notifications use separate delivery settings.</CardDescription></CardHeader>
    <CardContent className="space-y-3 text-sm">
      {status && <><p>Admin email API: {status.apiKeyConfigured && status.sender ? `configured (${status.sender})` : "missing API key or verified sender"}</p>
        <p>Notification queue: {status.queueReady ? `${status.pending} pending, ${status.failed} failed` : "run scripts/069_notification_email_delivery.sql from the main app"}</p></>}
      <p>Enable custom SMTP in Supabase Authentication for signup, verification, password recovery, and email changes. A MailerSend API key here does not enable Auth SMTP.</p>
      <p>Verify SPF, DKIM, and DMARC for your sending domain. Set the MailerSend API key, sender, and app URL on the main app as well.</p>
      <Button type="button" variant="outline" onClick={test} disabled={busy || !status?.apiKeyConfigured || !status?.sender}>{busy ? "Sending…" : "Send test to my admin email"}</Button>
      {message && <p role="status">{message}</p>}
    </CardContent>
  </Card>
}
