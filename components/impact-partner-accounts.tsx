import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
export interface ImpactPartnerAccount {
  id: string; user_id: string; organization_name: string; contact_name: string; contact_email: string
  organization_type: string | null; verification_status: string; created_at: string
}
export function ImpactPartnerAccounts({ partners }: { partners: ImpactPartnerAccount[] }) {
  if (!partners.length) return <p className="p-6 text-sm text-muted-foreground">No impact partner accounts match this search.</p>
  return <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Account contact</TableHead><TableHead>Type</TableHead><TableHead>Verification</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader><TableBody>
    {partners.map((partner) => <TableRow key={partner.id}>
      <TableCell className="min-w-48 font-medium">{partner.organization_name}<details className="mt-1 text-xs font-normal text-muted-foreground"><summary className="cursor-pointer">Account ID</summary><code className="break-all">{partner.user_id}</code></details></TableCell>
      <TableCell className="min-w-48"><p>{partner.contact_name}</p><p className="break-all text-sm text-muted-foreground">{partner.contact_email}</p></TableCell>
      <TableCell>{partner.organization_type || "Not specified"}</TableCell>
      <TableCell><Badge variant={partner.verification_status === "verified" ? "secondary" : "outline"}>{partner.verification_status || "Unknown"}</Badge></TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(partner.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
    </TableRow>)}
  </TableBody></Table>
}
