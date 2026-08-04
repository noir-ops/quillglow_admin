import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import { ContactActionsMenu } from "@/components/contact-actions-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const revalidate = 0

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()

  // Fetch contacts with optional search and status filter
  let query = supabase.from("contact_messages").select("*").order("created_at", { ascending: false })

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,subject.ilike.%${params.search}%`)
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  const { data: contacts, error } = await query

  if (error) {
    console.error("Error fetching contacts:", error)
  }

  // Count by status
  const pendingCount = contacts?.filter((c) => c.status === "pending" || !c.status).length || 0
  const repliedCount = contacts?.filter((c) => c.status === "replied").length || 0
  const resolvedCount = contacts?.filter((c) => c.status === "resolved").length || 0

  const activeStatus = params.status || "all"

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Messages</h1>
          <p className="text-muted-foreground">Manage and respond to customer inquiries</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {contacts?.length || 0} Total Messages
        </Badge>
      </div>

      <Tabs defaultValue={activeStatus} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <a href="/admin/contacts?status=all">All ({contacts?.length || 0})</a>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <a href="/admin/contacts?status=pending">Pending ({pendingCount})</a>
          </TabsTrigger>
          <TabsTrigger value="replied" asChild>
            <a href="/admin/contacts?status=replied">Replied ({repliedCount})</a>
          </TabsTrigger>
          <TabsTrigger value="resolved" asChild>
            <a href="/admin/contacts?status=resolved">Resolved ({resolvedCount})</a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeStatus} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <form action="/admin/contacts" method="get">
                  <input type="hidden" name="status" value={activeStatus} />
                  <Input
                    name="search"
                    placeholder="Search by name, email, or subject..."
                    className="pl-9"
                    defaultValue={params.search}
                  />
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts && contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-mono text-sm">{contact.ticket_number || "N/A"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-sm text-muted-foreground">{contact.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="line-clamp-2">{contact.subject}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              contact.status === "resolved"
                                ? "default"
                                : contact.status === "replied"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {contact.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(contact.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <ContactActionsMenu contact={contact} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {params.search ? "No messages found matching your search" : "No messages yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
