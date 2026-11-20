import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"
export default async function StoreNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!(await isAdminUser(supabase, user))) redirect("/admin/login")
  const admin = createAdminClient()
  const { data, error } = await admin.from("store_launch_subscriptions")
    .select("user_id,subscribed,subscribed_at,launch_notified_at").eq("subscribed", true)
    .order("subscribed_at", { ascending: false }).limit(100)
  const { count } = await admin.from("store_launch_subscriptions").select("user_id", { count: "exact", head: true }).eq("subscribed", true)
  return <div className="space-y-6 p-6">
    <div><h1 className="text-3xl font-bold">Store launch notifications</h1><p className="text-muted-foreground">{count ?? 0} active signups. The Store is coming soon.</p></div>
    {error ? <p role="alert">Could not load signups. Run scripts/070_store_launch_notifications.sql from the main app.</p> : <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Account ID</th><th className="p-3">Signed up</th><th className="p-3">Launch notice</th></tr></thead>
        <tbody>{(data ?? []).map((row) => <tr key={row.user_id} className="border-b"><td className="p-3 font-mono text-xs">{row.user_id}</td><td className="p-3">{new Date(row.subscribed_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC</td><td className="p-3">{row.launch_notified_at ? "Queued" : "Waiting for launch"}</td></tr>)}</tbody>
      </table>{!data?.length && <p className="p-4 text-muted-foreground">No active signups yet.</p>}
    </div>}
    <p className="text-sm text-muted-foreground">Showing the latest 100 active signups. Notifications use each account's current verified email. No launch announcement is sent from this page.</p>
  </div>
}
