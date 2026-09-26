/**
 * Pagination helpers for admin list pages.
 *
 * Every admin list page used to run an unbounded `select("*")` and render
 * every row it got back. That works with a few hundred rows and falls over
 * badly past a few thousand — the server serialises the whole table into the
 * RSC payload, and the browser then mounts one <TableRow> (plus a dropdown
 * menu) per record. That's what causes the freeze/crash.
 *
 * These helpers keep it to one page of rows plus an exact count, so page
 * weight stays flat no matter how big the table gets.
 */

/** Rows per page for admin tables. */
export const ADMIN_PAGE_SIZE = 50

/**
 * Hard cap for admin list pages that don't have full pagination yet.
 * Keeps a runaway table from freezing the browser; those pages rely on
 * their search/filter inputs to narrow results below this.
 */
export const ADMIN_LIST_CAP = 200

export interface PageParams {
  page: number
  from: number
  to: number
}

/**
 * Parses a `?page=` search param into a safe zero-based Supabase range.
 * Invalid, missing or out-of-range values fall back to page 1.
 */
export function getPageParams(rawPage: string | undefined, pageSize = ADMIN_PAGE_SIZE): PageParams {
  const parsed = Number.parseInt(rawPage ?? "1", 10)
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  const from = (page - 1) * pageSize
  return { page, from, to: from + pageSize - 1 }
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  /** 1-based index of the first row on this page (0 when empty). */
  firstRow: number
  /** 1-based index of the last row on this page (0 when empty). */
  lastRow: number
}

export function buildPaginationInfo(page: number, total: number, pageSize = ADMIN_PAGE_SIZE): PaginationInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    firstRow,
    lastRow,
  }
}

/**
 * Builds a querystring preserving existing filters while changing the page.
 * Blank values are dropped so URLs stay clean.
 */
export function buildPageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") search.set(key, value)
  }
  if (page > 1) search.set("page", String(page))
  const qs = search.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
