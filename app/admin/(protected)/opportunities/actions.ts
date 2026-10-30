"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

/** Comma-separated input -> trimmed array, or null if empty (means "no restriction"). */
function toArray(value: FormDataEntryValue | null): string[] | null {
  const str = (value as string | null)?.trim()
  if (!str) return null
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function toNumber(value: FormDataEntryValue | null): number | null {
  const str = (value as string | null)?.trim()
  if (!str) return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

function toDate(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim()
  return str || null
}

function normalizeAny(value: string | null): string | null {
  return !value || value === "__any__" ? null : value
}

function buildPayload(formData: FormData) {
  return {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    provider: (formData.get("provider") as string) || null,
    opportunity_type: (formData.get("opportunity_type") as string) || "scholarship",
    description: (formData.get("description") as string) || null,
    url: (formData.get("url") as string) || null,
    award_amount: toNumber(formData.get("award_amount")),
    award_currency: (formData.get("award_currency") as string) || "USD",
    covers: toArray(formData.get("covers")),
    countries: toArray(formData.get("countries")),
    min_age: toNumber(formData.get("min_age")),
    max_age: toNumber(formData.get("max_age")),
    syllabi: toArray(formData.get("syllabi")),
    subjects: toArray(formData.get("subjects")),
    min_exam_readiness: toNumber(formData.get("min_exam_readiness")),
    // "__any__" is the form's sentinel for "no restriction" — must become a
    // real null, or eligibility filtering would only match students who
    // literally have education_level = '__any__', i.e. nobody.
    education_level: normalizeAny(formData.get("education_level") as string | null),
    gender: normalizeAny(formData.get("gender") as string | null),
    requires_essay: formData.get("requires_essay") === "true",
    requires_recommendation: formData.get("requires_recommendation") === "true",
    opens_at: toDate(formData.get("opens_at")),
    deadline: toDate(formData.get("deadline")),
    is_rolling: formData.get("is_rolling") === "true",
    status: (formData.get("status") as string) || "active",
  }
}

export async function createOpportunity(formData: FormData) {
  try {
    const supabase = createAdminClient()
    const payload = buildPayload(formData)

    if (!payload.title || !payload.slug) {
      return { success: false, error: "Title and slug are required" }
    }

    const { data, error } = await supabase.from("opportunities").insert(payload).select().single()
    if (error) throw error

    revalidatePath("/admin/opportunities")
    return { success: true, data }
  } catch (error) {
    console.error("Error creating opportunity:", error)
    const message = error instanceof Error ? error.message : "Failed to create opportunity"
    // Surface the real constraint violation (e.g. duplicate slug) rather than a generic message.
    return { success: false, error: message.includes("duplicate key") ? "That slug is already in use" : message }
  }
}

export async function updateOpportunity(id: string, formData: FormData) {
  try {
    const supabase = createAdminClient()
    const payload = buildPayload(formData)

    if (!payload.title || !payload.slug) {
      return { success: false, error: "Title and slug are required" }
    }

    const { data, error } = await supabase
      .from("opportunities")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    revalidatePath("/admin/opportunities")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating opportunity:", error)
    const message = error instanceof Error ? error.message : "Failed to update opportunity"
    return { success: false, error: message.includes("duplicate key") ? "That slug is already in use" : message }
  }
}

export async function deleteOpportunity(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("opportunities").delete().eq("id", id)
    if (error) throw error

    revalidatePath("/admin/opportunities")
    return { success: true }
  } catch (error) {
    console.error("Error deleting opportunity:", error)
    return { success: false, error: "Failed to delete opportunity" }
  }
}

export async function toggleOpportunityStatus(id: string, currentStatus: string) {
  try {
    const supabase = createAdminClient()
    const nextStatus = currentStatus === "active" ? "closed" : "active"

    const { error } = await supabase
      .from("opportunities")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error

    revalidatePath("/admin/opportunities")
    return { success: true }
  } catch (error) {
    console.error("Error toggling opportunity status:", error)
    return { success: false, error: "Failed to toggle status" }
  }
}

/** How many applications reference this opportunity — shown before delete. */
export async function getApplicationCount(opportunityId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from("opportunity_applications")
    .select("id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId)
  return count ?? 0
}

// ── Benefactor submission review ────────────────────────────────────────────

/**
 * Approve a benefactor submission. Sets BOTH flags: the student-facing policy
 * requires `status = 'active'` AND `review_status = 'approved'`, so approving
 * without activating would leave it invisible.
 */
export async function approveOpportunity(id: string, notes?: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("opportunities")
      .update({
        review_status: "approved",
        status: "active",
        review_notes: notes ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) throw error

    revalidatePath("/admin/opportunities")
    revalidatePath("/admin/opportunities/review")
    return { success: true }
  } catch (error) {
    console.error("Error approving opportunity:", error)
    return { success: false, error: "Failed to approve" }
  }
}

export async function rejectOpportunity(id: string, notes: string) {
  try {
    if (!notes?.trim()) {
      return { success: false, error: "A reason is required so the benefactor knows what to fix" }
    }
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("opportunities")
      .update({
        review_status: "rejected",
        status: "draft",
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) throw error

    revalidatePath("/admin/opportunities/review")
    return { success: true }
  } catch (error) {
    console.error("Error rejecting opportunity:", error)
    return { success: false, error: "Failed to reject" }
  }
}

export async function requestChanges(id: string, notes: string) {
  try {
    if (!notes?.trim()) {
      return { success: false, error: "Describe what needs changing" }
    }
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("opportunities")
      .update({
        review_status: "changes_requested",
        status: "draft",
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) throw error

    revalidatePath("/admin/opportunities/review")
    return { success: true }
  } catch (error) {
    console.error("Error requesting changes:", error)
    return { success: false, error: "Failed to request changes" }
  }
}

// ── Benefactor verification ─────────────────────────────────────────────────

export async function setBenefactorVerification(
  benefactorId: string,
  status: "verified" | "rejected" | "suspended" | "pending",
  notes?: string,
) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("benefactors")
      .update({
        verification_status: status,
        verification_notes: notes ?? null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", benefactorId)
    if (error) throw error

    revalidatePath("/admin/opportunities/review")
    return { success: true }
  } catch (error) {
    console.error("Error updating benefactor verification:", error)
    return { success: false, error: "Failed to update verification" }
  }
}
