"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { sendEmail, generateEmailTemplate } from "@/lib/mailersend"

export async function updateContactStatus(contactId: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", contactId)

  if (error) {
    console.error("[v0] Error updating contact status:", error)
    throw new Error("Failed to update status")
  }

  revalidatePath("/admin/contacts")
  return { success: true }
}

export async function deleteContact(contactId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("contact_messages").delete().eq("id", contactId)

  if (error) {
    console.error("[v0] Error deleting contact:", error)
    throw new Error("Failed to delete message")
  }

  revalidatePath("/admin/contacts")
  return { success: true }
}

export async function replyToContact(contactId: string, replyMessage: string, newStatus: string) {
  const supabase = createAdminClient()

  const { data: contact, error: fetchError } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("id", contactId)
    .single()

  if (fetchError || !contact) {
    console.error("[v0] Error fetching contact:", fetchError)
    throw new Error("Failed to fetch contact message")
  }

  const threadId = contact.thread_id || contact.id

  // Count existing replies in the thread to generate sequential reply number
  const { data: existingReplies } = await supabase
    .from("contact_messages")
    .select("id")
    .eq("thread_id", threadId)
    .eq("is_admin_reply", true)

  const replyCount = (existingReplies?.length || 0) + 1
  const replyTicketNumber = `${contact.ticket_number}-R${replyCount}`

  const { data: replyData, error: replyError } = await supabase
    .from("contact_messages")
    .insert({
      name: "Admin",
      email: contact.email,
      subject: `Re: ${contact.subject}`,
      message: replyMessage,
      status: newStatus,
      ticket_number: replyTicketNumber, // Added unique ticket number for reply
      thread_id: threadId,
      parent_id: contactId,
      is_admin_reply: true,
      sent_via_email: true,
    })
    .select()
    .single()

  if (replyError) {
    console.error("[v0] Error creating reply message:", replyError.message)
    throw new Error("Failed to create reply")
  }

  if (!contact.thread_id) {
    await supabase.from("contact_messages").update({ thread_id: threadId }).eq("id", contactId)
  }

  await supabase.from("contact_messages").update({ status: newStatus }).eq("id", contactId)

  try {
    const emailTemplate = generateEmailTemplate({
      userName: contact.name,
      subject: contact.subject,
      message: replyMessage,
      ticketNumber: contact.ticket_number || contactId.slice(0, 8),
    })

    const emailResult = await sendEmail({
      to: contact.email,
      toName: contact.name,
      subject: `Re: ${contact.subject}`,
      html: emailTemplate.html,
      text: emailTemplate.text,
      replyTo: process.env.MAILERSEND_INBOUND_EMAIL || "support@yourdomain.com",
      inReplyTo: contact.email_message_id,
      references: contact.email_message_id,
    })

    if (emailResult.messageId) {
      await supabase.from("contact_messages").update({ email_message_id: emailResult.messageId }).eq("id", replyData.id)
    }

    console.log("[v0] Email sent successfully to:", contact.email)
  } catch (emailError) {
    console.error("[v0] Error sending email:", emailError)
    // Don't throw - reply is saved even if email fails
  }

  revalidatePath("/admin/contacts")
  return { success: true, email: contact.email }
}

export async function getContactConversation(contactId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("contact_messages").select("*").eq("id", contactId).single()

  if (error) {
    console.error("[v0] Error fetching conversation:", error)
    throw new Error("Failed to fetch conversation")
  }

  return data
}

export async function getContactThread(contactId: string) {
  const supabase = createAdminClient()

  // Get the message to find its thread_id
  const { data: message, error: messageError } = await supabase
    .from("contact_messages")
    .select("thread_id, id")
    .eq("id", contactId)
    .single()

  if (messageError || !message) {
    throw new Error("Failed to fetch message")
  }

  const threadId = message.thread_id || message.id

  // Get all messages in the thread
  const { data: thread, error: threadError } = await supabase
    .from("contact_messages")
    .select("*")
    .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
    .order("created_at", { ascending: true })

  if (threadError) {
    throw new Error("Failed to fetch conversation thread")
  }

  return thread || []
}
