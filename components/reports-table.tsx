"use client"

import { Card } from "@/components/ui/card"

import { useState } from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import {
  deleteCommunityMessage,
  deleteStudyRoomMessage,
  dismissCommunityReport,
  dismissStudyRoomReport,
} from "@/app/admin/(protected)/reports/actions"

interface ReportsTableProps {
  reports: any[]
  type: "community" | "study-room"
}

export function ReportsTable({ reports, type }: ReportsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const filteredReports = reports.filter((report) => {
    const searchLower = searchQuery.toLowerCase()
    const message = report.message?.content?.toLowerCase() || ""
    const reason = report.reason?.toLowerCase() || ""
    const reporter = report.reporter?.display_name?.toLowerCase() || ""
    return message.includes(searchLower) || reason.includes(searchLower) || reporter.includes(searchLower)
  })

  const handleDeleteMessage = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      if (type === "community") {
        await deleteCommunityMessage(selectedReport.message_id)
      } else {
        await deleteStudyRoomMessage(selectedReport.message_id)
      }
      toast.success("Message deleted successfully")
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.error("Failed to delete message")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismissReport = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      if (type === "community") {
        await dismissCommunityReport(selectedReport.id)
      } else {
        await dismissStudyRoomReport(selectedReport.id)
      }
      toast.success("Report dismissed successfully")
      setDismissDialogOpen(false)
    } catch (error) {
      toast.error("Failed to dismiss report")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No Reports</h3>
        <p className="text-sm text-muted-foreground mt-2">
          No {type === "community" ? "community" : "study room"} reports at this time
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Reason</TableHead>
                  {type === "study-room" && <TableHead>Room</TableHead>}
                  <TableHead>Reported At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={report.reporter?.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback>{report.reporter?.display_name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{report.reporter?.display_name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{report.message?.content || "Message deleted"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="font-normal">
                        {report.reason}
                      </Badge>
                    </TableCell>
                    {type === "study-room" && (
                      <TableCell>
                        <span className="text-sm">{report.room?.name || "Unknown"}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(report.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedReport(report)
                            setDeleteDialogOpen(true)
                          }}
                          disabled={!report.message}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report)
                            setDismissDialogOpen(true)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={report.reporter?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>{report.reporter?.display_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.reporter?.display_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(report.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="font-normal text-xs">
                  {report.reason}
                </Badge>
              </div>

              {type === "study-room" && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Room: </span>
                  <span className="font-medium">{report.room?.name || "Unknown"}</span>
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm break-words">{report.message?.content || "Message deleted"}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setSelectedReport(report)
                    setDeleteDialogOpen(true)
                  }}
                  disabled={!report.message}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setSelectedReport(report)
                    setDismissDialogOpen(true)
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No reports match your search</p>
          </div>
        )}
      </div>

      {/* Delete Message Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone and will also remove all
              reports associated with this message.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/50 rounded-lg my-4">
            <p className="text-sm break-words">{selectedReport?.message?.content}</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage} disabled={loading}>
              {loading ? "Deleting..." : "Delete Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Report Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to dismiss this report? The message will remain visible, but the report will be
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleDismissReport} disabled={loading}>
              {loading ? "Dismissing..." : "Dismiss Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
