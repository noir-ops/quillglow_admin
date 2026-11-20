import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PartnershipFormDialog } from "@/components/partnership-form-dialog"
import { PartnershipsTable } from "@/components/partnerships-table"
import { PlusCircle, Search, Building2, Star } from "lucide-react"
import { ADMIN_LIST_CAP, ADMIN_PAGE_SIZE, getPageParams, buildPaginationInfo } from "@/lib/admin-pagination"
import { AdminPagination } from "@/components/admin-pagination"
import { loadImpactPartners, searchFilter } from "@/lib/admin/account-directory"
import { ImpactPartnerAccounts } from "@/components/impact-partner-accounts"
import { requireAdmin } from "@/lib/auth/require-admin"
import Link from "next/link"

export const revalidate = 0

export default async function PartnershipsPage({
  searchParams: searchParamsPromise,
}: {
  // Next.js 16: searchParams is a Promise. Reading it without awaiting
  // gave undefined for every filter, so tabs/filters silently did nothing.
  searchParams: Promise<{ search?: string; impactSearch?: string; page?: string }>
}) {
  await requireAdmin()
  const searchParams = await searchParamsPromise
  const supabase = createAdminClient()
  const { page, from, to } = getPageParams(searchParams.page)

  let query = supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_CAP)

  if (searchParams.search) {
    query = query.or(searchFilter(["name", "description"], searchParams.search))
  }

  const [{ data: partners, error }, impact] = await Promise.all([
    query,
    loadImpactPartners(supabase, { search: searchParams.impactSearch, from, to }),
  ])
  const impactPagination = buildPaginationInfo(page, impact.count ?? 0, ADMIN_PAGE_SIZE)

  if (error) {
    console.error("Error fetching partners:", error)
  }

  const stats = {
    total: partners?.length || 0,
    featured: partners?.filter((p) => p.featured).length || 0,
    types: [...new Set(partners?.map((p) => p.type).filter(Boolean) || [])].length,
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Partnership Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage directory partnerships and registered impact partner accounts</p>
          </div>
          <PartnershipFormDialog>
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Partner
            </Button>
          </PartnershipFormDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Directory Partners</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Featured</p>
                <p className="mt-2 text-3xl font-bold">{stats.featured}</p>
              </div>
              <div className="rounded-full bg-yellow-500/20 p-3">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partner Types</p>
                <p className="mt-2 text-3xl font-bold">{stats.types}</p>
              </div>
              <div className="rounded-full bg-purple-500/20 p-3">
                <Building2 className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <p className="text-sm font-medium text-muted-foreground">{searchParams.impactSearch ? "Matching Impact Accounts" : "Impact Partner Accounts"}</p>
            <p className="mt-2 text-3xl font-bold">{impact.count ?? "Unavailable"}</p>
          </Card>
        </div>

        <Card id="impact-accounts">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Impact partner accounts</CardTitle><Link className="text-sm font-medium underline" href="/admin/opportunities/review">Review organizations</Link></div>
            <p className="text-sm text-muted-foreground">Registered accounts, including pending verification. These accounts are separate from public directory listings.</p>
            <form action="/admin/partnerships" method="get" className="flex flex-wrap gap-2">
              {searchParams.search && <input type="hidden" name="search" value={searchParams.search} />}
              <Input aria-label="Search impact partner accounts" name="impactSearch" className="min-w-48 flex-1" placeholder="Search organization, contact or email..." defaultValue={searchParams.impactSearch} />
              <Button variant="outline" type="submit">Search accounts</Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-4">
            {impact.error ? <p role="alert" className="text-sm text-destructive">{impact.error}</p> : <>
              <ImpactPartnerAccounts partners={impact.partners} />
              <AdminPagination info={impactPagination} basePath="/admin/partnerships" params={{ search: searchParams.search, impactSearch: searchParams.impactSearch }} label="impact partner accounts" />
            </>}
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="p-4">
          <h2 className="mb-3 text-lg font-semibold">Directory partners</h2>
          <form action="/admin/partnerships" method="get" className="relative">
            {searchParams.impactSearch && <input type="hidden" name="impactSearch" value={searchParams.impactSearch} />}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search directory partners"
              name="search"
              placeholder="Search partners by name or description..."
              className="pl-10"
              defaultValue={searchParams.search}
            />
          </form>
        </Card>

        {/* Partners Table */}
        {error ? <p role="alert" className="text-sm text-destructive">Directory partners could not be loaded. Please retry.</p> : <PartnershipsTable partners={partners || []} />}
      </div>
    </div>
  )
}
