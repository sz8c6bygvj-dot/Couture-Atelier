import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const sb = () => {
  const c = cookies()
  return createServerClient(URL, ANON, { cookies: {
    getAll: () => c.getAll(),
    setAll: l => { try { l.forEach(({ name, value, options }) => c.set(name, value, options)) } catch {} } } })
}
// service role: server-only, used for sign-up
export const svc = () => createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
