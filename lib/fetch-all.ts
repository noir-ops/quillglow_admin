/**
 * Supabase returns at most 1,000 rows per request. Several admin pages
 * fetched whole tables in one request and then counted or listed the
 * result, so everything past row 1,000 silently disappeared. These helpers
 * read every page.
 *
 * Use them for moderate tables that a page genuinely needs in full. For
 * large tables, count or aggregate in the database instead (scripts/067).
 */
const PAGE = 1000
const HARD_CAP = 200_000 // a runaway-loop guard, far above any table we page through

export async function fetchAllRows<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<{ data: T[]; error: any }> {
  const out: T[] = []
  for (let from = 0; from < HARD_CAP; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) return { data: out, error }
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return { data: out, error: null }
}

/**
 * Rows whose `column` is in `ids`, in chunks — an `.in()` over thousands of
 * ids is both capped at 1,000 results and liable to exceed URL limits.
 */
export async function fetchByIds<T = any>(
  supabase: any,
  table: string,
  columns: string,
  ids: (string | number)[],
  column = "id",
): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter((v) => v !== null && v !== undefined)))
  const out: T[] = []
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase.from(table).select(columns).in(column, unique.slice(i, i + 200))
    if (error) {
      console.error(`[fetchByIds] ${table}:`, error.message)
      continue
    }
    out.push(...((data ?? []) as T[]))
  }
  return out
}
