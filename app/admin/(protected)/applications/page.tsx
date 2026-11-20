import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { ApplicationReviewPanel, type AdminApplication } from "@/components/application-review-panel"
import { applicationTracking, isSubmittedApplication, readApplicationRecords, statusLabel } from "@/lib/admin/application-tracking"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage({ searchParams }: {
  searchParams: Promise<{ status?: string; owner?: string; opportunity?: string; page?: string }>
}) {
  await requireAdmin()
  const selection = await searchParams
  const client = createAdminClient()
  let records
  try { records = await readApplicationRecords(client) }
  catch {
    return <div className="space-y-4 p-6"><h1 className="text-3xl font-bold">Applications</h1>
      <p role="alert">Application records could not be loaded. Check the database connection and retry.</p>
      <Link className="underline" href="/admin/applications">Retry loading applications</Link>
    </div>
  }
  const tracking = applicationTracking(records, selection)
  const ids = tracking.rows.map((row) => row.id)
  const submittedIds = tracking.rows.filter((row) => isSubmittedApplication(row.status)).map((row) => row.id)
  const users = [...new Set(tracking.rows.map((row) => row.user_id))]
  const [profiles, answers, documents] = await Promise.all([
    users.length ? client.from("profiles").select("id,display_name").in("id", users) : { data: [], error: null },
    submittedIds.length ? client.from("opportunity_applications").select("id,notes,form_data").in("id", submittedIds) : { data: [], error: null },
    submittedIds.length ? client.from("secure_documents")
      .select("id,resource_id,document_type,original_filename,verification_status")
      .eq("resource_type", "opportunity_application").in("resource_id", submittedIds).is("deleted_at", null) : { data: [], error: null },
  ])
  const names = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]))
  const content = new Map((answers.data ?? []).map((row) => [row.id, row]))
  const docs = new Map<string, NonNullable<typeof documents.data>>()
  for (const doc of documents.data ?? []) docs.set(doc.resource_id, [...(docs.get(doc.resource_id) ?? []), doc])
  const items: AdminApplication[] = tracking.rows.map((row) => {
    const detail = content.get(row.id)
    return {
      id: row.id, userId: row.user_id, status: row.status ?? "unspecified", submittedAt: row.submitted_at,
      createdAt: row.created_at, paymentStatus: row.payment_status,
      notes: detail?.notes ?? null, formData: detail?.form_data ?? null,
      studentName: names.get(row.user_id) || detail?.form_data?.personal?.fullName || "Learner",
      opportunityTitle: row.opportunities?.title ?? "Opportunity unavailable",
      provider: row.opportunities?.provider ?? null, deadline: row.opportunities?.deadline ?? null,
      awardAmount: row.opportunities?.award_amount ?? null, partnerRun: !!row.opportunities?.benefactor_id,
      documents: (docs.get(row.id) ?? []).map((d) => ({ id: d.id, type: d.document_type, filename: d.original_filename, verification: d.verification_status })),
    }
  })
  const href = (next: { owner?: string; status?: string; opportunity?: string; page?: number }) => {
    const query = new URLSearchParams({ owner: next.owner ?? tracking.owner, status: next.status ?? tracking.status })
    const opportunity = next.opportunity ?? selection.opportunity
    if (opportunity) query.set("opportunity", opportunity)
    if (next.page) query.set("page", String(next.page))
    return "/admin/applications?" + query
  }
  const style = (active: boolean) => "rounded-lg border px-3 py-1.5 text-sm " +
    (active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent")
  const opportunityOptions = [...new Map(records.map((row) => [row.opportunity_id, row.opportunities?.title ?? "Opportunity unavailable"]))]
  return <div className="min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <div><h1 className="text-3xl font-bold">Applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track saved opportunities, forms in progress and submitted applications. Impact Partners review their own opportunities.</p>
    </div>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["All records", tracking.total], ["Saved", tracking.counts.saved], ["In progress", tracking.counts.in_progress],
        ["Received", tracking.received]].map(([label, value]) => <div key={label} className="rounded-lg border p-4">
          <dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-2xl font-semibold">{value}</dd>
        </div>)}
    </dl>
    <nav className="flex flex-wrap gap-2" aria-label="Opportunity ownership">
      {(["all", "admin", "partner"] as const).map((owner) => <Link key={owner} className={style(owner === tracking.owner)}
        href={href({ owner })}>{owner === "all" ? "All owners" : owner === "admin" ? "Admin-run" : "Partner-run"} ({tracking.owners[owner]})</Link>)}
    </nav>
    <form className="flex flex-wrap items-end gap-2" method="get">
      <input type="hidden" name="owner" value={tracking.owner} /><input type="hidden" name="status" value={tracking.status} />
      <label className="grid max-w-full gap-1 text-sm">Opportunity
        <select name="opportunity" defaultValue={selection.opportunity ?? ""} className="max-w-full rounded-md border bg-background p-2">
          <option value="">All opportunities</option>{opportunityOptions.map(([id, title]) => <option value={id} key={id}>{title}</option>)}
        </select>
      </label><button className={style(false)} type="submit">Apply filter</button>
      <Link className="p-2 text-sm underline" href="/admin/applications">Reset filters</Link>
    </form>
    <nav className="flex flex-wrap gap-2" aria-label="Application status">
      <Link href={href({ status: "all" })} className={style(tracking.status === "all")}>All records ({tracking.total})</Link>
      <Link href={href({ status: "received" })} className={style(tracking.status === "received")}>Received ({tracking.received})</Link>
      {tracking.statuses.map((status) => <Link key={status} href={href({ status })} className={style(status === tracking.status)}>
        <span className="capitalize">{statusLabel(status)}</span> ({tracking.counts[status] ?? 0})
      </Link>)}
    </nav>
    <p className="text-sm text-muted-foreground">Saved and in-progress records have not been submitted. Their form answers and documents are available for review after submission.</p>
    {(profiles.error || answers.error || documents.error) && <p role="alert" className="text-sm text-destructive">
      Some learner names, submitted answers or documents could not be loaded. Application references and counts are available.
      {" "}<Link className="underline" href={href({ page: tracking.page })}>Retry details</Link>
    </p>}
    <p className="text-sm">{ids.length ? (tracking.page - 1) * 50 + 1 : 0}–{Math.min(tracking.page * 50, tracking.filteredCount)} of {tracking.filteredCount} records</p>
    <ApplicationReviewPanel applications={items} />
    {tracking.pages > 1 && <nav aria-label="Application pages" className="flex items-center gap-3 text-sm">
      {tracking.page > 1 && <Link className="underline" href={href({ page: tracking.page - 1 })}>Previous page</Link>}
      <span>Page {tracking.page} of {tracking.pages}</span>
      {tracking.page < tracking.pages && <Link className="underline" href={href({ page: tracking.page + 1 })}>Next page</Link>}
    </nav>}
  </div></div>
}
