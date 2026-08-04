import { createAdminClient } from "@/lib/supabase/admin"
import { getPolarSubscriptionAnalytics } from "@/lib/polar-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, TrendingUp, DollarSign, Users, Calendar, AlertCircle } from "lucide-react"
import { SubscriptionActionsMenu } from "@/components/subscription-actions-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const revalidate = 0

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  const polarAnalytics = await getPolarSubscriptionAnalytics()

  // Fetch subscriptions separately
  let subscriptionsQuery = supabase.from("subscriptions").select("*").order("created_at", { ascending: false })

  if (params.search) {
    subscriptionsQuery = subscriptionsQuery.or(
      `plan_type.ilike.%${params.search}%,polar_customer_id.ilike.%${params.search}%`,
    )
  }

  if (params.status && params.status !== "all") {
    subscriptionsQuery = subscriptionsQuery.eq("status", params.status)
  }

  const { data: subscriptionsData, error: subscriptionsError } = await subscriptionsQuery

  if (subscriptionsError) {
    console.error("Error fetching subscriptions:", subscriptionsError)
  }

  // Fetch all profiles to join with subscriptions
  const { data: profilesData } = await supabase.from("profiles").select("id, display_name, avatar_url")

  // Create a map of profiles for quick lookup
  const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || [])

  // Join subscriptions with profiles manually
  const subscriptions = subscriptionsData?.map((sub) => ({
    ...sub,
    profiles: profilesMap.get(sub.user_id) || null,
  }))

  // Calculate stats from database
  const activeCount = subscriptions?.filter((s) => s.status === "active").length || 0
  const canceledCount = subscriptions?.filter((s) => s.status === "canceled").length || 0
  const trialingCount = subscriptions?.filter((s) => s.status === "trialing").length || 0
  const scheduledCancelCount = subscriptions?.filter((s) => s.status === "canceling").length || 0

  const activeStatus = params.status || "all"

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
          <TabsTrigger value="all" asChild>
            <a href="/admin/subscriptions?status=all" className="whitespace-nowrap">
              All ({subscriptions?.length || 0})
            </a>
          </TabsTrigger>
          <TabsTrigger value="active" asChild>
            <a href="/admin/subscriptions?status=active" className="whitespace-nowrap">
              Active ({activeCount})
            </a>
          </TabsTrigger>
          <TabsTrigger value="trialing" asChild>
            <a href="/admin/subscriptions?status=trialing" className="whitespace-nowrap">
              Trial ({trialingCount})
            </a>
          </TabsTrigger>
          <TabsTrigger value="canceled" asChild>
            <a href="/admin/subscriptions?status=canceled" className="whitespace-nowrap">
              Canceled ({canceledCount})
            </a>
          </TabsTrigger>
          <TabsTrigger value="canceling" asChild>
            <a href="/admin/subscriptions?status=canceling" className="whitespace-nowrap">
              Scheduled ({scheduledCancelCount})
            </a>
          </TabsTrigger>
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
                    placeholder="Search by plan type or customer ID..."
                    className="pl-9"
                    defaultValue={params.search}
                  />
                </form>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
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
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {subscription.plan_type || "N/A"}
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
                          {subscription.stripe_customer_id || "N/A"}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
