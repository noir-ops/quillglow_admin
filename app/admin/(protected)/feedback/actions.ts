"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getFeatureFeedback() {
  const supabase = createAdminClient()

  const { data: feedback, error: feedbackError } = await supabase
    .from("feature_feedback")
    .select("*")
    .order("created_at", { ascending: false })

  if (feedbackError) {
    console.error("Error fetching feature feedback:", feedbackError)
    return []
  }

  if (!feedback || feedback.length === 0) {
    return []
  }

  // Get unique user IDs
  const userIds = [...new Set(feedback.map((f) => f.user_id))]

  // Fetch profiles for all users
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds)

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError)
  }

  // Create a map of user_id to profile
  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Combine feedback with profile data
  const feedbackWithProfiles = feedback.map((item) => ({
    ...item,
    profiles: profilesMap.get(item.user_id) || {
      display_name: "Unknown User",
      avatar_url: "",
    },
  }))

  return feedbackWithProfiles
}

export async function deleteFeedback(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("feature_feedback").delete().eq("id", id)

  if (error) {
    throw new Error(`Failed to delete feedback: ${error.message}`)
  }

  return { success: true }
}

export async function getFeedbackStats() {
  const supabase = createAdminClient()

  const { data: feedback, error } = await supabase.from("feature_feedback").select("*")

  if (error) {
    console.error("Error fetching feedback stats:", error)
    return {
      total: 0,
      byFeature: {},
      byOption: {},
    }
  }

  const byFeature: Record<string, number> = {}
  const byOption: Record<string, number> = {}

  feedback.forEach((item) => {
    byFeature[item.feature_name] = (byFeature[item.feature_name] || 0) + 1
    byOption[item.selected_option] = (byOption[item.selected_option] || 0) + 1
  })

  return {
    total: feedback.length,
    byFeature,
    byOption,
  }
}

export async function getFeatureFeedbackBreakdown() {
  const supabase = createAdminClient()

  const { data: feedback, error } = await supabase.from("feature_feedback").select("*")

  if (error) {
    console.error("[v0] Error fetching feedback breakdown:", error)
    return []
  }

  console.log("[v0] Raw feedback data:", JSON.stringify(feedback, null, 2))

  // Group by feature and calculate sentiment breakdown
  const featureMap = new Map<
    string,
    {
      feature_name: string
      total: number
      positive: number
      negative: number
      neutral: number
    }
  >()

  feedback.forEach((item) => {
    const existing = featureMap.get(item.feature_name) || {
      feature_name: item.feature_name,
      total: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
    }

    existing.total++

    const option = (item.selected_option || "").toLowerCase().trim()
    console.log(
      "[v0] Processing feedback item:",
      item.feature_name,
      "option:",
      item.selected_option,
      "normalized:",
      option,
    )

    if (option === "positive" || option === "like" || option === "good" || option === "yes") {
      existing.positive++
    } else if (option === "negative" || option === "dislike" || option === "bad" || option === "no") {
      existing.negative++
    } else if (option === "neutral" || option === "maybe" || option === "ok") {
      existing.neutral++
    } else {
      // If option doesn't match any known category, count it based on common patterns
      console.log("[v0] Unknown option:", item.selected_option)
      existing.neutral++ // Default to neutral for unknown options
    }

    featureMap.set(item.feature_name, existing)
  })

  const result = Array.from(featureMap.values()).sort((a, b) => b.total - a.total)
  console.log("[v0] Breakdown result:", JSON.stringify(result, null, 2))

  return result
}
