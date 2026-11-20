import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { SELF_AUTHENTICATED_API } from "@/lib/auth/admin"

/**
 * Every admin page, server action and API route requires an admin (see
 * lib/auth/admin.ts). API routes were previously outside this middleware
 * entirely — e.g. /api/institutions/[id]/onboarding-link had no check at all.
 * Cron and inbound-mail routes authenticate with their own secret/signature.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (SELF_AUTHENTICATED_API.some((p) => path.startsWith(p))) return
  return await updateSession(request)
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
