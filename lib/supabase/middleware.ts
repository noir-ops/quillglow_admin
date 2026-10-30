import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminUser } from "@/lib/auth/admin"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path.startsWith("/admin/login") || path.startsWith("/admin/signup")
  const isApi = path.startsWith("/api/")

  // Admin role required everywhere except the sign-in pages. Before this, any
  // signed-in user of the shared Supabase project had full admin access.
  const admin = user ? await isAdminUser(supabase, user) : false

  if (isApi) {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 })
    return supabaseResponse
  }

  if (isAuthPage) {
    // Only real admins are bounced on to the dashboard; a signed-in
    // non-admin stays here (otherwise login ⇄ dashboard would loop).
    if (admin) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/dashboard"
      url.search = ""
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (!admin) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search = user ? "?error=not_admin" : ""
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
