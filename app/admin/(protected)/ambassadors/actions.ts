"use server"

import { fetchAllRows, fetchByIds } from "@/lib/fetch-all"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { revalidatePath } from "next/cache"

export async function getAmbassadors(status?: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  let query = supabase
    .from("ambassadors")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await fetchAllRows((f, t) => query.range(f, t))
  if (error) {
    console.error("Error fetching ambassadors:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorReferrals(ambassadorId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await fetchAllRows((f, t) => supabase.from("referrals").select("*").eq("ambassador_id", ambassadorId).order("created_at", { ascending: false }).range(f, t))

  if (error) {
    console.error("Error fetching referrals:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorRewards(ambassadorId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await fetchAllRows((f, t) => supabase.from("ambassador_rewards").select("*").eq("ambassador_id", ambassadorId).order("milestone", { ascending: true }).range(f, t))

  if (error) {
    console.error("Error fetching rewards:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorCertificates(ambassadorId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await fetchAllRows((f, t) => supabase.from("ambassador_certificates").select("*").eq("ambassador_id", ambassadorId).order("milestone", { ascending: true }).range(f, t))

  if (error) {
    console.error("Error fetching certificates:", error)
    return []
  }
  return data || []
}

export async function updateAmbassadorStatus(
  ambassadorId: string,
  status: "pending" | "approved" | "rejected" | "suspended",
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("ambassadors")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ambassadorId)

  if (error) {
    console.error("Error updating ambassador status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

export async function issueReward(
  ambassadorId: string,
  milestone: number,
  rewardType: string,
  rewardDescription: string
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from("ambassador_rewards").insert({
    ambassador_id: ambassadorId,
    milestone,
    reward_type: rewardType,
    reward_description: rewardDescription,
    issued: true,
    issued_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Error issuing reward:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

export async function markRewardIssued(rewardId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("ambassador_rewards")
    .update({ issued: true, issued_at: new Date().toISOString() })
    .eq("id", rewardId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

export async function updateVerifiedReferrals(
  ambassadorId: string,
  verifiedCount: number
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("ambassadors")
    .update({
      verified_referrals: verifiedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ambassadorId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

export async function verifyReferral(referralId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("referrals")
    .update({
      status: "verified",
      verification_date: new Date().toISOString(),
    })
    .eq("id", referralId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

export async function deleteAmbassador(ambassadorId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("ambassadors")
    .delete()
    .eq("id", ambassadorId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/ambassadors")
  return { success: true }
}

/* ---------------- Referral Tiers ---------------- */

const REFERRAL_TIERS = [
  { minReferrals: 15, months: 2, label: "2 Months Genius" },
  { minReferrals: 50, months: 3, label: "3 Months Genius" },
  { minReferrals: 100, months: 6, label: "6 Months Genius" },
  { minReferrals: 500, months: -1, label: "Forever Genius" },
]

export async function getEligibleTier(verifiedReferrals: number) {
  let eligibleTier = null

  for (const tier of REFERRAL_TIERS) {
    if (verifiedReferrals >= tier.minReferrals) {
      eligibleTier = tier
    }
  }

  return eligibleTier
}

export async function upgradeAmbassadorSubscription(
  ambassadorId: string,
  userId: string,
  verifiedReferrals: number
) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: ambassador, error: readError } = await supabase
    .from("ambassadors").select("id, user_id, status")
    .eq("id", ambassadorId).maybeSingle()
  if (readError || !ambassador || ambassador.user_id !== userId || ambassador.status !== "approved") {
    return { success: false, error: "Approved ambassador account required" }
  }
  // Read canonical eligibility; caller-supplied verifiedReferrals is never authority.
  const { data: referrals, error: countError } = await supabase.from("referrals")
    .select("referred_user_id").eq("ambassador_id", ambassadorId).eq("status", "verified")
  if (countError) return { success: false, error: countError.message }
  const tier = await getEligibleTier(new Set((referrals || []).map(r => r.referred_user_id)).size)
  if (!tier) return { success: false, error: "Ambassador does not qualify for a subscription tier" }
  const { error } = await supabase.rpc("grant_ambassador_genius", { p_ambassador_id: ambassadorId })
  if (error) return { success: false, error: error.message }
  revalidatePath("/admin/ambassadors")
  return { success: true, tier: tier.label }
}

export async function getAmbassadorSubscriptionStatus(userId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching subscription:", error)
    return null
  }

  return data
}

export async function getAmbassadorStats() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: ambassadors }, { data: referrals }, { data: rewards }] =
    await Promise.all([
      supabase
        .from("ambassadors")
        .select("id, status, verified_referrals, total_referrals, reward_level"),
      supabase.from("referrals").select("id, status"),
      supabase.from("ambassador_rewards").select("id, issued"),
    ])

  return {
    total: ambassadors?.length || 0,
    pending: ambassadors?.filter((a) => a.status === "pending").length || 0,
    approved: ambassadors?.filter((a) => a.status === "approved").length || 0,
    rejected: ambassadors?.filter((a) => a.status === "rejected").length || 0,
    suspended: ambassadors?.filter((a) => a.status === "suspended").length || 0,
    totalReferrals: referrals?.length || 0,
    verifiedReferrals:
      referrals?.filter((r) => r.status === "verified").length || 0,
    pendingReferrals:
      referrals?.filter((r) => r.status === "pending").length || 0,
    rewardsIssued: rewards?.filter((r) => r.issued).length || 0,
    rewardsPending: rewards?.filter((r) => !r.issued).length || 0,
  }
}