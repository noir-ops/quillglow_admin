import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import { ContactActionsMenu } from "@/components/contact-actions-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPagination } from "@/components/admin-pagination"
import { ADMIN_PAGE_SIZE, buildPaginationInfo, getPageParams } from "@/lib/admin-pagination"

export const revalidate = 0

/** Only the columns the table actually renders — not select("*"). */
const CONTACT_COLUMNS = "id, ticket_number, name, email, subject, message, status, created_at"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()
  const { page, from, to } = getPageParams(params.page)

  const applyFilters = <T extends { or: any; eq: any }>(q: T): T => {
    let query: any = q
    if (params.search) {
      query = query.or(
        `name.ilike.%${params.search}%,email.ilike.%${params.search}%,subject.ilike.%${params.search}%`,
      )
    }
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status)
    }
    return query
  }

  // Status counts come from head-only COUNT queries — the DB counts rows and
  // returns none, instead of shipping every row to the server to be filtered
  // in JS the way this page used to.
  const countFor = (status?: string) => {
    let q: any = supabase.from("contact_messages").select("id", { count: "exact", head: true })
    if (params.search) {
      q = q.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%,subject.ilike.%${params.search}%`)
    }
    if (status) q = q.eq("status", status)
    return q
  }

  const [listResult, allResult, pendingResult, repliedResult, resolvedResult] = await Promise.all([
    applyFilters(
      supabase
        .from("contact_messages")
        .select(CONTACT_COLUMNS, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to) as any,
    ),
    countFor(),
    countFor("pending"),
    countFor("replied"),
    countFor("resolved"),
  ])

  if (listResult.error) {
    console.error("Error fetching contacts:", listResult.error)
  }

  const contacts = listResult.data ?? []
  const filteredTotal = listResult.count ?? 0

  const totalCount = allResult.count ?? 0
  const pendingCount = pendingResult.count ?? 0
  const repliedCount = repliedResult.count ?? 0
  const resolvedCount = resolvedResult.count ?? 0

  const activeStatus = params.status || "all"
  const pagination = buildPaginationInfo(page, filteredTotal, ADMIN_PAGE_SIZE)

  const tabHref = (status: string) =>
    status === "all" ? "/admin/contacts" : `/admin/contacts?status=${status}`

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Messages</h1>
          <p className="text-muted-foreground">Manage and respond to customer inquiries</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {totalCount.toLocaleString()} Total Messages
        </Badge>
      </div>

      <Tabs value={activeStatus} className="w-full">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <a href={tabHref("all")}>All ({totalCount})</a>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <a href={tabHref("pending")}>Pending ({pendingCount})</a>
          </TabsTrigger>
          <TabsTrigger value="replied" asChild>
            <a href={tabHref("replied")}>Replied ({repliedCount})</a>
          </TabsTrigger>
          <TabsTrigger value="resolved" asChild>
            <a href={tabHref("resolved")}>Resolved ({resolvedCount})</a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeStatus} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <CardContent className="space-y-4">
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
                  {contacts.length > 0 ? (
                    contacts.map((contact: any) => (
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

              <AdminPagination
                info={pagination}
                basePath="/admin/contacts"
                params={{ search: params.search, status: params.status }}
                label="messages"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
