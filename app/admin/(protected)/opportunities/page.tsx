import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog"
import { OpportunityActionsMenu } from "@/components/opportunity-actions-menu"
import { PlusCircle, Search, GraduationCap, DollarSign, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export const revalidate = 0

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; type?: string }
}) {
  const supabase = createAdminClient()

  let query = supabase.from("opportunities").select("*").order("created_at", { ascending: false })

  if (searchParams.search) {
    query = query.or(`title.ilike.%${searchParams.search}%,provider.ilike.%${searchParams.search}%`)
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status)
  }
  if (searchParams.type) {
    // Comma-separated so "Scholarships" can match both scholarship and grant
    // rows — the same grouping students see, not just a single raw type.
    const types = searchParams.type.split(",").map((t) => t.trim()).filter(Boolean)
    query = types.length > 1 ? query.in("opportunity_type", types) : query.eq("opportunity_type", types[0])
  }

  const { data: opportunities, error } = await query

  if (error) {
    console.error("Error fetching opportunities:", error)
  }

  const stats = {
    total: opportunities?.length ?? 0,
    active: opportunities?.filter((o) => o.status === "active").length ?? 0,
    closingSoon:
      opportunities?.filter((o) => {
        if (!o.deadline || o.status !== "active") return false
        const days = (new Date(o.deadline).getTime() - Date.now()) / 86_400_000
        return days >= 0 && days <= 30
      }).length ?? 0,
    totalAward: opportunities?.reduce((sum, o) => sum + (o.award_amount ? Number(o.award_amount) : 0), 0) ?? 0,
  }

  const formatDeadline = (o: any) => {
    if (o.is_rolling) return "Rolling"
    if (!o.deadline) return "—"
    const days = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86_400_000)
    const date = new Date(o.deadline).toLocaleDateString()
    if (days < 0) return `${date} (expired)`
    if (days <= 30) return `${date} (${days}d left)`
    return date
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Opportunities
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Scholarships, competitions and grants matched to students via the Learning Graph
            </p>
          </div>
          <OpportunityFormDialog>
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Opportunity
            </Button>
          </OpportunityFormDialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="mt-2 text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-500/20 p-3">
                <GraduationCap className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="mt-2 text-3xl font-bold">{stats.active}</p>
              </div>
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Closing soon</p>
                <p className="mt-2 text-3xl font-bold">{stats.closingSoon}</p>
              </div>
              <div className="rounded-full bg-amber-500/20 p-3">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total value</p>
                <p className="mt-2 text-3xl font-bold">${stats.totalAward.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-purple-500/20 p-3">
                <DollarSign className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 space-y-3">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="search" placeholder="Search by title or provider…" defaultValue={searchParams.search} className="pl-9" />
            </div>
            {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
            {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
            <div className="flex gap-2">
              {["", "active", "draft", "closed"].map((s) => (
                <Link
                  key={s || "all"}
                  href={`/admin/opportunities${buildQuery({ status: s || undefined, type: searchParams.type, search: searchParams.search })}`}
                  className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                    (searchParams.status ?? "") === s ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                  }`}
                >
                  {s || "All"}
                </Link>
              ))}
            </div>
          </form>

          {/*
            Category filter, matching the two named views students see under
            Opportunities (Scholarships = scholarship+grant, STEAM Programs =
            program). "Competition" is surfaced as its own filter too — it's a
            real, creatable type with no dedicated student-facing nav item, so
            it needs to stay reachable and visible here rather than getting
            lost among "All".
          */}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <span className="self-center text-xs font-medium text-muted-foreground">Category:</span>
            {[
              { key: "", label: "All types" },
              { key: "scholarship,grant", label: "Scholarships" },
              { key: "program", label: "STEAM Programs" },
              { key: "competition", label: "Competitions" },
            ].map((c) => (
              <Link
                key={c.key || "all-types"}
                href={`/admin/opportunities${buildQuery({ status: searchParams.status, type: c.key || undefined, search: searchParams.search })}`}
                className={`rounded-full border px-3 py-1 text-xs ${
                  (searchParams.type ?? "") === c.key ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </Card>

        {/* List */}
        <div className="space-y-3">
          {!opportunities || opportunities.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted-foreground">
              No opportunities yet. Add one to make it visible on the student Opportunities page.
            </Card>
          ) : (
            opportunities.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{o.title}</h3>
                      <Badge variant={o.status === "active" ? "default" : o.status === "draft" ? "secondary" : "outline"}>
                        {o.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {o.opportunity_type}
                      </Badge>
                    </div>
                    {o.provider && <p className="mt-1 text-sm text-muted-foreground">{o.provider}</p>}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {o.award_amount != null && (
                        <span>
                          {o.award_currency} {Number(o.award_amount).toLocaleString()}
                        </span>
                      )}
                      <span>{formatDeadline(o)}</span>
                      {o.countries && <span>{o.countries.join(", ")}</span>}
                      {o.syllabi && <span>{o.syllabi.join(", ")}</span>}
                      {o.min_exam_readiness != null && <span>Min readiness: {o.min_exam_readiness}</span>}
                    </div>
                  </div>
                  <OpportunityActionsMenu opportunity={o} />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
