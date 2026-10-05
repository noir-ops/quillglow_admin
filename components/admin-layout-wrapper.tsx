import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  // Open tickets (new, or a learner replied) — shown as a badge on Contacts so
  // incoming support is visible on every admin page, not only by email.
  let openTickets = 0
  try {
    const { data } = await createAdminClient().rpc("admin_ticket_stats")
    openTickets = Number((data as any)?.open ?? 0)
  } catch {
    // badge is best-effort; never block the admin panel on it
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar openTickets={openTickets} />
      <main className="flex-1 overflow-y-auto bg-background pt-16 lg:pt-0">{children}</main>
    </div>
  )
}
