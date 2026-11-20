import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Who may use the admin panel.
 *
 * The admin panel shares its Supabase login system with the main app, so
 * "signed in" alone means nothing — any learner is signed in. An admin is:
 *   - a user with role 'admin' in public.user_roles (only the server can
 *     write that table; grant with  select public.grant_admin_by_email('…')
 *     in the Supabase SQL editor — scripts/069), or
 *   - an email listed in the ADMIN_EMAILS env var (comma-separated), so the
 *     team can never be locked out.
 *
 * NOT the `admins` table: the admin panel's first migration added every
 * signup to it automatically (and let users edit their own role), so every
 * learner has a row there.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdminUser(supabase: any, user: { id: string; email?: string | null } | null): Promise<boolean> {
  if (!user) return false
  if (user.email && adminEmails().includes(user.email.toLowerCase())) return true

  // Server-key lookup, so it can't be blocked by row-security settings.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    try {
      const service = createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data, error } = await service.rpc("is_platform_admin", { p_user_id: user.id })
      if (!error) return data === true
      // is_platform_admin missing (069 not run yet) → fall through to the direct read
      console.warn("[admin-auth] is_platform_admin unavailable:", error.message)
      const { data: row, error: readError } = await service
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
      if (!readError) return !!row
    } catch (err) {
      console.error("[admin-auth] service lookup failed:", err)
    }
  }

  // Last resort: the signed-in user's own role row (readable by them).
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle()
  if (error) {
    console.error("[admin-auth] role lookup failed:", error.message)
    return false // fail closed
  }
  return !!data
}

/** Paths that authenticate themselves (shared secret / signature). */
export const SELF_AUTHENTICATED_API = ["/api/cron/", "/api/mailersend/inbound"]
