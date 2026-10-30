import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PartnershipsLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card className="p-4">
          <Skeleton className="h-10 w-full" />
        </Card>

        {/* Table skeleton */}
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
