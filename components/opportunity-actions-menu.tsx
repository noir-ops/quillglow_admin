"use client"

import Link from "next/link"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CheckCircle2, Edit, MoreVertical, Trash2, XCircle } from "lucide-react"
import { deleteOpportunity, getApplicationCount, toggleOpportunityStatus } from "@/app/admin/(protected)/opportunities/actions"
import { useRouter } from "next/navigation"
import { OpportunityFormDialog } from "./opportunity-form-dialog"

export function OpportunityActionsMenu({ opportunity }: { opportunity: any }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appCount, setAppCount] = useState<number | null>(null)
  const [countError, setCountError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (deleteDialogOpen) {
      let active = true
      setAppCount(null)
      setCountError("")
      getApplicationCount(opportunity.id).then((count) => { if (active) setAppCount(count) })
        .catch(() => { if (active) setCountError("Application count unavailable. Close this dialog and retry.") })
      return () => { active = false }
    }
  }, [deleteDialogOpen, opportunity.id])

  const handleDelete = async () => {
    setLoading(true)
    try {
      const result = await deleteOpportunity(opportunity.id)
      if (result.success) {
        setDeleteDialogOpen(false)
        router.refresh()
      } else toast.error(result.error ?? "Could not delete opportunity")
    } catch { toast.error("Could not delete opportunity. Please retry.") } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    await toggleOpportunityStatus(opportunity.id, opportunity.status)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Opportunity actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <OpportunityFormDialog opportunity={opportunity}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </OpportunityFormDialog>
          <DropdownMenuItem onClick={handleToggleStatus}>
            {opportunity.status === "active" ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Close
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/applications?owner=all&status=all&opportunity=${opportunity.id}`}>View application records</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{opportunity.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
              {appCount !== null && appCount > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  {appCount} saved or application record{appCount === 1 ? "" : "s"} belong to this opportunity.
                  Close the opportunity to preserve learner history.
                  <Link className="mt-2 block underline" href={`/admin/applications?owner=all&status=all&opportunity=${opportunity.id}`}>View records and status breakdown</Link>
                </span>
              )}
              {appCount === null && !countError && <span className="mt-2 block">Checking application history…</span>}
              {countError && <span className="mt-2 block text-destructive">{countError}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading || appCount !== 0 || !!countError} className="bg-destructive text-destructive-foreground">
              {loading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
