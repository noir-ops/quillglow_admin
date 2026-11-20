import type { SupabaseClient } from "@supabase/supabase-js"

export const applicationStatuses = ["saved", "in_progress", "submitted", "shortlisted", "awarded", "rejected", "withdrawn"] as const
export const statusLabel = (status: string | null) => status === "saved" ? "Saved" : status === "in_progress" ? "In progress"
  : status ? status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ") : "Unspecified"
export const isSubmittedApplication = (status: string | null) =>
  ["submitted", "shortlisted", "awarded", "rejected"].includes(status ?? "")

export interface ApplicationRecord {
  id: string
  user_id: string
  opportunity_id: string
  status: string | null
  submitted_at: string | null
  created_at: string | null
  payment_status: string | null
  opportunities: {
    id: string; title: string; provider: string | null; benefactor_id: string | null
    deadline: string | null; award_amount: number | null
  } | null
}

export async function readApplicationRecords(client: SupabaseClient): Promise<ApplicationRecord[]> {
  const rows: ApplicationRecord[] = []
  // Start with the application table. Optional opportunity/profile enrichment must not hide an existing record.
  let offset = 0
  for (;;) {
    const { data, error, count } = await client.from("opportunity_applications")
      .select("id,user_id,opportunity_id,status,submitted_at,created_at,payment_status,opportunities(id,title,provider,benefactor_id,deadline,award_amount)", { count: "exact" })
      .order("id").range(offset, offset + 499)
    if (error) throw new Error("Application records could not be loaded. Check the database connection and retry.")
    for (const row of data ?? []) {
      const opportunity = Array.isArray(row.opportunities) ? row.opportunities[0] : row.opportunities
      rows.push({ ...row, opportunities: opportunity ?? null } as ApplicationRecord)
    }
    offset += data?.length ?? 0
    if (count !== null ? offset >= count : (data?.length ?? 0) < 500) break
    if (!data?.length) throw new Error("Application records could not be completely loaded. Please retry.")
  }
  return rows
}

export function applicationTracking(records: ApplicationRecord[], selection: {
  owner?: string; status?: string; opportunity?: string; page?: string
}) {
  const owner = selection.owner === "admin" || selection.owner === "partner" ? selection.owner : "all"
  const byOpportunity = records.filter((row) => !selection.opportunity || row.opportunity_id === selection.opportunity)
  const owners = {
    all: byOpportunity.length,
    admin: byOpportunity.filter((row) => row.opportunities && !row.opportunities.benefactor_id).length,
    partner: byOpportunity.filter((row) => row.opportunities?.benefactor_id).length,
  }
  const scoped = byOpportunity.filter((row) => owner === "all" || (owner === "partner"
    ? !!row.opportunities?.benefactor_id : !!row.opportunities && !row.opportunities.benefactor_id))
  const counts: Record<string, number> = Object.fromEntries(applicationStatuses.map((s) => [s, 0]))
  for (const row of scoped) counts[row.status ?? "unspecified"] = (counts[row.status ?? "unspecified"] ?? 0) + 1
  const statuses = [...new Set([...applicationStatuses, ...Object.keys(counts)])]
  const status = selection.status && (selection.status === "all" || selection.status === "received" || statuses.includes(selection.status))
    ? selection.status : "all"
  const filtered = scoped.filter((row) => status === "all" || (status === "received"
    ? isSubmittedApplication(row.status) : (row.status ?? "unspecified") === status))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "") || a.id.localeCompare(b.id))
  const pages = Math.max(1, Math.ceil(filtered.length / 50))
  const parsed = Number(selection.page)
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, pages) : 1
  return { owner, owners, counts, statuses, status, total: scoped.length, received: scoped.filter((row) => isSubmittedApplication(row.status)).length,
    filteredCount: filtered.length, pages, page, rows: filtered.slice((page - 1) * 50, page * 50) }
}
