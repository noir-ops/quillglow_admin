"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export interface FeeSettings {
  techFeePct: string
  processingFeePct: string
  providerName: string
  providerFeePctEstimate: string
  providerFeeFixedEstimate: string
  disclosureNote: string
}

/** The amount used for the worked example at the top of the page. */
const EXAMPLE_AMOUNT = 500

/**
 * Deliberately duplicates the benefactor app's `computeFeeBreakdown`,
 * including its round-at-each-step behaviour. These two must agree exactly
 * — if this preview and the real checkout ever diverge, an admin sets a
 * rate believing one total and a benefactor is charged another.
 */
function computeBreakdown(amount: number, techPct: number, procPct: number, provPct: number, provFixed: number) {
  const round = (n: number) => Math.round(n * 100) / 100
  const techFee = round(amount * (techPct / 100))
  const processingFee = round(amount * (procPct / 100))
  const totalBeforeProviderFees = round(amount + techFee + processingFee)
  const providerFeeEstimate = round(totalBeforeProviderFees * (provPct / 100) + provFixed)
  return { techFee, processingFee, totalBeforeProviderFees, providerFeeEstimate }
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })

export function PlatformFeeSettingsForm({
  initialSettings,
  lastUpdated,
}: {
  initialSettings: FeeSettings
  lastUpdated: string | null
}) {
  const [settings, setSettings] = useState<FeeSettings>(initialSettings)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const update = (patch: Partial<FeeSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    setResult(null)
  }

  const nums = useMemo(() => {
    const parse = (v: string) => {
      const n = Number.parseFloat(v)
      return Number.isFinite(n) ? n : 0
    }
    return {
      tech: parse(settings.techFeePct),
      proc: parse(settings.processingFeePct),
      provPct: parse(settings.providerFeePctEstimate),
      provFixed: parse(settings.providerFeeFixedEstimate),
    }
  }, [settings])

  const breakdown = useMemo(
    () => computeBreakdown(EXAMPLE_AMOUNT, nums.tech, nums.proc, nums.provPct, nums.provFixed),
    [nums],
  )

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch("/api/fee-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tech_fee_pct: settings.techFeePct,
          processing_fee_pct: settings.processingFeePct,
          provider_name: settings.providerName,
          provider_fee_pct_estimate: settings.providerFeePctEstimate,
          provider_fee_fixed_estimate: settings.providerFeeFixedEstimate,
          disclosure_note: settings.disclosureNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      setResult({ ok: true, message: "Saved — new rates apply to the next scholarship funded." })
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Worked example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Example — a {money(EXAMPLE_AMOUNT)} scholarship</CardTitle>
          <CardDescription>Updates live as you change the rates below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Scholarship</span>
            <span className="tabular-nums">{money(EXAMPLE_AMOUNT)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Technology fee ({nums.tech}%)</span>
            <span className="tabular-nums">{money(breakdown.techFee)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Processing fee ({nums.proc}%)</span>
            <span className="tabular-nums">{money(breakdown.processingFee)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 font-medium">
            <span>Total before provider fees</span>
            <span className="tabular-nums">{money(breakdown.totalBeforeProviderFees)}</span>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>
              {settings.providerName || "Provider"} fee estimate ({nums.provPct}% + {money(nums.provFixed)}) — disclosed
              only, not charged
            </span>
            <span className="tabular-nums">{money(breakdown.providerFeeEstimate)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rates</CardTitle>
          <CardDescription>
            The technology and processing fees are added on top of the scholarship amount and charged to the
            benefactor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tech-fee">Technology fee (%)</Label>
              <Input
                id="tech-fee"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.techFeePct}
                onChange={(e) => update({ techFeePct: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processing-fee">Processing fee (%)</Label>
              <Input
                id="processing-fee"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.processingFeePct}
                onChange={(e) => update({ processingFeePct: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-name">Payment provider name</Label>
            <Input
              id="provider-name"
              value={settings.providerName}
              onChange={(e) => update({ providerName: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider-fee-pct">Provider fee estimate (%)</Label>
              <Input
                id="provider-fee-pct"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.providerFeePctEstimate}
                onChange={(e) => update({ providerFeePctEstimate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-fee-fixed">Provider fixed fee estimate ($)</Label>
              <Input
                id="provider-fee-fixed"
                type="number"
                min="0"
                step="0.01"
                value={settings.providerFeeFixedEstimate}
                onChange={(e) => update({ providerFeeFixedEstimate: e.target.value })}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Disclosed to benefactors only — never added to what they&apos;re charged. Update this whenever the provider
            changes their published rate (check their pricing page directly; this platform doesn&apos;t fetch it
            automatically).
          </p>

          <div className="space-y-2">
            <Label htmlFor="disclosure-note">Disclosure note</Label>
            <Textarea
              id="disclosure-note"
              rows={3}
              value={settings.disclosureNote}
              onChange={(e) => update({ disclosureNote: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Shown to benefactors alongside the provider fee estimate in the Add Funds dialog.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save fee settings
        </Button>

        {result && (
          <span
            className={`flex items-center gap-1.5 text-sm ${
              result.ok ? "text-green-600 dark:text-green-500" : "text-destructive"
            }`}
          >
            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {result.message}
          </span>
        )}

        {lastUpdated && !result && (
          <span className="text-sm text-muted-foreground">
            Last updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
