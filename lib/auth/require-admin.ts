import "server-only"
import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/auth/admin"
import { redirect } from "next/navigation"

/** Check before reading service-role account data, in addition to middleware. */
export async function requireAdmin() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user || !(await isAdminUser(client, user))) redirect("/admin/login?error=not_admin")
}
