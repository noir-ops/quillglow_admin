import { createAdminClient } from "@/lib/supabase/admin" 
import { DashboardClient } from "@/components/dashboard-client"
import { processUserGrowth, processContactStatus, processActivity } from "@/lib/dashboard-utils"

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // Fetch analytics data with accurate date comparisons for MoM growth
  const [
    { count: totalUsers },
    { count: currentMonthUsers },
    { count: lastMonthUsers },
    { count: totalContacts },
    { count: currentMonthContacts },
    { count: lastMonthContacts },
    { count: activeSubscriptions },
    { count: currentMonthSubscriptions },
    { count: lastMonthSubscriptions },
    { data: monthlyUsers },
    { data: contactsByStatus },
    { data: recentActivity },
    { data: allUsers },
  ] = await Promise.all([
    // Users
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
      
    // Contacts
    supabase.from("contact_messages").select("*", { count: "exact", head: true }),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
      
    // Subscriptions
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
      
    // Chart & Activity Data
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", twelveMonthsAgo.toISOString()),
    supabase.from("contact_messages").select("status"),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("profiles").select("created_at, updated_at"),
  ])

  // 1. Calculate Month-over-Month Growth (Comparing new this month vs new last month)
  const userGrowth =
    lastMonthUsers && lastMonthUsers > 0
      ? ((((currentMonthUsers || 0) - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
      : "0.0"

  const contactGrowth =
    lastMonthContacts && lastMonthContacts > 0
      ? ((((currentMonthContacts || 0) - lastMonthContacts) / lastMonthContacts) * 100).toFixed(1)
      : "0.0"

  const subscriptionGrowth =
    lastMonthSubscriptions && lastMonthSubscriptions > 0
      ? ((((currentMonthSubscriptions || 0) - lastMonthSubscriptions) / lastMonthSubscriptions) * 100).toFixed(1)
      : "0.0"

  // 2. Calculate Current Engagement
  const activeUsersCount =
    allUsers?.filter((user) => {
      const updatedAt = new Date(user.updated_at || user.created_at)
      return updatedAt >= thirtyDaysAgo
    }).length || 0

  const engagementRate = totalUsers && totalUsers > 0 ? ((activeUsersCount / totalUsers) * 100).toFixed(1) : "0.0"

  // 3. Calculate Last Month's Engagement Correctly
  const lastMonthActiveUsers =
    allUsers?.filter((user) => {
      const updatedAt = new Date(user.updated_at || user.created_at)
      return updatedAt >= sixtyDaysAgo && updatedAt < thirtyDaysAgo
    }).length || 0

  // Total users as of 30 days ago = Total current users minus the brand new users from the last 30 days
  const totalUsersAsOfLastMonth = (totalUsers || 0) - (currentMonthUsers || 0)

  const lastMonthEngagementRate =
    totalUsersAsOfLastMonth > 0 ? (lastMonthActiveUsers / totalUsersAsOfLastMonth) * 100 : 0

  const engagementChange =
    lastMonthEngagementRate > 0
      ? (((Number.parseFloat(engagementRate) - lastMonthEngagementRate) / lastMonthEngagementRate) * 100).toFixed(1)
      : "0.0"

  // Process data for charts
  const userGrowthData = processUserGrowth(monthlyUsers || [])
  const contactStatusData = processContactStatus(contactsByStatus || [])
  const activityData = processActivity(recentActivity || [])

  const stats = [
    {
      title: "Total Users",
      value: totalUsers || 0,
      icon: "users" as const,
      change: `${Number.parseFloat(userGrowth) >= 0 ? "+" : ""}${userGrowth}%`,
      changeType: Number.parseFloat(userGrowth) >= 0 ? ("positive" as const) : ("negative" as const),
    },
    {
      title: "Contact Messages",
      value: totalContacts || 0,
      icon: "message-square" as const,
      change: `${Number.parseFloat(contactGrowth) >= 0 ? "+" : ""}${contactGrowth}%`,
      changeType: Number.parseFloat(contactGrowth) >= 0 ? ("positive" as const) : ("negative" as const),
    },
    {
      title: "Active Subscriptions",
      value: activeSubscriptions || 0,
      icon: "credit-card" as const,
      change: `${Number.parseFloat(subscriptionGrowth) >= 0 ? "+" : ""}${subscriptionGrowth}%`,
      changeType: Number.parseFloat(subscriptionGrowth) >= 0 ? ("positive" as const) : ("negative" as const),
    },
    {
      title: "Engagement Rate",
      value: `${engagementRate}%`,
      icon: "trending-up" as const,
      change: `${Number.parseFloat(engagementChange) >= 0 ? "+" : ""}${engagementChange}%`,
      changeType: Number.parseFloat(engagementChange) >= 0 ? ("positive" as const) : ("negative" as const),
    },
  ]

  return <DashboardClient stats={stats} userGrowthData={userGrowthData} contactStatusData={contactStatusData} activityData={activityData} />
}