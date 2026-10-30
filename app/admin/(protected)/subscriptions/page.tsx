import { createAdminClient } from "@/lib/supabase/admin"
import { getPolarSubscriptionAnalytics } from "@/lib/polar-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, TrendingUp, DollarSign, Users, Calendar, AlertCircle } from "lucide-react"
import { SubscriptionActionsMenu } from "@/components/subscription-actions-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPagination } from "@/components/admin-pagination"
import { ADMIN_PAGE_SIZE, buildPaginationInfo, getPageParams } from "@/lib/admin-pagination"

export const revalidate = 0

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  const polarAnalytics = await getPolarSubscriptionAnalytics()
  const { page, from, to } = getPageParams(params.page)

  // One page of subscriptions, joined to the learner's name and email and
  // counted in the database (admin_list_subscriptions, scripts/067).
  // Previously: search could only match the plan name or a Polar id, the
  // "All" tab showed the size of the current page, and "Active" counted
  // every free learner's auto-created Scholar row.
  const filter = params.status && params.status !== "all" ? params.status : "all"
  const [{ data: rows, error: subscriptionsError }, { data: statsData }] = await Promise.all([
    supabase.rpc("admin_list_subscriptions", {
      p_search: params.search?.trim() || null,
      p_filter: filter,
      p_limit: to - from + 1,
      p_offset: from,
    }),
    supabase.rpc("admin_subscription_stats"),
  ])
  if (subscriptionsError) console.error("Error fetching subscriptions (has migration 067 been run?):", subscriptionsError)

  const subscriptions = (rows ?? []).map((r: any) => ({
    ...r,
    profiles: { display_name: r.display_name, avatar_url: r.avatar_url },
  }))
  const count = subscriptions.length > 0 ? Number((rows as any[])[0].total_count) : 0

  const stats: any = statsData ?? {}
  const byStatus: Record<string, number> = stats.by_status ?? {}
  const tabs: [string, string, number][] = [
    ["all", "All", stats.rows_total ?? 0],
    ["genius", "Paying Genius", stats.genius_paying ?? 0],
    ["active", "Active", byStatus.active ?? 0],
    ["trialing", "Trial", byStatus.trialing ?? 0],
    ["canceling", "Canceling", byStatus.canceling ?? 0],
    ["past_due", "Past due", byStatus.past_due ?? 0],
    ["canceled", "Canceled", byStatus.canceled ?? 0],
    ["expired", "Expired", byStatus.expired ?? 0],
    ["scholar", "Free (Scholar)", stats.scholar_rows ?? 0],
  ]

  const activeStatus = params.status || "all"
  const pagination = buildPaginationInfo(page, count ?? 0, ADMIN_PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Subscription Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor and manage user subscriptions with real-time Polar.sh data
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden border-2 border-blue-500/20 dark:border-blue-400/20 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-400/10 dark:to-cyan-400/10" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {polarAnalytics.activeSubscriptions}
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              <span className="text-green-600 dark:text-green-400">+{polarAnalytics.newSubscriptionsThisMonth}</span>{" "}
              new this month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-green-500/20 dark:border-green-400/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-400/10 dark:to-emerald-400/10" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Monthly Revenue (MRR)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              ${polarAnalytics.monthlyRecurringRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              <span
                className={
                  polarAnalytics.mrrGrowthPercentage >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {polarAnalytics.mrrGrowthPercentage >= 0 ? "+" : ""}
                {polarAnalytics.mrrGrowthPercentage.toFixed(1)}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-purple-500/20 dark:border-purple-400/20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-400/10 dark:to-pink-400/10" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Trial Users</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {polarAnalytics.trialingSubscriptions}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Currently on trial period</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-orange-500/20 dark:border-orange-400/20 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-400/10 dark:to-amber-400/10" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">Churn Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {polarAnalytics.churnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              {polarAnalytics.canceledThisMonth} canceled this month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-red-500/20 dark:border-red-400/20 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/10 dark:from-red-400/10 dark:to-rose-400/10" />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100">
              Scheduled Cancellations
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {polarAnalytics.scheduledCancellations}
            </div>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">Will cancel at period end</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeStatus} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {tabs.map(([value, label, n]) => (
            <TabsTrigger key={value} value={value} asChild>
              <a href={`/admin/subscriptions?status=${value}`} className="whitespace-nowrap">
                {label} ({n.toLocaleString()})
              </a>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeStatus} className="mt-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Subscriptions
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <form action="/admin/subscriptions" method="get">
                  <input type="hidden" name="status" value={activeStatus} />
                  <Input
                    name="search"
                    placeholder="Search by name, email or Polar ID..."
                    className="pl-9"
                    defaultValue={params.search}
                  />
                </form>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Period</TableHead>
                    <TableHead className="hidden md:table-cell">Customer ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions && subscriptions.length > 0 ? (
                    subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div className="font-medium">{subscription.profiles?.display_name || "Unknown User"}</div>
                          {subscription.email && <div className="text-xs text-muted-foreground">{subscription.email}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {subscription.plan_type || "N/A"}
                            {subscription.plan_type === "genius" && subscription.effective_plan !== "genius" && (
                              <span className="ml-1 text-xs text-muted-foreground">(no access)</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                subscription.status === "active"
                                  ? "default"
                                  : subscription.status === "trialing"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="capitalize w-fit"
                            >
                              {subscription.status || "unknown"}
                            </Badge>
                            {subscription.status === "canceling" && (
                              <Badge variant="destructive" className="w-fit text-xs">
                                Cancels at period end
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {subscription.current_period_start && subscription.current_period_end ? (
                            <>
                              {new Date(subscription.current_period_start).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              -{" "}
                              {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {subscription.polar_customer_id || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <SubscriptionActionsMenu subscription={subscription} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {params.search ? "No subscriptions found matching your search" : "No subscriptions yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <AdminPagination
                info={pagination}
                basePath="/admin/subscriptions"
                params={{ search: params.search, status: params.status }}
                label="subscriptions"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
