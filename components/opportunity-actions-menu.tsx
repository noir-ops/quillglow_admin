"use client"

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
  const router = useRouter()

  useEffect(() => {
    if (deleteDialogOpen) {
      getApplicationCount(opportunity.id).then(setAppCount)
    }
  }, [deleteDialogOpen, opportunity.id])

  const handleDelete = async () => {
    setLoading(true)
    try {
      const result = await deleteOpportunity(opportunity.id)
      if (result.success) {
        setDeleteDialogOpen(false)
        router.refresh()
      }
    } finally {
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
          <Button variant="ghost" size="icon">
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
                  {appCount} student{appCount === 1 ? " has" : "s have"} saved or applied to this
                  opportunity — deleting it removes their application records too.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground">
              {loading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
