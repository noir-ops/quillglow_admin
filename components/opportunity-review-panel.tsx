"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, MessageSquare, XCircle } from "lucide-react"
import {
  approveOpportunity,
  rejectOpportunity,
  requestChanges,
  setBenefactorVerification,
} from "@/app/admin/(protected)/opportunities/actions"

export function OpportunityReviewPanel({ submissions }: { submissions: any[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const act = async (id: string, fn: () => Promise<any>) => {
    setBusy(id)
    setError(null)
    const res = await fn()
    if (!res.success) setError(res.error ?? "Action failed")
    setBusy(null)
    router.refresh()
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-sm text-muted-foreground">
          Nothing awaiting review.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {submissions.map((s) => {
        const b = s.benefactors
        const unverified = b && b.verification_status !== "verified"
        return (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b?.organization_name ?? "Unknown organization"}
                    {b?.contact_email ? ` · ${b.contact_email}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b && (
                    <Badge variant={b.verification_status === "verified" ? "default" : "destructive"}>
                      {b.verification_status === "verified" ? "Verified org" : `Org ${b.verification_status}`}
                    </Badge>
                  )}
                  <Badge variant="outline">{s.opportunity_type}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {s.description && <p className="text-sm">{s.description}</p>}

              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {s.award_amount != null && (
                  <span>Award: {s.award_currency} {Number(s.award_amount).toLocaleString()}</span>
                )}
                <span>Deadline: {s.is_rolling ? "Rolling" : s.deadline ?? "—"}</span>
                <span>Countries: {s.countries?.join(", ") ?? "Any"}</span>
                <span>Syllabi: {s.syllabi?.join(", ") ?? "Any"}</span>
                <span>Subjects: {s.subjects?.join(", ") ?? "Any"}</span>
                <span>Min readiness: {s.min_exam_readiness ?? "None"}</span>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline sm:col-span-2">
                    {s.url}
                  </a>
                )}
              </div>

              {unverified && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                  This organization is not verified. Verify it before approving, or the benefactor
                  won&apos;t be able to submit further scholarships.
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 h-7"
                    disabled={busy === s.id}
                    onClick={() => act(s.id, () => setBenefactorVerification(b.id, "verified"))}
                  >
                    Verify organization
                  </Button>
                </div>
              )}

              <Textarea
                rows={2}
                placeholder="Notes to the benefactor (required to reject or request changes)"
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy === s.id}
                  onClick={() => act(s.id, () => approveOpportunity(s.id, notes[s.id]))}
                >
                  {busy === s.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                  Approve &amp; publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === s.id}
                  onClick={() => act(s.id, () => requestChanges(s.id, notes[s.id] ?? ""))}
                >
                  <MessageSquare className="mr-2 h-3 w-3" />
                  Request changes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === s.id}
                  onClick={() => act(s.id, () => rejectOpportunity(s.id, notes[s.id] ?? ""))}
                >
                  <XCircle className="mr-2 h-3 w-3" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
