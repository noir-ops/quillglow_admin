"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function getAmbassadors(status?: string) {
  const supabase = createAdminClient()

  let query = supabase
    .from("ambassadors")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query
  if (error) {
    console.error("Error fetching ambassadors:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorReferrals(ambassadorId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching referrals:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorRewards(ambassadorId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("ambassador_rewards")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .order("milestone", { ascending: true })

  if (error) {
    console.error("Error fetching rewards:", error)
    return []
  }
  return data || []
}

export async function getAmbassadorCertificates(ambassadorId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("ambassador_certificates")
    .select("*")
    .eq("ambassador_id", ambassadorId)
    .order("milestone", { ascending: true })

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
  const supabase = createAdminClient()

  const tier = await getEligibleTier(verifiedReferrals)

  if (!tier) {
    return {
      success: false,
      error: "Ambassador does not qualify for any subscription tier",
    }
  }

  const now = new Date()
  let periodEnd: Date

  if (tier.months === -1) {
    periodEnd = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000)
  } else {
    periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + tier.months)
  }

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (existingSub) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan_type: "genius",
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: tier.months !== -1,
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      console.error("Error updating subscription:", error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_type: "genius",
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: tier.months !== -1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    if (error) {
      console.error("Error creating subscription:", error)
      return { success: false, error: error.message }
    }
  }

  const rewardLevel = REFERRAL_TIERS.indexOf(tier) + 1

  await supabase
    .from("ambassadors")
    .update({ reward_level: rewardLevel, updated_at: now.toISOString() })
    .eq("id", ambassadorId)

  await supabase.from("ambassador_rewards").insert({
    ambassador_id: ambassadorId,
    milestone: tier.minReferrals,
    reward_type: "subscription",
    reward_description: `${tier.label} Plan - Awarded for ${verifiedReferrals} verified referrals`,
    issued: true,
    issued_at: now.toISOString(),
  })

  revalidatePath("/admin/ambassadors")

  return { success: true, tier: tier.label }
}

export async function getAmbassadorSubscriptionStatus(userId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching subscription:", error)
    return null
  }

  return data
}

export async function getAmbassadorStats() {
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