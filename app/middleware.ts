import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })
  const s = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: {
    getAll: () => req.cookies.getAll(),
    setAll: l => l.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) } })
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: p } = await s.from('profiles').select('role,active').eq('id', user.id).single()
  const area = req.nextUrl.pathname.split('/')[1]
  if (!p || !p.active) return NextResponse.redirect(new URL('/login', req.url))
  if (p.role !== area) return NextResponse.redirect(new URL('/' + p.role, req.url)) // blocks cross-role access
  return res
}
export const config = { matcher: ['/admin/:path*', '/tailor/:path*', '/client/:path*'] }
