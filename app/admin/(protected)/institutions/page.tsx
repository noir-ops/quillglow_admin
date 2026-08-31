import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addInstitution, toggleInstitutionActive } from "./actions"
import { PayoutSetupButton } from "./payout-setup-button"

export const revalidate = 0

/**
 * The Rail-2 payee directory. A student redeeming toward "Institution
 * payment" in the wallet picks from this list — so an institution has to
 * exist here before any student can pay it directly. Deliberately minimal:
 * name + contact email is all a Rail-2 provider (Stripe Connect) needs
 * to onboard a payee.
 */
export default async function InstitutionsPage() {
  const admin = createAdminClient()
  const { data: institutions } = await admin.from("institutions").select("*").order("name")

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Institutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rail 2 payees. Students redeeming toward "Institution payment" choose from this list. Each institution
            needs to complete Stripe's payout setup once — add their bank details — before a payment can reach
            them; use "Payout setup" to send them there.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add institution</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addInstitution} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Institution name</Label>
                <Input id="name" name="name" required placeholder="University of Colombo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" placeholder="Sri Lanka" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Finance contact name</Label>
                <Input id="contactName" name="contactName" placeholder="Bursar's Office" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Finance contact email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" required placeholder="finance@..." />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Add institution</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All institutions</CardTitle>
          </CardHeader>
          <CardContent>
            {!institutions?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No institutions added yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutions.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.country ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.contact_email}</TableCell>
                      <TableCell>
                        <Badge variant={i.is_active ? "outline" : "secondary"}>
                          {i.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PayoutSetupButton institutionId={i.id} />
                          <form
                            action={async () => {
                              "use server"
                              await toggleInstitutionActive(i.id, !i.is_active)
                            }}
                          >
                            <Button type="submit" size="sm" variant="ghost">
                              {i.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
