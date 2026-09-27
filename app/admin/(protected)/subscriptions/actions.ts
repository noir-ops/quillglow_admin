"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function cancelSubscription(subscriptionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceling", // Mark as canceling but keep active until period end
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)

  if (error) {
    console.error("[v0] Error scheduling subscription cancellation:", error)
    throw new Error("Failed to schedule subscription cancellation")
  }

  console.log("[v0] Subscription scheduled for cancellation at period end")

  revalidatePath("/admin/subscriptions")
  return { success: true }
}

export async function reactivateSubscription(subscriptionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)

  if (error) {
    console.error("[v0] Error reactivating subscription:", error)
    throw new Error("Failed to reactivate subscription")
  }

  revalidatePath("/admin/subscriptions")
  return { success: true }
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from("subscriptions").delete().eq("id", subscriptionId)

  if (error) {
    console.error("[v0] Error deleting subscription:", error)
    throw new Error("Failed to delete subscription")
  }

  revalidatePath("/admin/subscriptions")
  return { success: true }
}

export async function processExpiredSubscriptions() {
  const supabase = createAdminClient()

  const now = new Date().toISOString()

  // Find subscriptions with status "canceling" that have passed their period end
  const { data: expiredSubs, error: fetchError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "canceling")
    .lt("current_period_end", now)

  if (fetchError) {
    console.error("[v0] Error fetching expired subscriptions:", fetchError)
    throw new Error("Failed to fetch expired subscriptions")
  }

  if (!expiredSubs || expiredSubs.length === 0) {
    return { processed: 0, message: "No expired subscriptions to process" }
  }

  // Update each expired subscription to scholar plan
  const updates = expiredSubs.map(async (sub) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan_type: "scholar",
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id)

    if (error) {
      console.error(`[v0] Error downgrading subscription ${sub.id}:`, error)
      return { id: sub.id, success: false, error }
    }

    return { id: sub.id, success: true }
  })

  const results = await Promise.all(updates)
  const successCount = results.filter((r) => r.success).length

  console.log(`[v0] Processed ${successCount} expired subscriptions`)

  revalidatePath("/admin/subscriptions")
  return {
    processed: successCount,
    total: expiredSubs.length,
    message: `Successfully downgraded ${successCount} of ${expiredSubs.length} expired subscriptions to scholar plan`,
  }
}
