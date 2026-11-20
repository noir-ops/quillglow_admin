import { createAdminClient } from "@/lib/supabase/admin"
import { DashboardClient } from "@/components/dashboard-client"

export const revalidate = 0

const pct = (now: number, before: number) => (before > 0 ? (((now - before) / before) * 100).toFixed(1) : now > 0 ? "100.0" : "0.0")
const signed = (v: string) => `${Number.parseFloat(v) >= 0 ? "+" : ""}${v}%`

/**
 * Every figure comes from admin_dashboard_stats() (scripts/067), which counts
 * inside the database. Previously:
 *  - "Active Subscriptions" counted every free learner's auto-created
 *    Scholar row (status 'active'), not paying subscribers;
 *  - engagement was computed from a profiles fetch capped at 1,000 rows (so
 *    it could never exceed ~4% of 23k learners) using profile edits as
 *    "activity";
 *  - the growth and contact charts were built from capped fetches, so months
 *    and statuses went missing past 1,000 rows;
 *  - contact counts included every reply as if it were a new message.
 */
export default async function DashboardPage() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("admin_dashboard_stats")
  if (error) console.error("[admin/dashboard] stats failed (has migration 067 been run?):", error.message)
  const d: any = data ?? {}
  const t: any = d.tickets ?? {}

  const userGrowth = pct(d.users_new_30d ?? 0, d.users_new_prev_30d ?? 0)
  const contactGrowth = pct(t.new_30d ?? 0, t.new_prev_30d ?? 0)
  const subscriptionGrowth = pct(d.genius_new_30d ?? 0, d.genius_new_prev_30d ?? 0)
  const usersTotal = d.users_total ?? 0
  const engagementRate = usersTotal > 0 ? (((d.active_30d ?? 0) / usersTotal) * 100).toFixed(1) : "0.0"

  const monthLabel = (ym: string) =>
    new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
  const userGrowthData = (d.signups_by_month ?? []).map((m: any) => ({ month: monthLabel(m.month), users: m.count }))
  const activityData = (d.signups_by_day ?? []).map((x: any) => ({
    day: new Date(`${x.day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    activity: x.count,
  }))
  const contactStatusData = [
    ["Open", (t.open ?? 0)],
    ["In progress", t.in_progress ?? 0],
    ["Replied", t.replied ?? 0],
    ["Resolved", t.resolved ?? 0],
    ["Closed", t.closed ?? 0],
  ]
    .filter(([, n]) => (n as number) > 0)
    .map(([status, count]) => ({ status: status as string, count: count as number }))

  const stats = [
    {
      title: "Total Users",
      value: usersTotal,
      icon: "users" as const,
      change: `${signed(userGrowth)} new vs prior 30 days`,
      changeType: Number.parseFloat(userGrowth) >= 0 ? ("positive" as const) : ("negative" as const),
    },
    {
      title: "Support Tickets",
      value: t.total ?? 0,
      icon: "message-square" as const,
      change: `${t.open ?? 0} open · ${signed(contactGrowth)} new`,
      changeType: (t.open ?? 0) > 0 ? ("negative" as const) : ("positive" as const),
    },
    {
      title: "Paying Genius Subscribers",
      value: d.genius_paying ?? 0,
      icon: "credit-card" as const,
      change: `${signed(subscriptionGrowth)} new vs prior 30 days`,
      changeType: Number.parseFloat(subscriptionGrowth) >= 0 ? ("positive" as const) : ("negative" as const),
    },
    {
      title: "Active Learners (30 days)",
      value: `${(d.active_30d ?? 0).toLocaleString()} · ${engagementRate}%`,
      icon: "trending-up" as const,
      // Only a learner's LATEST sign-in is stored, so a true "active last
      // month" comparison isn't available — show the 7-day figure instead.
      change: `${(d.active_7d ?? 0).toLocaleString()} in the last 7 days`,
      changeType: "positive" as const,
    },
  ]

  return <DashboardClient stats={stats} userGrowthData={userGrowthData} contactStatusData={contactStatusData} activityData={activityData} />
}
