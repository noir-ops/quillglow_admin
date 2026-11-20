import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpRight, CheckCircle2, Landmark, GraduationCap, Wallet } from "lucide-react"
import { setActiveProvider } from "./actions"

export const revalidate = 0

const RAIL_ICON: Record<number, typeof Wallet> = {
  1: Wallet,
  2: GraduationCap,
  3: Landmark,
}

/**
 * This page IS "provider independence" made operable. Money leaving the
 * platform runs through three rails (see 038/039 migrations); each rail's
 * active provider is a row in disbursement_providers, not an import in any
 * app's code. Flipping the toggle here is the entire migration — nothing
 * in quillglow-main, quillglow_benefactor, or this admin app needs a
 * redeploy when a provider changes.
 */
export default async function DisbursementsPage() {
  const admin = createAdminClient()

  const [{ data: rails }, { data: providers }, { data: recentOrders }] = await Promise.all([
    admin.from("disbursement_rails").select("*").order("rail"),
    admin.from("disbursement_providers").select("*").order("rail"),
    admin
      .from("payout_orders")
      .select("id, amount, rail, delivery_method, status, provider_key, recipient_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const providersByRail = new Map<number, typeof providers>()
  for (const p of providers ?? []) {
    const list = providersByRail.get(p.rail) ?? []
    list.push(p)
    providersByRail.set(p.rail, list)
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Disbursement Rails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How money leaves the platform, split by purpose. Switching a rail's active provider here takes effect
            immediately — no deploy, in any of the three apps.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(rails ?? [])
            .filter((r) => r.rail > 0)
            .map((rail) => {
              const Icon = RAIL_ICON[rail.rail] ?? Wallet
              const railProviders = providersByRail.get(rail.rail) ?? []
              return (
                <Card key={rail.rail}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      Rail {rail.rail} — {rail.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{rail.purpose}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {railProviders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No providers configured for this rail.</p>
                    ) : (
                      railProviders.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between rounded-md border p-2.5 text-sm ${
                            p.is_active ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {p.is_active && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            <span className={p.is_active ? "font-medium" : "text-muted-foreground"}>
                              {p.display_name}
                            </span>
                          </div>
                          {p.is_active ? (
                            <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                              Active
                            </Badge>
                          ) : (
                            <form
                              action={async () => {
                                "use server"
                                await setActiveProvider(p.id)
                              }}
                            >
                              <Button type="submit" size="sm" variant="outline">
                                Make active
                              </Button>
                            </form>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent payouts (all rails)</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentOrders?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Rail</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">${Number(o.amount).toFixed(2)}</TableCell>
                      <TableCell>{o.rail}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.delivery_method}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.provider_key ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.recipient_email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "failed"
                              ? "destructive"
                              : o.status === "pending"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <a
          href="/admin/institutions"
          className="flex w-fit items-center gap-1 text-sm text-primary hover:underline"
        >
          Manage institutions directory <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
