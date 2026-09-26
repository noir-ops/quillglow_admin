import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { ApplicationReviewPanel, type AdminApplication } from "@/components/application-review-panel"

export const revalidate = 0

const STATUSES = ["submitted", "shortlisted", "awarded", "rejected"] as const
type StatusFilter = (typeof STATUSES)[number] | "all"
type OwnerFilter = "admin" | "partner"

/**
 * Applications submitted to opportunities. Defaults to ADMIN-RUN
 * opportunities awaiting a decision, since those have no other reviewer.
 * Partner-run applications are viewable for oversight but reviewed by the
 * partner in the Impact Partner app.
 */
export default async function ApplicationsPage({
  searchParams: searchParamsPromise,
}: {
  // Next.js 16: searchParams is a Promise. Reading it without awaiting
  // gave undefined for every filter, so tabs/filters silently did nothing.
  searchParams: Promise<{ status?: string; owner?: string }>
}) {
  const searchParams = await searchParamsPromise
  const owner: OwnerFilter = searchParams.owner === "partner" ? "partner" : "admin"
  const status: StatusFilter = (STATUSES as readonly string[]).includes(searchParams.status ?? "")
    ? (searchParams.status as StatusFilter)
    : searchParams.status === "all"
      ? "all"
      : "submitted"

  const supabase = createAdminClient()

  // !inner so the owner filter on the joined opportunity actually filters
  // applications, rather than just blanking the embedded object.
  const base = () => {
    let q = supabase
      .from("opportunity_applications")
      .select(
        "id, user_id, status, submitted_at, notes, form_data, created_at, opportunities!inner(id, title, provider, benefactor_id, deadline, award_amount)",
        { count: "exact" },
      )
      .in("status", [...STATUSES])
    q = owner === "admin" ? q.is("opportunities.benefactor_id", null) : q.not("opportunities.benefactor_id", "is", null)
    return q
  }

  let listQuery = base().order("submitted_at", { ascending: true, nullsFirst: false }).limit(100)
  if (status !== "all") listQuery = listQuery.eq("status", status)

  const [{ data: rows, error }, ...counts] = await Promise.all([
    listQuery,
    ...STATUSES.map((s) => base().eq("status", s).limit(1)),
  ])

  const countByStatus = Object.fromEntries(STATUSES.map((s, i) => [s, counts[i].count ?? 0])) as Record<string, number>

  const applications = rows ?? []
  const userIds = [...new Set(applications.map((a: any) => a.user_id))]
  const appIds = applications.map((a: any) => a.id)

  const [{ data: profiles }, { data: docs }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    appIds.length
      ? supabase
          .from("secure_documents")
          .select("id, resource_id, document_type, original_filename, verification_status")
          .eq("resource_type", "opportunity_application")
          .in("resource_id", appIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]))
  const docsByApp = new Map<string, any[]>()
  for (const d of docs ?? []) {
    const list = docsByApp.get(d.resource_id) ?? []
    list.push(d)
    docsByApp.set(d.resource_id, list)
  }

  const items: AdminApplication[] = applications.map((a: any) => {
    const opp = Array.isArray(a.opportunities) ? a.opportunities[0] : a.opportunities
    return {
      id: a.id,
      status: a.status,
      submittedAt: a.submitted_at,
      notes: a.notes,
      formData: a.form_data ?? null,
      studentName: nameById.get(a.user_id) ?? "Unknown student",
      opportunityTitle: opp?.title ?? "Untitled opportunity",
      provider: opp?.provider ?? null,
      deadline: opp?.deadline ?? null,
      awardAmount: opp?.award_amount ?? null,
      partnerRun: !!opp?.benefactor_id,
      documents: (docsByApp.get(a.id) ?? []).map((d) => ({
        id: d.id,
        type: d.document_type,
        filename: d.original_filename,
        verification: d.verification_status,
      })),
    }
  })

  const href = (next: { status?: string; owner?: string }) => {
    const p = new URLSearchParams({ owner: next.owner ?? owner, status: next.status ?? status })
    return `/admin/applications?${p.toString()}`
  }

  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
    }`

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Student applications to opportunities. Admin-run opportunities are reviewed here; partner-run ones are
            reviewed by the partner in the Impact Partner app.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={href({ owner: "admin" })} className={tab(owner === "admin")}>
            Admin-run
          </Link>
          <Link href={href({ owner: "partner" })} className={tab(owner === "partner")}>
            Partner-run (view only)
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} className={tab(status === s)}>
              <span className="capitalize">{s}</span> ({countByStatus[s]})
            </Link>
          ))}
          <Link href={href({ status: "all" })} className={tab(status === "all")}>
            All
          </Link>
        </div>

        {error ? (
          <p className="text-sm text-destructive">Could not load applications: {error.message}</p>
        ) : (
          <ApplicationReviewPanel applications={items} />
        )}
      </div>
    </div>
  )
}
