import { createAdminClient } from "@/lib/supabase/admin"
export async function expireSubscriptions() {
  const { data, error } = await createAdminClient().rpc("expire_genius_subscriptions")
  if (error) throw new Error("Failed to process subscription expiry: " + error.message)
  return { processed: data, total: data, message: `Processed ${data} expired subscriptions` }
}
