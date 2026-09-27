import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
