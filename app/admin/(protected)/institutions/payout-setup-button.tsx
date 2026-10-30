"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, AlertCircle } from "lucide-react"

/**
 * The direct fix for "how does an institution add their bank details to
 * Stripe" — this is that button. Fetches a fresh onboarding link
 * (valid ~30s, so it's generated on click, never pre-rendered) and opens
 * it. The institution's finance office fills in their bank account /
 * PayPal on Stripe's own hosted form; nothing about their banking details
 * ever touches this codebase.
 */
export function PayoutSetupButton({ institutionId }: { institutionId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/institutions/${institutionId}/onboarding-link`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to generate link")
        return
      }
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
        Payout setup
      </Button>
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </div>
  )
}
