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
import { MoreHorizontal, Eye, XCircle, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription,
} from "@/app/admin/(protected)/subscriptions/actions"

interface Subscription {
  id: string
  user_id: string
  plan_type: string | null
  status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
  cancel_at_period_end?: boolean
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export function SubscriptionActionsMenu({ subscription }: { subscription: Subscription }) {
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      await cancelSubscription(subscription.id)
      setShowCancelDialog(false)
    } catch (error) {
      console.error("Error canceling subscription:", error)
      alert("Failed to cancel subscription. Please try again.")
    }
    setIsLoading(false)
  }

  const handleReactivate = async () => {
    setIsLoading(true)
    try {
      await reactivateSubscription(subscription.id)
    } catch (error) {
      console.error("Error reactivating subscription:", error)
      alert("Failed to reactivate subscription. Please try again.")
    }
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteSubscription(subscription.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Error deleting subscription:", error)
      alert("Failed to delete subscription. Please try again.")
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
            View Details
          </DropdownMenuItem>
          {subscription.status === "active" && !subscription.cancel_at_period_end ? (
            <DropdownMenuItem onClick={() => setShowCancelDialog(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Subscription
            </DropdownMenuItem>
          ) : subscription.cancel_at_period_end ? (
            <DropdownMenuItem onClick={handleReactivate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Undo Cancellation
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleReactivate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reactivate
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>Complete subscription information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">User</Label>
                <p className="font-medium">{subscription.profiles?.display_name || "Unknown User"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Plan Type</Label>
                <p className="font-medium capitalize">{subscription.plan_type || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">{subscription.status || "unknown"}</p>
                {subscription.cancel_at_period_end && (
                  <p className="text-sm text-destructive mt-1">Scheduled to cancel at period end</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Stripe Customer ID</Label>
                <p className="font-mono text-sm">{subscription.stripe_customer_id || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Subscription ID</Label>
                <p className="font-mono text-sm">{subscription.stripe_subscription_id || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Price ID</Label>
                <p className="font-mono text-sm">{subscription.stripe_price_id || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Current Period Start</Label>
                <p className="font-medium">
                  {subscription.current_period_start
                    ? new Date(subscription.current_period_start).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Current Period End</Label>
                <p className="font-medium">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">
                  {new Date(subscription.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Updated</Label>
                <p className="font-medium">
                  {new Date(subscription.updated_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Subscription Cancellation</DialogTitle>
            <DialogDescription>
              The subscription will remain active until the end of the current billing period (
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "period end"}
              ). After that, the user will be automatically downgraded to the Scholar (free) plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isLoading}>
              Keep Active
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
              {isLoading ? "Scheduling..." : "Schedule Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this subscription record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
