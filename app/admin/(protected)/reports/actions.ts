"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function getCommunityReports() {
  const supabase = createAdminClient()

  const { data: reports, error: reportsError } = await supabase
    .from("community_reports")
    .select("*")
    .order("created_at", { ascending: false })

  if (reportsError) {
    console.error("Error fetching community reports:", reportsError)
    throw new Error("Failed to fetch community reports")
  }

  if (!reports || reports.length === 0) {
    return []
  }

  // Fetch related messages
  const messageIds = reports.map((r) => r.message_id).filter(Boolean)
  const { data: messages } = await supabase.from("community_messages").select("*").in("id", messageIds)

  // Fetch reporter profiles
  const reporterIds = reports.map((r) => r.reporter_id).filter(Boolean)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", reporterIds)

  // Combine the data
  const messagesMap = new Map(messages?.map((m) => [m.id, m]) || [])
  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  return reports.map((report) => ({
    ...report,
    message: messagesMap.get(report.message_id) || null,
    reporter: profilesMap.get(report.reporter_id) || null,
  }))
}

export async function getStudyRoomReports() {
  const supabase = createAdminClient()

  const { data: reports, error: reportsError } = await supabase
    .from("study_room_reports")
    .select("*")
    .order("created_at", { ascending: false })

  if (reportsError) {
    console.error("Error fetching study room reports:", reportsError)
    throw new Error("Failed to fetch study room reports")
  }

  if (!reports || reports.length === 0) {
    return []
  }

  // Fetch related messages
  const messageIds = reports.map((r) => r.message_id).filter(Boolean)
  const { data: messages } = await supabase.from("study_room_messages").select("*").in("id", messageIds)

  // Fetch reporter profiles
  const reporterIds = reports.map((r) => r.reporter_id).filter(Boolean)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", reporterIds)

  // Fetch rooms
  const roomIds = reports.map((r) => r.room_id).filter(Boolean)
  const { data: rooms } = await supabase.from("study_rooms").select("id, name").in("id", roomIds)

  // Combine the data
  const messagesMap = new Map(messages?.map((m) => [m.id, m]) || [])
  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])
  const roomsMap = new Map(rooms?.map((r) => [r.id, r]) || [])

  return reports.map((report) => ({
    ...report,
    message: messagesMap.get(report.message_id) || null,
    reporter: profilesMap.get(report.reporter_id) || null,
    room: roomsMap.get(report.room_id) || null,
  }))
}

export async function deleteCommunityMessage(messageId: string) {
  const supabase = createAdminClient()

  // Delete the message
  const { error: messageError } = await supabase.from("community_messages").delete().eq("id", messageId)

  if (messageError) {
    console.error("Error deleting community message:", messageError)
    throw new Error("Failed to delete message")
  }

  // Delete associated reports
  const { error: reportsError } = await supabase.from("community_reports").delete().eq("message_id", messageId)

  if (reportsError) {
    console.error("Error deleting reports:", reportsError)
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function deleteStudyRoomMessage(messageId: string) {
  const supabase = createAdminClient()

  // Delete the message
  const { error: messageError } = await supabase.from("study_room_messages").delete().eq("id", messageId)

  if (messageError) {
    console.error("Error deleting study room message:", messageError)
    throw new Error("Failed to delete message")
  }

  // Delete associated reports
  const { error: reportsError } = await supabase.from("study_room_reports").delete().eq("message_id", messageId)

  if (reportsError) {
    console.error("Error deleting reports:", reportsError)
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function dismissCommunityReport(reportId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("community_reports").delete().eq("id", reportId)

  if (error) {
    console.error("Error dismissing report:", error)
    throw new Error("Failed to dismiss report")
  }

  revalidatePath("/admin/reports")
  return { success: true }
}

export async function dismissStudyRoomReport(reportId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("study_room_reports").delete().eq("id", reportId)

  if (error) {
    console.error("Error dismissing report:", error)
    throw new Error("Failed to dismiss report")
  }

  revalidatePath("/admin/reports")
  return { success: true }
}
