"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BillingRolloutEditor() {
  const [data, setData] = useState<any>(null), [draft, setDraft] = useState<any>({}), [tests, setTests] = useState<any>({})
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [testLink, setTestLink] = useState("")
  const load = async () => {
    const res = await fetch("/api/billing-rollout", { cache: "no-store" }), value = await res.json()
    if (!res.ok) throw new Error(value.error)
    setData(value); setDraft({ ...value.config, legacy_product_id: value.config.legacy_product_id || value.legacyProductHint || "" })
  }
  useEffect(() => { load().catch((e) => setNotice(e.message)) }, [])
  const act = async (action: string, extra: any = {}) => {
    setBusy(true); setNotice("")
    try {
      const res = await fetch("/api/billing-rollout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revision: data.config.revision, ...extra }) })
      const result = await res.json(); if (!res.ok) throw new Error(result.error)
      if (result.url) setTestLink(result.url)
      setNotice(result.note || "Saved successfully."); await load()
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save") } finally { setBusy(false) }
  }
  return <div className="space-y-6 p-6 max-w-5xl">
    <h1 className="text-3xl font-bold">Pricing rollout</h1>
    <p>Phase 2: $5.99 monthly / $59.99 annually for new subscriptions. Existing $4.99 subscriptions stay on their original product and rate.</p>
    <p role="status" className="text-sm">{notice}</p>
    {!data ? <Button onClick={() => load().catch((e) => setNotice(e.message))}>Load configuration</Button> : <>
      <p className="font-semibold">Polar environment: {data.environment} · Revision {data.config.revision} · {data.pricing.live ? "Live" : data.pricing.scheduled ? "Scheduled" : "Draft - old pricing stays active"}</p>
      <Card><CardHeader><CardTitle>1. Prepare the offers</CardTitle></CardHeader><CardContent className="space-y-4">
        {[["legacy_product_id", "Existing $4.99 monthly product ID"], ["monthly_product_id", "New $5.99 monthly product ID"], ["annual_product_id", "New $59.99 annual product ID"]].map(([key, label]) => <label key={key} className="block text-sm">{label}<Input aria-label={label} disabled={busy || !!data.config.authorized_at} value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value.trim() })} /></label>)}
        <label className="block text-sm">Launch time (UTC ISO timestamp)<Input aria-label="Launch time UTC" disabled={busy || !!data.config.authorized_at} placeholder="YYYY-MM-DDTHH:mm:ssZ" value={draft.launch_at || ""} onChange={(e) => setDraft({ ...draft, launch_at: e.target.value })} /></label>
        <Button disabled={busy || !!data.config.authorized_at} onClick={() => act("configure", { config: draft })}>Save draft</Button>
        <p className="text-sm text-muted-foreground">Create separate products in Polar; keep the existing product unchanged. Saving a draft does not change learner pricing.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>2. Prove the lifecycle</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm">Use separate verified test accounts. Complete monthly, annual and discounted checkouts, then end another subscription and confirm access downgrades. Start in Polar sandbox.</p>
        <label className="block text-sm">Verified test account UUID<Input aria-label="Verified test account UUID" value={tests.testUserId || ""} onChange={(e) => setTests({ ...tests, testUserId: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => act("test_checkout", { interval: "month", testUserId: tests.testUserId })}>Create monthly test link</Button><Button variant="outline" disabled={busy} onClick={() => act("test_checkout", { interval: "year", testUserId: tests.testUserId })}>Create annual test link</Button></div>
        {testLink && <a className="block underline" href={testLink} target="_blank" rel="noreferrer">Open the test checkout in Polar</a>}
        {[["monthlyCheckoutId", "Successful monthly checkout ID"], ["annualCheckoutId", "Successful annual checkout ID"], ["discountCheckoutId", "Successful discounted monthly checkout ID"], ["canceledSubscriptionId", "Ended cancellation test subscription ID"]].map(([key, label]) => <label key={key} className="block text-sm">{label}<Input aria-label={label} value={tests[key] || ""} onChange={(e) => setTests({ ...tests, [key]: e.target.value.trim() })} /></label>)}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!tests.phase1Confirmed} onChange={(e) => setTests({ ...tests, phase1Confirmed: e.target.checked })} />I checked both Scholar and Genius pages: displayed allowances match server enforcement.</label>
        <Button disabled={busy} onClick={() => act("verify", tests)}>Verify gates against Polar and Supabase</Button>
        <ul className="space-y-1 text-sm">{["monthly_buy", "annual_buy", "discount_buy", "cancel", "sync_health", "phase1_review"].map((kind) => <li key={kind}>{kind}: {data.evidence?.find((e: any) => e.kind === kind) ? "evidence recorded" : "pending"}</li>)}</ul>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>3. Schedule, then observe</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !!data.config.authorized_at} onClick={() => act("publish")}>Recheck and authorize scheduled launch</Button><Button variant="outline" disabled={busy || data.pricing.live} onClick={() => act("disable")}>Cancel scheduled launch</Button></div>
        <p className="text-sm">The dated banner disappears at launch. New monthly and annual checkouts then use the new products. Existing subscriptions are never repriced.</p>
        <Button variant="outline" disabled={busy || !data.pricing.live} onClick={() => act("phase3", { enabled: !data.config.phase3_enabled })}>{data.config.phase3_enabled ? "Pause" : "Enable"} Phase 3 conversion tracking and next steps</Button>
        <a className="block underline text-sm" href="/admin/billing-growth">View conversion and limit-hit report</a>
      </CardContent></Card>
    </>}
  </div>
}
