import "server-only"

export interface AccountConnection { id: string; name: string }
export interface AccountSummary {
  types: string[] | null
  family: AccountConnection[] | null
  guides: AccountConnection[] | null
}

/** Display data only. These account records never grant an admin role. */
export function accountTypes(isGuide: boolean, isImpactPartner: boolean): string[] {
  const types = []
  if (isGuide) types.push("Guide")
  if (isImpactPartner) types.push("Impact partner")
  return types.length ? types : ["Learner"]
}

async function readLinks(db: any, ids: string[]) {
  const rows: any[] = []
  // A guide may link many learners. Do not silently truncate at the API's row cap.
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from("guardian_links")
      .select("id,student_user_id,adult_user_id,link_type")
      .in("student_user_id", ids).eq("status", "active")
      .order("id", { ascending: true }).range(from, from + 499)
    if (error) throw new Error("Active account links could not be loaded")
    rows.push(...(data ?? []))
    if (!data || data.length < 500) return rows
  }
}

/** Bounded to the visible profile page; no auth-user scans or per-user calls. */
export async function loadAccountSummaries(db: any, ids: string[]): Promise<{ summaries: Map<string, AccountSummary>; warnings: string[] }> {
  const summaries = new Map<string, AccountSummary>(), warnings: string[] = []
  if (!ids.length) return { summaries, warnings }
  const [adults, partners, links] = await Promise.allSettled([
    db.from("trusted_adults").select("user_id").in("user_id", ids),
    db.from("benefactors").select("user_id").in("user_id", ids),
    readLinks(db, ids),
  ])
  const adultRows = adults.status === "fulfilled" && !adults.value.error ? adults.value.data : null
  const partnerRows = partners.status === "fulfilled" && !partners.value.error ? partners.value.data : null
  if (!adultRows || !partnerRows) warnings.push("Some account types could not be verified. They are marked unavailable below.")
  if (links.status === "rejected") warnings.push("Account links could not be loaded. Unavailable does not mean unlinked.")
  const adultIDs = new Set((adultRows ?? []).map((r: any) => r.user_id))
  const partnerIDs = new Set((partnerRows ?? []).map((r: any) => r.user_id))
  const names = new Map<string, string>()
  if (links.status === "fulfilled") {
    const linkedIds = [...new Set(links.value.map((r) => r.adult_user_id))]
    for (let offset = 0; offset < linkedIds.length; offset += 200) {
      try {
        const { data, error } = await db.from("trusted_adults").select("user_id,full_name").in("user_id", linkedIds.slice(offset, offset + 200))
        if (!error) for (const row of data ?? []) names.set(row.user_id, row.full_name)
      } catch { /* Counts remain accurate; missing names use an explicit fallback. */ }
    }
  }
  for (const id of ids) {
    const rows = links.status === "fulfilled" ? links.value.filter((r) => r.student_user_id === id) : null
    const connections = (type: string) => rows === null ? null : [...new Map(rows.filter((r) => r.link_type === type)
      .map((r) => [r.adult_user_id, { id: r.adult_user_id, name: names.get(r.adult_user_id) || "Name unavailable" }])).values()]
    summaries.set(id, {
      types: adultRows && partnerRows ? accountTypes(adultIDs.has(id), partnerIDs.has(id)) : null,
      family: connections("family"), guides: connections("mentor"),
    })
  }
  return { summaries, warnings }
}

/** Quote PostgREST search values so punctuation cannot inject another filter. */
export function searchFilter(columns: string[], raw: string): string {
  const literal = raw.trim().slice(0, 200).replace(/[\\%_*]/g, "\\$&").replace(/"/g, '\\"')
  return columns.map((column) => `${column}.ilike."%${literal}%"`).join(",")
}

export async function loadImpactPartners(db: any, { search, from, to }: { search?: string; from: number; to: number }) {
  try {
    let query = db.from("benefactors")
      .select("id,user_id,organization_name,contact_name,contact_email,organization_type,verification_status,created_at", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)
    if (search?.trim()) query = query.or(searchFilter(["organization_name", "contact_name", "contact_email"], search))
    const { data, error, count } = await query
    return { partners: error ? [] : data ?? [], count: error ? null : count ?? 0,
      error: error ? "Impact partner accounts could not be loaded. Please retry; existing accounts have not been changed." : null }
  } catch {
    return { partners: [], count: null, error: "Impact partner accounts could not be loaded. Please retry; existing accounts have not been changed." }
  }
}
