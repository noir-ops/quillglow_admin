"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export interface UserEmailData {
  id: string
  display_name: string | null
  email: string
  created_at: string
  last_sign_in_at?: string | null
}

export interface PaginatedUsersResult {
  users: UserEmailData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * One page of learners with their emails, plus the exact total.
 *
 * Previously this loaded auth users with `perPage: 1000` (only the FIRST
 * 1,000 accounts) and a profiles query also capped at 1,000 rows, then
 * counted what came back — so the page showed 1,000 of 23k learners and
 * search could only find people within that first 1,000. The join, search,
 * paging and count now happen in the database (admin_list_user_emails,
 * scripts/067).
 */
export async function getUsersWithEmails(page = 1, limit = 25, searchQuery = ""): Promise<PaginatedUsersResult> {
  const adminClient = createAdminClient()
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  const safePage = Math.max(page, 1)
  const { data, error } = await adminClient.rpc("admin_list_user_emails", {
    p_search: searchQuery.trim() || null,
    p_limit: safeLimit,
    p_offset: (safePage - 1) * safeLimit,
  })
  if (error) {
    console.error("Error in getUsersWithEmails (has migration 067 been run?):", error)
    throw error
  }
  const rows = (data ?? []) as any[]
  const total = rows.length > 0 ? Number(rows[0].total_count) : await countMatching(searchQuery)
  return {
    users: rows.map((r) => ({
      id: r.id,
      display_name: r.display_name,
      email: r.email,
      created_at: r.created_at,
      last_sign_in_at: r.last_sign_in_at,
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  }
}

// A page past the end returns no rows (and so no total_count); fetch the
// real total so the pager still shows the right number.
async function countMatching(searchQuery: string): Promise<number> {
  const { data } = await createAdminClient().rpc("admin_list_user_emails", {
    p_search: searchQuery.trim() || null,
    p_limit: 1,
    p_offset: 0,
  })
  return data && (data as any[]).length > 0 ? Number((data as any[])[0].total_count) : 0
}

/**
 * Every matching learner's email — used by "select all across pages" for
 * email campaigns. Returned by the database as a single array, so the
 * 1,000-row limit can't cut it short (it previously reached ~1,000 of 23k).
 */
export async function getAllUserEmails(searchQuery = ""): Promise<string[]> {
  const { data, error } = await createAdminClient().rpc("admin_all_user_emails", {
    p_search: searchQuery.trim() || null,
  })
  if (error) {
    console.error("Error in getAllUserEmails:", error)
    throw error
  }
  return (data as string[] | null) ?? []
}
