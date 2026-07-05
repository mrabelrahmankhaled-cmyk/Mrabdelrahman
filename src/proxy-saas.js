import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 🛠️ Try both env variables (graceful fallback)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // ⚠️ Local dev fallback - no crash
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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const hostname = request.headers.get('host')

  // 🛡️ Public routes (no auth required)
  const publicRoutes = ['/create-center', '/admin-login', '/signup']
  if (publicRoutes.some(route => path.startsWith(route))) {
    return response
  }

  // 🛡️ Auth protection for admin routes
  if (path.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/admin-login', request.url))
  }

  // 🚀 SaaS: Get user's center from staff_profiles
  if (user && path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('center_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // User exists but no profile - redirect to create center
      return NextResponse.redirect(new URL('/create-center', request.url))
    }

    // Add center info to headers for downstream use
    response.headers.set('x-center-id', profile.center_id)
    response.headers.set('x-user-role', profile.role)

    // 🛡️ Role-based protection for admin-only routes
    const adminOnlyRoutes = ['/admin/dashboard', '/admin/staff', '/admin/expenses', '/admin/audit', '/admin/settings']
    if (adminOnlyRoutes.some(route => path.startsWith(route))) {
      if (!profile.role || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        return NextResponse.redirect(new URL('/admin/staff_dashboard', request.url))
      }
    }

    // 🛡️ Finance routes protection (admin + staff)
    const financeRoutes = ['/admin/finance']
    if (financeRoutes.some(route => path.startsWith(route))) {
      if (!profile.role || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return NextResponse.redirect(new URL('/admin/staff_dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}
