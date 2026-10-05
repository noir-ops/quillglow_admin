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
  const now = new Date()
  const nowIso = now.toISOString()
  const graceCutoff = new Date(now.getTime() - 3 * 86_400_000).toISOString()

  // Access itself is already decided correctly by user_plan() (main repo,
  // scripts/066) the moment a period ends; this job tidies the rows so the
  // admin list shows the truth. Polar-backed rows are left to the Polar
  // webhook + nightly reconciliation, which know the real status.
  const queries = [
    // An admin-scheduled cancellation whose paid period has ended
    supabase.from("subscriptions").select("id").eq("plan_type", "genius").eq("status", "canceling").lt("current_period_end", nowIso),
    // A failed payment past its 3-day grace period
    supabase.from("subscriptions").select("id").eq("plan_type", "genius").eq("status", "past_due").lt("past_due_at", graceCutoff),
    // One-off grants (family wallet etc.) past their end date
    supabase.from("subscriptions").select("id").eq("plan_type", "genius").eq("status", "active")
      .is("polar_subscription_id", null).is("polar_checkout_id", null).lt("current_period_end", nowIso),
  ]
  const results = await Promise.all(queries)
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    console.error("[v0] Error fetching expired subscriptions:", failed.error)
    throw new Error("Failed to fetch expired subscriptions")
  }
  const ids = Array.from(new Set(results.flatMap((r) => (r.data ?? []).map((x: any) => x.id))))
  if (ids.length === 0) {
    return { processed: 0, message: "No expired subscriptions to process" }
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ plan_type: "scholar", status: "expired", updated_at: nowIso })
    .in("id", ids)
  if (error) {
    console.error("[v0] Error downgrading subscriptions:", error)
    throw new Error("Failed to downgrade expired subscriptions")
  }
  const successCount = ids.length
  console.log(`[v0] Processed ${successCount} expired subscriptions`)

  revalidatePath("/admin/subscriptions")
  return {
    processed: successCount,
    total: ids.length,
    message: `Downgraded ${successCount} expired subscription${successCount === 1 ? "" : "s"} to Scholar`,
  }
}
