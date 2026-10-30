import { createAdminClient } from "@/lib/supabase/admin"
import { OpportunityReviewPanel } from "@/components/opportunity-review-panel"
import { PendingOrganizations } from "@/components/pending-organizations"
import Link from "next/link"

export const revalidate = 0

export default async function OpportunityReviewPage() {
  const supabase = createAdminClient()

  const { data: submissions } = await supabase
    .from("opportunities")
    .select("*, benefactors(id, organization_name, contact_email, verification_status)")
    .eq("review_status", "pending_review")
    .order("submitted_at", { ascending: true })

  const { data: pendingOrgs } = await supabase
    .from("benefactors")
    .select("id, organization_name, contact_email, verification_status, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true })

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Benefactor-submitted scholarships awaiting approval.{" "}
            <Link href="/admin/opportunities" className="underline">
              All opportunities
            </Link>
          </p>
        </div>

        {/*
          Verify/reject an organization directly — not conditional on it
          having a submission. See PendingOrganizations for why that
          distinction matters: a benefactor cannot submit anything until
          verified, so gating verification on a submission's existence was a
          deadlock for every newly-registered organization.
        */}
        <PendingOrganizations organizations={pendingOrgs ?? []} />

        <OpportunityReviewPanel submissions={submissions ?? []} />
      </div>
    </div>
  )
}
