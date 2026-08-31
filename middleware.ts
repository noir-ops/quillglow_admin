import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Only apply middleware to admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return await updateSession(request)
  }
}

export const config = {
  matcher: ["/admin/:path*"],
}
