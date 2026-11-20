"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"

/**
 * Application review for ADMIN-RUN opportunities.
 *
 * Why this exists: application review was only ever built for Impact
 * Partners, and only for opportunities they own (benefactor_id set). The
 * admin panel creates opportunities with the service-role client and never
 * sets benefactor_id, so admin-run opportunities had no owner — and no one
 * who could shortlist, award or reject their applicants. Those applications
 * sat at "submitted" indefinitely and the student was never told anything.
 *
 * Partner-owned opportunities are deliberately NOT actionable here: the
 * partner is the reviewer of record for their own scholarship, and an admin
 * silently overriding them would be a trust problem, not a fix.
 */

type ReviewStatus = "shortlisted" | "awarded" | "rejected"
const REVIEW_STATUSES: ReviewStatus[] = ["shortlisted", "awarded", "rejected"]
// Only applications a student has actually submitted can be reviewed —
// not drafts (saved / in_progress) and not ones they've withdrawn.
const REVIEWABLE_FROM = ["submitted", "shortlisted"]

const NOTIFICATION: Record<ReviewStatus, { title: string; body: (t: string) => string }> = {
  shortlisted: {
    title: "You have been shortlisted",
    body: (t) => `You were shortlisted for "${t}".`,
  },
  awarded: {
    title: "You have been awarded a scholarship",
    body: (t) => `Congratulations — you were awarded "${t}".`,
  },
  rejected: {
    title: "Application update",
    body: (t) => `Your application to "${t}" was not successful this time.`,
  },
}

export async function setApplicationStatus(applicationId: string, status: ReviewStatus) {
  if (!REVIEW_STATUSES.includes(status)) return { ok: false, error: "Invalid status" }

  const user = await requireAdmin()

  const supabase = createAdminClient()

  const { data: app, error: appError } = await supabase
    .from("opportunity_applications")
    .select("id, user_id, status, payment_status, opportunities(id, title, benefactor_id)")
    .eq("id", applicationId)
    .maybeSingle()

  if (appError || !app) return { ok: false, error: "Application not found" }

  const opp = (Array.isArray(app.opportunities) ? app.opportunities[0] : app.opportunities) as
    | { id: string; title: string; benefactor_id: string | null }
    | null

  if (!opp) return { ok: false, error: "Opportunity unavailable" }
  if (opp.benefactor_id) {
    return { ok: false, error: "This opportunity is run by an Impact Partner — they review its applications." }
  }
  if (app.payment_status === "paid" || !REVIEWABLE_FROM.includes(app.status)) {
    return { ok: false, error: `Can't review an application that is "${app.status}".` }
  }
  if (app.status === status) return { ok: true }
  if (status === "awarded" && app.status !== "shortlisted")
    return { ok: false, error: "Shortlist the application before awarding it." }

  const { data: updated, error: updateError } = await supabase
    .from("opportunity_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", app.status)
    .or("payment_status.is.null,payment_status.neq.paid")
    .select("id").maybeSingle()

  if (updateError) return { ok: false, error: updateError.message }
  if (!updated) return { ok: false, error: "This application changed. Refresh before reviewing it." }

  // The partner review path notifies the student from inside its database
  // trigger. That trigger only runs for a logged-in partner, never for the
  // admin's service-role client, so the admin path has to notify itself —
  // otherwise the student would be shortlisted/awarded without ever knowing.
  const title = opp?.title ?? "a scholarship"
  const note = NOTIFICATION[status]
  const { error: notifyError } = await supabase.rpc("send_notification", {
    p_user_id: app.user_id,
    p_category: "scholarship",
    p_title: note.title,
    p_body: note.body(title),
    p_action_url: "/opportunities",
    p_channel: "in_app",
  })
  if (notifyError) console.error("[admin/applications] notification failed:", notifyError.message)

  const { error: auditError } = await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "admin",
    action: `application.${status}`,
    resource_type: "opportunity_application",
    resource_id: applicationId,
    before_state: { status: app.status },
    after_state: { status },
  })
  if (auditError) console.error("[admin/applications] audit log failed:", auditError.message)

  revalidatePath("/admin/applications")
  return { ok: true, warning: notifyError || auditError
    ? "The decision was saved, but notification or audit recording needs an administrator check."
    : undefined }
}

/**
 * Short-lived signed link to one application document. Documents live in a
 * private bucket and their storage path is never sent to the browser; the
 * admin gets a 5-minute link generated on click instead.
 */
export async function getDocumentUrl(documentId: string) {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: doc } = await supabase
    .from("secure_documents")
    .select("storage_bucket, storage_path, resource_type, resource_id, deleted_at, expires_at")
    .eq("id", documentId)
    .maybeSingle()

  if (!doc || doc.deleted_at || doc.resource_type !== "opportunity_application" || (doc.expires_at && Date.parse(doc.expires_at) <= Date.now())) {
    return { ok: false, error: "Document not available" }
  }

  const { data: application, error: applicationError } = await supabase.from("opportunity_applications")
    .select("id,status").eq("id", doc.resource_id).maybeSingle()
  if (applicationError || !application || !["submitted", "shortlisted", "awarded", "rejected"].includes(application.status))
    return { ok: false, error: "This document is not attached to a submitted application." }

  const { data, error } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 300)
  if (error || !data?.signedUrl) return { ok: false, error: "Could not open document" }

  return { ok: true, url: data.signedUrl }
}
