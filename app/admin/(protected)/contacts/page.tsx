import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Clock, Inbox, MessageSquareReply, Search } from "lucide-react"
import { ContactActionsMenu } from "@/components/contact-actions-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPagination } from "@/components/admin-pagination"
import { ADMIN_PAGE_SIZE, buildPaginationInfo, getPageParams } from "@/lib/admin-pagination"

export const revalidate = 0

const STATUS_STYLE: Record<string, string> = {
  open: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  in_progress: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  replied: "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  resolved: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300",
  closed: "border-muted-foreground/30 text-muted-foreground",
}
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  pending: "Open",
  in_progress: "In progress",
  replied: "Replied",
  resolved: "Resolved",
  closed: "Closed",
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/**
 * Support tickets. Optimised (scripts/067):
 *  - lists TICKETS only — admin replies and learner follow-ups are messages
 *    inside a ticket, and were previously listed and counted as new contacts;
 *  - new tickets arrive as 'open' (contact form, Settings → Contact Support),
 *    which the old Pending/Replied/Resolved tabs never showed — they only
 *    appeared under "All". Tabs now match every status in use;
 *  - one database call returns the page, the exact total, each ticket's
 *    message count and last activity, and whether the learner wrote last;
 *  - search also covers ticket numbers and message text;
 *  - most recently active first, so a learner's reply brings a ticket back
 *    to the top (it is also reopened automatically).
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = createAdminClient()
  const { page, from, to } = getPageParams(params.page)
  const bucket = params.status && params.status !== "all" ? params.status : "all"

  const [{ data: rows, error }, { data: statsData }] = await Promise.all([
    supabase.rpc("admin_list_tickets", {
      p_search: params.search?.trim() || null,
      p_bucket: bucket,
      p_limit: to - from + 1,
      p_offset: from,
    }),
    supabase.rpc("admin_ticket_stats"),
  ])
  if (error) console.error("[admin/contacts] list failed (has migration 067 been run?):", error.message)

  const tickets = (rows ?? []) as any[]
  const filteredTotal = tickets.length > 0 ? Number(tickets[0].total_count) : 0
  const stats: any = statsData ?? {}
  const pagination = buildPaginationInfo(page, filteredTotal, ADMIN_PAGE_SIZE)
  const tabs: [string, string, number][] = [
    ["all", "All", stats.total ?? 0],
    ["open", "Open", stats.open ?? 0],
    ["in_progress", "In progress", stats.in_progress ?? 0],
    ["replied", "Replied", stats.replied ?? 0],
    ["resolved", "Resolved", stats.resolved ?? 0],
    ["closed", "Closed", stats.closed ?? 0],
  ]
  const tabHref = (s: string) => (s === "all" ? "/admin/contacts" : `/admin/contacts?status=${s}`)

  const cards = [
    { label: "Open — needs a reply", value: stats.open ?? 0, icon: AlertCircle, tone: (stats.open ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground" },
    { label: "New today", value: stats.new_today ?? 0, icon: Inbox, tone: "text-blue-600" },
    { label: "Awaiting learner", value: stats.replied ?? 0, icon: MessageSquareReply, tone: "text-violet-600" },
    {
      label: "Oldest open ticket",
      value: stats.oldest_open_at ? ago(stats.oldest_open_at) : "—",
      icon: Clock,
      tone: "text-muted-foreground",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">Messages from the contact form and Settings → Contact Support</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {(stats.total ?? 0).toLocaleString()} tickets
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <c.icon className={`h-5 w-5 shrink-0 ${c.tone}`} />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</p>
                <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={bucket} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {tabs.map(([value, label, n]) => (
            <TabsTrigger key={value} value={value} asChild>
              <a href={tabHref(value)} className="whitespace-nowrap">
                {label} ({n.toLocaleString()})
              </a>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={bucket} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <form action="/admin/contacts" method="get">
                  <input type="hidden" name="status" value={bucket} />
                  <Input
                    name="search"
                    placeholder="Search by name, email, subject, ticket number or message..."
                    className="pl-9"
                    defaultValue={params.search}
                  />
                </form>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.length > 0 ? (
                      tickets.map((t) => {
                        const needsReply = (t.status === "open" || t.status === "pending") && t.last_from_learner
                        return (
                          <TableRow key={t.id} className={needsReply ? "bg-amber-500/[0.04]" : undefined}>
                            <TableCell className="font-mono text-sm">{t.ticket_number || "—"}</TableCell>
                            <TableCell>
                              <div className="font-medium">{t.name}</div>
                              <div className="text-sm text-muted-foreground">{t.email}</div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="line-clamp-2">{t.subject}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {Number(t.message_count)} message{Number(t.message_count) === 1 ? "" : "s"}
                                {Number(t.message_count) > 1 && t.last_from_learner && " · learner replied"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_STYLE[t.status] ?? ""}>
                                {STATUS_LABEL[t.status] ?? t.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground" title={new Date(t.last_activity_at).toLocaleString()}>
                              {ago(t.last_activity_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <ContactActionsMenu contact={t} />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {params.search ? "No tickets match your search" : "No tickets here"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <AdminPagination
                info={pagination}
                basePath="/admin/contacts"
                params={{ search: params.search, status: params.status }}
                label="tickets"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
