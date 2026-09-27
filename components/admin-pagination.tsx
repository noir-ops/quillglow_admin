import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buildPageHref, type PaginationInfo } from "@/lib/admin-pagination"

interface Props {
  info: PaginationInfo
  /** e.g. "/admin/contacts" */
  basePath: string
  /** Current filters to preserve across page changes (search, status, …). */
  params: Record<string, string | undefined>
  /** Plural noun for the summary line, e.g. "messages". */
  label?: string
}

/**
 * Prev/next pagination for admin list pages. Server-rendered links rather
 * than client state, so it works with the existing RSC + searchParams setup
 * and adds no JS to the page.
 */
export function AdminPagination({ info, basePath, params, label = "rows" }: Props) {
  if (info.total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{info.firstRow}</span>–
        <span className="font-medium text-foreground">{info.lastRow}</span> of{" "}
        <span className="font-medium text-foreground">{info.total.toLocaleString()}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {info.page} of {info.totalPages}
        </span>

        <Button asChild variant="outline" size="sm" disabled={!info.hasPrev}>
          {info.hasPrev ? (
            <Link href={buildPageHref(basePath, params, info.page - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span aria-disabled className="pointer-events-none opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </Button>

        <Button asChild variant="outline" size="sm" disabled={!info.hasNext}>
          {info.hasNext ? (
            <Link href={buildPageHref(basePath, params, info.page + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span aria-disabled className="pointer-events-none opacity-50">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
