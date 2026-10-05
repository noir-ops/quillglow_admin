"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2 } from "lucide-react"

export interface LimitRow {
  feature: string
  label: string
  unit: string
  scholar: number | null
  genius: number | null
}

const describe = (n: number | null) => (n === null ? "—" : n < 0 ? "No limit" : n === 0 ? "Not included" : `${n.toLocaleString()} / month`)

function Cell({ plan, row, value }: { plan: "scholar" | "genius"; row: LimitRow; value: number | null }) {
  const [draft, setDraft] = useState(value === null ? "" : String(value))
  const [saved, setSaved] = useState(value)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  if (value === null) return <td className="px-3 py-2 text-muted-foreground">—</td>
  const dirty = draft.trim() !== String(saved)

  const save = async () => {
    setState("saving")
    setError(null)
    try {
      const res = await fetch("/api/plan-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: plan, feature: row.feature, monthly_limit: Number(draft.trim()) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save")
      setSaved(data.monthly_limit)
      setState("saved")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
      setState("error")
    }
  }

  return (
    <td className="px-3 py-2 align-top">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setState("idle") }}
          inputMode="numeric"
          className="h-8 w-24"
          aria-label={`${row.label} — ${plan} monthly limit`}
        />
        {dirty && (
          <Button size="sm" className="h-8" onClick={save} disabled={state === "saving"}>
            {state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </Button>
        )}
        {!dirty && state === "saved" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{describe(saved)}</p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </td>
  )
}

export function PlanLimitsEditor({ rows }: { rows: LimitRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly limits by plan</CardTitle>
        <CardDescription>
          Changes apply immediately — learners see the new numbers on their next page load. Use -1 for no limit and 0
          for not included. Every change is recorded in the Audit Log.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Feature</th>
              <th className="px-3 py-2 font-medium">Scholar (free)</th>
              <th className="px-3 py-2 font-medium">Genius (fair use)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feature} className="border-b last:border-0">
                <td className="px-3 py-2 align-top">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.feature} · counted in {r.unit}</p>
                </td>
                <Cell plan="scholar" row={r} value={r.scholar} />
                <Cell plan="genius" row={r} value={r.genius} />
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
