import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ShieldCheck } from "lucide-react"

export const revalidate = 0

/**
 * Audit log viewer — spec §22 requires administrative and high-risk actions to
 * be logged. The log has been recording since RBAC shipped; this makes it
 * readable, which is the point of keeping one.
 *
 * Read-only by design. An audit log that can be edited from the UI is not an
 * audit log.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; q?: string }
}) {
  const supabase = createAdminClient()

  let query = supabase
    .from("audit_log")
    .select("id, actor_id, actor_role, action, resource_type, resource_id, before_state, after_state, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (searchParams.action) query = query.eq("action", searchParams.action)
  if (searchParams.q) query = query.ilike("resource_id", `%${searchParams.q}%`)

  const { data: entries } = await query
  const { data: allActions } = await supabase.from("audit_log").select("action")

  const actionCounts = new Map<string, number>()
  for (const r of allActions ?? []) {
    const a = (r as any).action
    actionCounts.set(a, (actionCounts.get(a) ?? 0) + 1)
  }
  const actions = [...actionCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrative and high-risk actions, with before/after state. Read-only.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">Total entries</p>
                <p className="mt-1 text-2xl font-bold">{allActions?.length ?? 0}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardContent className="p-4">
              <form method="get" className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="q"
                    placeholder="Search by resource ID…"
                    defaultValue={searchParams.q}
                    className="pl-9"
                  />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/audit-log"
              className={`rounded-md border px-3 py-1.5 text-sm ${
                !searchParams.action ? "border-primary bg-primary/10" : "hover:bg-accent/40"
              }`}
            >
              All
            </a>
            {actions.map(([action, count]) => (
              <a
                key={action}
                href={`/admin/audit-log?action=${encodeURIComponent(action)}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  searchParams.action === action ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                }`}
              >
                {action} <span className="text-muted-foreground">({count})</span>
              </a>
            ))}
          </div>
        )}

        {!entries || entries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              No audit entries recorded yet. Entries appear here when administrative actions are taken
              (approving scholarships, verifying organizations, granting roles).
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.action}</span>
                        {e.actor_role && <Badge variant="outline">{e.actor_role}</Badge>}
                        {e.resource_type && (
                          <span className="text-xs text-muted-foreground">
                            {e.resource_type} · {e.resource_id}
                          </span>
                        )}
                      </div>
                      {(e.before_state || e.after_state) && (
                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                          {e.before_state && (
                            <div className="rounded bg-muted p-2">
                              <span className="font-medium">Before: </span>
                              <code className="break-all">{JSON.stringify(e.before_state)}</code>
                            </div>
                          )}
                          {e.after_state && (
                            <div className="rounded bg-muted p-2">
                              <span className="font-medium">After: </span>
                              <code className="break-all">{JSON.stringify(e.after_state)}</code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <div>{new Date(e.created_at).toLocaleString()}</div>
                      {e.ip_address && <div className="font-mono">{e.ip_address}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
