import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/mailersend"

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/** Recipients: ADMIN_NOTIFY_EMAILS, falling back to ADMIN_EMAILS (comma-separated). */
async function alertAdmins(a: { heading: string; ticketNumber: string | null; fromName: string; fromEmail: string; subject: string; message: string }) {
  const to = Array.from(new Set((process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean)))
  if (to.length === 0 || !process.env.MAILERSEND_API_KEY) return
  const preview = a.message.length > 1500 ? `${a.message.slice(0, 1500)}…` : a.message
  const base = (process.env.ADMIN_APP_URL || "").replace(/\/$/, "")
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px"><h2>${esc(a.heading)}</h2>
    <p><b>From:</b> ${esc(a.fromName)} &lt;${esc(a.fromEmail)}&gt;</p>${a.ticketNumber ? `<p><b>Ticket:</b> ${esc(a.ticketNumber)}</p>` : ""}
    <p><b>Subject:</b> ${esc(a.subject)}</p><div style="white-space:pre-wrap;border-left:3px solid #ddd;padding:8px 12px">${esc(preview)}</div>
    ${base ? `<p><a href="${base}/admin/contacts?status=open">Open in the admin panel →</a></p>` : ""}</div>`
  for (const email of to) {
    try {
      await sendEmail({
        to: email,
        toName: "QuillGlow Admin",
        subject: `[QuillGlow] ${a.heading}${a.ticketNumber ? ` ${a.ticketNumber}` : ""}: ${a.subject}`.slice(0, 200),
        html,
        text: `${a.heading}\nFrom: ${a.fromName} <${a.fromEmail}>\nSubject: ${a.subject}\n\n${preview}`,
        replyTo: a.fromEmail,
      } as any)
    } catch (err) {
      console.error("[inbound] admin alert failed:", err)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log("[v0] Received inbound email:", payload)

    // MailerSend inbound webhook structure
    const { from, to, subject, text, html, headers, attachments } = payload

    if (!from?.address || !text) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const ticketMatch = subject?.match(/#([A-Za-z0-9-]+)/)
    const ticketNumber = ticketMatch ? ticketMatch[1] : null

    let threadId = null
    let parentId = null

    if (ticketNumber) {
      const { data: originalMessage } = await supabase
        .from("contact_messages")
        .select("id, thread_id")
        .eq("ticket_number", ticketNumber)
        .order("created_at", { ascending: true })
        .limit(1)
        .single()

      if (originalMessage) {
        threadId = originalMessage.thread_id || originalMessage.id
        parentId = originalMessage.id
      }
    }

    if (!threadId) {
      const { data: recentMessages } = await supabase
        .from("contact_messages")
        .select("id, thread_id")
        .eq("email", from.address)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (recentMessages) {
        threadId = recentMessages.thread_id || recentMessages.id
        parentId = recentMessages.id
      }
    }

    const { data: newMessage, error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        name: from.name || from.address.split("@")[0],
        email: from.address,
        subject: subject || "Re: Support Request",
        message: text,
        status: "pending",
        thread_id: threadId,
        parent_id: parentId,
        is_admin_reply: false,
        sent_via_email: true,
        ticket_number: ticketNumber,
        email_message_id: headers?.["message-id"],
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error inserting inbound message:", insertError)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    console.log("[v0] Inbound email saved as contact message:", newMessage.id)

    // Alert the team. The ticket itself is reopened by the database
    // (scripts/067) so it shows under Open; this makes sure someone hears
    // about it. Best effort — never fails the inbound webhook.
    await alertAdmins({
      heading: parentId ? "A learner replied by email" : "New support email",
      ticketNumber: ticketNumber ?? null,
      fromName: from.name || from.address.split("@")[0],
      fromEmail: from.address,
      subject: subject || "Re: Support Request",
      message: String(text ?? ""),
    })

    return NextResponse.json({ success: true, messageId: newMessage.id })
  } catch (error) {
    console.error("[v0] Error processing inbound email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Verify webhook signature (optional but recommended)
export async function verifyMailerSendSignature(request: NextRequest): Promise<boolean> {
  const signature = request.headers.get("x-mailersend-signature")
  const signingSecret = process.env.MAILERSEND_WEBHOOK_SECRET

  if (!signature || !signingSecret) {
    return false
  }

  // Implement signature verification based on MailerSend docs
  // This is a placeholder - implement actual verification
  return true
}
