import { Badge } from "@/components/ui/badge"
import type { AccountSummary } from "@/lib/admin/account-directory"

export function AccountTypeBadges({ summary }: { summary?: AccountSummary }) {
  return summary?.types ? <div className="flex flex-wrap gap-1">{summary.types.map((type) => <Badge key={type} variant={type === "Learner" ? "outline" : "secondary"}>{type}</Badge>)}</div>
    : <span className="text-sm text-muted-foreground">Unavailable</span>
}
export function AccountLinks({ summary }: { summary?: AccountSummary }) {
  if (!summary?.family || !summary.guides) return <span className="text-sm text-muted-foreground">Unavailable</span>
  const { family, guides } = summary
  if (!family.length && !guides.length) return <span className="text-sm text-muted-foreground">{summary.types?.includes("Learner") ? "No active links" : "—"}</span>
  return <details className="min-w-40 text-sm"><summary className="cursor-pointer space-x-1">
    {family.length > 0 && <Badge variant="outline">Family: {family.length}</Badge>}
    {guides.length > 0 && <Badge variant="outline">Guide: {guides.length}</Badge>}
  </summary><ul className="mt-2 space-y-1">{family.map((c) => <li key={`family:${c.id}`}>Family · {c.name}</li>)}{guides.map((c) => <li key={`guide:${c.id}`}>Guide · {c.name}</li>)}</ul></details>
}
