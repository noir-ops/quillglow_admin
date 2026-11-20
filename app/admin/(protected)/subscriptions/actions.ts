"use server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"
import { expireSubscriptions } from "@/lib/billing/maintenance"

async function requireAdmin() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!(await isAdminUser(client, user))) throw new Error("Forbidden")
}
async function changeSubscription(id: string, cancel: boolean) {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: row, error } = await admin.from("subscriptions").select("*").eq("id",id).single()
  if (error || !row) throw new Error("Subscription not found")
  if (row.polar_subscription_id) {
    const token = process.env.POLAR_ACCESS_TOKEN
    const base = process.env.POLAR_BASE_URL || "https://api.polar.sh/v1"
    if (!token) throw new Error("Polar access token is not configured")
    const res = await fetch(base + "/subscriptions/" + encodeURIComponent(row.polar_subscription_id), {
      method:"PATCH", headers:{ Authorization:"Bearer " + token,"Content-Type":"application/json" },
      body:JSON.stringify({ cancel_at_period_end:cancel }), cache:"no-store",signal:AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error("Polar did not accept the subscription change")
    const snapshot = await res.json()
    const { error: syncError } = await admin.rpc("sync_polar_subscription", {
      p_user_id:row.user_id,p_snapshot:snapshot,p_dry_run:false,p_webhook_id:null,p_event_type:null,
    })
    if (syncError) throw new Error("Polar updated; local sync failed. Retry or run reconciliation.")
  } else {
    const { error: updateError } = await admin.from("subscriptions").update({ status:cancel ? "canceling":"active",cancel_at_period_end:cancel,updated_at:new Date().toISOString() }).eq("id",id)
    if (updateError) throw new Error(updateError.message)
  }
  revalidatePath("/admin/subscriptions")
  return { success:true }
}
export async function cancelSubscription(id: string) { return changeSubscription(id,true) }
export async function reactivateSubscription(id: string) { return changeSubscription(id,false) }
export async function deleteSubscription(id: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: row, error } = await admin.from("subscriptions").select("*").eq("id",id).single()
  if (error || !row) throw new Error("Subscription not found")
  if (row.polar_subscription_id) throw new Error("Polar subscription records must be retained for billing synchronization. Cancel in Polar instead.")
  const { error: deleteError } = await admin.from("subscriptions").delete().eq("id",id)
  if (deleteError) throw new Error(deleteError.message)
  revalidatePath("/admin/subscriptions")
  return { success:true }
}
export async function processExpiredSubscriptions() {
  await requireAdmin()
  const result = await expireSubscriptions()
  revalidatePath("/admin/subscriptions")
  return result
}
