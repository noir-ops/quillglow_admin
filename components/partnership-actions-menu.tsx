"use client"

import { MoreVertical, Edit, Trash2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { deletePartner, toggleFeatured } from "@/app/admin/(protected)/partnerships/actions"
import { PartnershipFormDialog } from "@/components/partnership-form-dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface PartnershipActionsMenuProps {
  partner: any
}

export function PartnershipActionsMenu({ partner }: PartnershipActionsMenuProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this partner?")) return

    setDeleting(true)
    const result = await deletePartner(partner.id)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "Failed to delete partner")
    }
    setDeleting(false)
  }

  const handleToggleFeatured = async () => {
    const result = await toggleFeatured(partner.id, partner.featured)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || "Failed to update partner")
    }
  }

  return (
    <PartnershipFormDialog partner={partner}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <button className="w-full text-left">
              <Edit className="h-4 w-4 mr-2" />
              Edit Partner
            </button>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleFeatured}>
            <Star className="h-4 w-4 mr-2" />
            {partner.featured ? "Unfeature" : "Feature"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDelete} disabled={deleting} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </PartnershipFormDialog>
  )
}
