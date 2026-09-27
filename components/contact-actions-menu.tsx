"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Eye, Reply, CheckCircle, Trash2, Send, Mail } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  updateContactStatus,
  deleteContact,
  replyToContact,
  getContactThread,
} from "@/app/admin/(protected)/contacts/actions"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Contact {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: string | null
  ticket_number: string | null
  created_at: string
  is_admin_reply?: boolean
  sent_via_email?: boolean
}

export function ContactActionsMenu({ contact }: { contact: Contact }) {
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showReplyDialog, setShowReplyDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [newStatus, setNewStatus] = useState(contact.status || "pending")
  const [isLoading, setIsLoading] = useState(false)
  const [threadMessages, setThreadMessages] = useState<Contact[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (showViewDialog || showReplyDialog) {
      loadThread()
    }
  }, [showViewDialog, showReplyDialog])

  const loadThread = async () => {
    setLoadingThread(true)
    try {
      const thread = await getContactThread(contact.id)
      setThreadMessages(thread)
    } catch (error) {
      console.error("[v0] Error loading thread:", error)
      setThreadMessages([contact])
    }
    setLoadingThread(false)
  }

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      alert("Please enter a reply message")
      return
    }

    setIsLoading(true)
    try {
      const result = await replyToContact(contact.id, replyMessage, newStatus)
      alert(`Reply sent successfully via email to ${result.email}`)
      setReplyMessage("")
      await loadThread()
    } catch (error) {
      console.error("Error sending reply:", error)
      alert("Failed to send reply. Please try again.")
    }
    setIsLoading(false)
  }

  const handleStatusChange = async () => {
    setIsLoading(true)
    try {
      await updateContactStatus(contact.id, "resolved")
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status. Please try again.")
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteContact(contact.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting contact:", error)
      alert("Failed to delete message. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowReplyDialog(true)}>
            <Reply className="mr-2 h-4 w-4" />
            Reply via Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleStatusChange}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Resolved
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col bg-background">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>Ticket #{contact.ticket_number || contact.id.slice(0, 8)}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium mt-1">{contact.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium mt-1 break-all text-sm">{contact.email}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Subject</Label>
                <p className="font-medium mt-1">{contact.subject}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Conversation Thread</Label>
                <div className="min-h-[200px] max-h-[40vh] overflow-y-auto mt-2 rounded-lg border bg-muted/30 p-3 sm:p-4">
                  {loadingThread ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm text-muted-foreground">Loading conversation...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {threadMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_admin_reply ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${
                              msg.is_admin_reply ? "bg-primary text-primary-foreground" : "bg-card border"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-medium">{msg.is_admin_reply ? "Admin" : msg.name}</p>
                              {msg.sent_via_email && <Mail className="h-3 w-3 opacity-70" />}
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.message}
                            </p>
                            <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p className="font-medium capitalize mt-1">{contact.status || "pending"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Received</Label>
                  <p className="font-medium mt-1 text-sm">
                    {new Date(contact.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViewDialog(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <Button
              onClick={() => {
                setShowViewDialog(false)
                setShowReplyDialog(true)
              }}
              className="w-full sm:w-auto"
            >
              <Reply className="mr-2 h-4 w-4" />
              Reply via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] bg-background flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Chat with {contact.name}
            </DialogTitle>
            <DialogDescription className="break-all text-xs sm:text-sm">
              {contact.email} • Replies sent via email
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="h-[35vh] sm:h-[40vh] rounded-lg border bg-muted/30 p-3 sm:p-4 overflow-y-auto">
              {loadingThread ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {threadMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_admin_reply ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-2.5 sm:p-3 ${
                          msg.is_admin_reply ? "bg-primary text-primary-foreground" : "bg-card border"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium opacity-70">{msg.is_admin_reply ? "Admin" : msg.name}</p>
                          {msg.sent_via_email && <Mail className="h-3 w-3 opacity-50" />}
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <p className="text-[10px] opacity-50 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t">
            <div className="w-full">
              <Textarea
                placeholder="Type your reply here... User will receive this via email. (Press Enter to send, Shift+Enter for new line)"
                className="w-full min-h-[80px] sm:min-h-[100px] resize-none text-sm"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleReply()
                  }
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1 w-full">
                <Label htmlFor="status" className="text-xs">
                  Update Status
                </Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleReply} disabled={isLoading} className="w-full sm:w-auto sm:min-w-[140px]">
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Sending..." : "Send via Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? "Deleting..." : "Delete Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
