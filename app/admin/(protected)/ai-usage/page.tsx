import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, DollarSign, Users, Zap } from "lucide-react"

export const revalidate = 0

/**
 * AI cost and usage — spec §26: "AI Cost Per Active User ... becomes a critical
 * management metric." The tracking has been recording since the AI Gateway
 * shipped; this is the surface that makes it readable.
 */
export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: { days?: string }
}) {
  const days = Math.min(Number(searchParams.days ?? 30) || 30, 365)
  const supabase = createAdminClient()

  const [{ data: summaryRows }, { data: daily }, { data: byTask }] = await Promise.all([
    supabase.rpc("ai_cost_per_active_user", { p_days: days }),
    supabase.from("ai_cost_daily").select("*").order("day", { ascending: false }).limit(60),
    supabase.from("ai_usage_log").select("task, provider, model, estimated_cost, input_tokens, output_tokens, cache_hit, success"),
  ])

  const summary = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows

  // Aggregate by task so it's obvious which feature is spending the money.
  const taskTotals = new Map<string, { requests: number; cost: number; cacheHits: number; failures: number }>()
  for (const row of byTask ?? []) {
    const t = (row as any).task ?? "unknown"
    const e = taskTotals.get(t) ?? { requests: 0, cost: 0, cacheHits: 0, failures: 0 }
    e.requests++
    e.cost += Number((row as any).estimated_cost ?? 0)
    if ((row as any).cache_hit) e.cacheHits++
    if (!(row as any).success) e.failures++
    taskTotals.set(t, e)
  }
  const tasks = [...taskTotals.entries()].sort((a, b) => b[1].cost - a[1].cost)

  const stats = [
    { label: `Total cost (${days}d)`, value: `$${Number(summary?.total_cost ?? 0).toFixed(2)}`, icon: DollarSign },
    { label: "Active users", value: summary?.active_users ?? 0, icon: Users },
    { label: "Cost / active user", value: `$${Number(summary?.cost_per_active_user ?? 0).toFixed(4)}`, icon: Activity },
    { label: "Cache hit rate", value: `${Number(summary?.cache_hit_rate ?? 0).toFixed(1)}%`, icon: Zap },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">AI Usage &amp; Cost</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Token spend per feature, and whether Premium revenue is covering AI consumption.
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <a
                key={d}
                href={`/admin/ai-usage?days=${d}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  days === d ? "border-primary bg-primary/10" : "hover:bg-accent/40"
                }`}
              >
                {d}d
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        {(byTask ?? []).length === 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 text-sm">
              <p className="font-medium">No AI usage recorded yet</p>
              <p className="mt-1 text-muted-foreground">
                Usage is logged automatically on every AI request. If this stays empty while the app is
                in use, check that migration <code>022_ai_gateway.sql</code> has been applied.
              </p>
            </CardContent>
          </Card>
        )}

        {tasks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Cost by feature</h2>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Task</th>
                      <th className="p-3 font-medium">Requests</th>
                      <th className="p-3 font-medium">Cache hits</th>
                      <th className="p-3 font-medium">Failures</th>
                      <th className="p-3 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(([task, t]) => (
                      <tr key={task} className="border-b last:border-0">
                        <td className="p-3 font-medium">{task}</td>
                        <td className="p-3">{t.requests}</td>
                        <td className="p-3">
                          {t.cacheHits}
                          {t.requests > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({Math.round((t.cacheHits / t.requests) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {t.failures > 0 ? (
                            <Badge variant="destructive">{t.failures}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">${t.cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {(daily ?? []).length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Daily breakdown</h2>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Day</th>
                      <th className="p-3 font-medium">Task</th>
                      <th className="p-3 font-medium">Model</th>
                      <th className="p-3 font-medium">Requests</th>
                      <th className="p-3 font-medium">Avg latency</th>
                      <th className="p-3 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(daily ?? []).map((d: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3">{d.day}</td>
                        <td className="p-3">{d.task}</td>
                        <td className="p-3 font-mono text-xs">{d.model}</td>
                        <td className="p-3">{d.requests}</td>
                        <td className="p-3">{d.avg_latency_ms}ms</td>
                        <td className="p-3 text-right font-mono">${Number(d.cost ?? 0).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
