"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

/**
 * The whole point of the rail architecture: switching Rail 1/2/3 onto a
 * different provider is this one call — no deploy, no code change in the
 * student/benefactor apps. Calls set_active_disbursement_provider(), which
 * atomically deactivates every other provider on that rail first.
 */
export async function setActiveProvider(providerId: string) {
  const admin = createAdminClient()
  const { error } = await admin.rpc("set_active_disbursement_provider", { p_provider_id: providerId })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/disbursements")
}
