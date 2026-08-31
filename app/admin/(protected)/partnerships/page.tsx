import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PartnershipFormDialog } from "@/components/partnership-form-dialog"
import { PartnershipsTable } from "@/components/partnerships-table"
import { PlusCircle, Search, Building2, Star } from "lucide-react"

export const revalidate = 0

export default async function PartnershipsPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  const supabase = createAdminClient()

  let query = supabase.from("partners").select("*").order("created_at", { ascending: false })

  if (searchParams.search) {
    query = query.or(`name.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`)
  }

  const { data: partners, error } = await query

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
            <p className="mt-2 text-sm text-muted-foreground">Manage your business partnerships and collaborations</p>
          </div>
          <PartnershipFormDialog>
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Partner
            </Button>
          </PartnershipFormDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Partners</p>
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
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search partners by name or description..."
              className="pl-10"
              defaultValue={searchParams.search}
            />
          </div>
        </Card>

        {/* Partners Table */}
        <PartnershipsTable partners={partners || []} />
      </div>
    </div>
  )
}
