"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
export function BillingGrowthReport() {
  const [data, setData] = useState<any>(null), [error, setError] = useState("")
  const load = async () => { try { const r = await fetch("/api/billing-growth", { cache: "no-store" }), d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); setError("") } catch (e) { setError(e instanceof Error ? e.message : "Could not load report") } }
  useEffect(() => { load() }, [])
  return <div className="space-y-5 p-6"><h1 className="text-3xl font-bold">Scholar to Genius</h1><p>Last 30 days. Aggregated counters only; no study content or chat text is collected.</p><Button onClick={load}>Refresh</Button>{error && <p role="alert">{error}</p>}{data && <>
    <p>{data.enabled ? "Collection enabled" : "Collection paused"} · Started: {data.startedAt ? new Date(data.startedAt).toLocaleDateString() : "not started"}</p>
    <div className="grid gap-3 sm:grid-cols-4">{[["Scholar offer viewers", data.scholarExposures], ["Upgrade clicks", data.upgradeClicks], ["Checkout starts", data.checkoutStarts], ["Conversions after exposure", data.conversions]].map(([label, value]) => <div key={label} className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>
    <p>{data.scholarExposures ? `${((data.conversions / data.scholarExposures) * 100).toFixed(1)}% observed conversion` : "No observed conversion cohort yet."} · {data.observedDays || 0} days with observed AI usage</p>
    <p className="rounded-lg border p-3">{data.retuneEligible ? "30 days have elapsed. Review feature demand, provider costs and limit hits before editing Plan Limits. No limits change automatically." : "Collect 30 days of actual usage before retuning fair-use ceilings. No limits change automatically."}</p>
    <p className="text-sm text-muted-foreground">Allowed attempts include provider failures that were refunded; units describe attempted generation demand. Only observed registered Scholar viewers form the conversion cohort.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{["Feature", "Plan", "Allowed attempts", "Limit hits", "Units attempted", "Users"].map((x) => <th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{data.features.map((r: any) => <tr className="border-b" key={`${r.feature}:${r.plan}`}>{[r.feature, r.plan, r.requests, r.limit_hits, r.units, r.users].map((x, i) => <td className="p-2" key={i}>{x}</td>)}</tr>)}</tbody></table></div><a className="underline" href="/admin/plan-limits">Review existing plan limits</a>
  </>}</div>
}
