import { getAmbassadors, getAmbassadorStats } from "./actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AmbassadorsTable } from "@/components/ambassadors-table"
import { Search, Users, UserCheck, Clock, Award, TrendingUp, Gift } from "lucide-react"

export const revalidate = 0

export default async function AmbassadorsPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string }
}) {
  const ambassadors = await getAmbassadors(searchParams.status)
  const stats = await getAmbassadorStats()

  const filteredAmbassadors = ambassadors.filter((ambassador) => {
    if (!searchParams.search) return true
    const searchLower = searchParams.search.toLowerCase()
    return (
      ambassador.name?.toLowerCase().includes(searchLower) ||
      ambassador.email?.toLowerCase().includes(searchLower) ||
      ambassador.referral_code?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Ambassador Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage ambassador applications, referrals, and rewards
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Ambassadors</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.approved} Active
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {stats.pending} Pending
                  </Badge>
                </div>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                <p className="mt-2 text-3xl font-bold">{stats.totalReferrals}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.verifiedReferrals} verified, {stats.pendingReferrals} pending
                </p>
              </div>
              <div className="rounded-full bg-green-500/20 p-3">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rewards Issued</p>
                <p className="mt-2 text-3xl font-bold">{stats.rewardsIssued}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.rewardsPending} pending</p>
              </div>
              <div className="rounded-full bg-purple-500/20 p-3">
                <Gift className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Actions</p>
                <p className="mt-2 text-3xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">Require review</p>
              </div>
              <div className="rounded-full bg-orange-500/20 p-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <form>
                <Input
                  placeholder="Search by name, email, or referral code..."
                  className="pl-10"
                  defaultValue={searchParams.search}
                  name="search"
                />
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={!searchParams.status || searchParams.status === "all" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/ambassadors">All</a>
              </Button>
              <Button variant={searchParams.status === "pending" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/ambassadors?status=pending">Pending</a>
              </Button>
              <Button variant={searchParams.status === "approved" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/ambassadors?status=approved">Approved</a>
              </Button>
              <Button variant={searchParams.status === "rejected" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/ambassadors?status=rejected">Rejected</a>
              </Button>
              <Button variant={searchParams.status === "suspended" ? "default" : "outline"} size="sm" asChild>
                <a href="/admin/ambassadors?status=suspended">Suspended</a>
              </Button>
            </div>
          </div>
        </Card>

        {/* Ambassadors Table */}
        {filteredAmbassadors && filteredAmbassadors.length > 0 ? (
          <AmbassadorsTable ambassadors={filteredAmbassadors} />
        ) : (
          <Card className="p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No ambassadors found</h3>
              <p className="text-sm text-muted-foreground">
                {searchParams.search || searchParams.status
                  ? "Try adjusting your filters to see more results."
                  : "Ambassadors will appear here once they apply through the program."}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
