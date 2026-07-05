import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// ============================================================
// ✅ OPTIMIZED MIDDLEWARE (proxy.js)
// ============================================================
// RULE: Middleware runs on EVERY request — keep it O(0) DB calls.
// Role-based page protection has been moved to the individual
// route layouts (admin/layout.js) which already fetch the profile
// via the server-side Supabase client.
//
// What this middleware now does (ALL from the JWT — no DB):
//   1. Verify the Supabase session (reads the cookie, NO network call)
//   2. Redirect unauthenticated users away from /admin routes
//   3. Allow all other requests through
//
// Role checks (admin-only paths, finance paths) are handled in
// layout.js + AdminGuard component at the component level, which
// is the correct Next.js App Router pattern.
// ============================================================

export async function proxy(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ✅ getUser() validates the JWT via the Supabase Auth server.
  // It does NOT hit your PostgreSQL database at all.
  // This is one HTTPS call to auth.supabase.co, not a DB query.
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 1. Protect /admin routes — redirect to login if not authenticated
  if (
    path.startsWith('/admin') &&
    !user &&
    path !== '/admin-login' &&
    path !== '/admin/create-center'
  ) {
    return NextResponse.redirect(new URL('/admin-login', request.url))
  }

  // 2. If authenticated admin tries to go to /admin-login, redirect to dashboard
  if (user && path === '/admin-login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // ✅ Everything else (role checks, center checks) is handled in:
  //    - /admin/layout.js   (server component — runs once per layout, cached)
  //    - AdminGuard.jsx     (client component — checks allowedFeatures from context)
  // DO NOT add more DB queries here.

  return response
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}