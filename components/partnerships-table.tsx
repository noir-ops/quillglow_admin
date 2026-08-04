"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PartnershipFormDialog } from "@/components/partnership-form-dialog"
import { PartnershipActionsMenu } from "@/components/partnership-actions-menu"
import { Building2, ExternalLink, Star } from "lucide-react"

interface PartnershipsTableProps {
  partners: any[]
}

export function PartnershipsTable({ partners }: PartnershipsTableProps) {
  if (!partners || partners.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No partners yet</h3>
          <p className="text-sm text-muted-foreground">
            Start building partnerships by adding your first partner. This helps showcase your collaborations.
          </p>
          <PartnershipFormDialog>
            <Button className="mt-4">
              <Building2 className="mr-2 h-5 w-5" />
              Add First Partner
            </Button>
          </PartnershipFormDialog>
        </div>
      </Card>
    )
  }

  // Mobile view - Cards
  const MobileView = () => (
    <div className="lg:hidden space-y-4">
      {partners.map((partner) => (
        <Card key={partner.id} className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            {partner.logo_url && (
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={partner.logo_url || "/placeholder.svg"}
                  alt={partner.name}
                  className="h-full w-full object-contain p-2"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{partner.name}</h3>
                {partner.featured && <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
              </div>
              {partner.type && (
                <Badge variant="outline" className="text-xs mt-1">
                  {partner.type}
                </Badge>
              )}
            </div>
            <PartnershipActionsMenu partner={partner} />
          </div>

          {partner.description && <p className="text-sm text-muted-foreground line-clamp-2">{partner.description}</p>}

          {partner.tags && partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {partner.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {partner.link_url && (
            <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
              <a href={partner.link_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {partner.link_label || "Visit"}
              </a>
            </Button>
          )}
        </Card>
      ))}
    </div>
  )

  // Desktop view - Table
  const DesktopView = () => (
    <div className="hidden lg:block overflow-x-auto">
      <Card>
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Partner</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tags</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {partner.logo_url && (
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={partner.logo_url || "/placeholder.svg"}
                          alt={partner.name}
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    )}
                    <div className="font-medium">{partner.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">{partner.type ? <Badge variant="outline">{partner.type}</Badge> : "-"}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                  {partner.description || "-"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {partner.tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {partner.tags?.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{partner.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {partner.featured && (
                    <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <PartnershipActionsMenu partner={partner} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )

  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  )
}
