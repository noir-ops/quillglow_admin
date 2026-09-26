"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { setBenefactorVerification } from "@/app/admin/(protected)/opportunities/actions"

interface PendingOrg {
  id: string
  organization_name: string
  contact_email: string
  created_at: string
}

/**
 * Direct verify/reject action for a benefactor organization — independent of
 * having a scholarship submission to attach it to.
 *
 * This closes a real deadlock: a benefactor cannot submit a scholarship for
 * review until their organization is verified (enforced server-side), but the
 * review queue's only verify control previously lived INSIDE a submission's
 * review card. An organization with zero submissions — which describes every
 * newly-registered benefactor, since submitting is exactly what verification
 * unlocks — had no reachable verify button anywhere in the admin panel.
 */
export function PendingOrganizations({ organizations }: { organizations: PendingOrg[] }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const act = async (id: string, status: "verified" | "rejected") => {
    if (status === "rejected" && !notes[id]?.trim()) {
      setError("A reason is required when rejecting an organization, so they know what to fix.")
      return
    }
    setBusyId(id)
    setError(null)
    const res = await setBenefactorVerification(id, status, notes[id])
    if (!res.success) setError(res.error ?? "Action failed")
    setBusyId(null)
    router.refresh()
  }

  if (organizations.length === 0) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm font-medium">
          {organizations.length} organization{organizations.length === 1 ? "" : "s"} awaiting verification
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {organizations.map((org) => (
            <div key={org.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{org.organization_name}</p>
                  <p className="text-xs text-muted-foreground">{org.contact_email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === org.id}
                    onClick={() => act(org.id, "verified")}
                  >
                    {busyId === org.id ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                    )}
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === org.id}
                    onClick={() => act(org.id, "rejected")}
                  >
                    <XCircle className="mr-2 h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
              <Textarea
                placeholder="Notes (required to reject, optional to verify)"
                className="mt-2 h-16 text-xs"
                value={notes[org.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [org.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
