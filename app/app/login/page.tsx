import { redirect } from 'next/navigation'
import { sb } from '@/lib/supabase'
export default function Login({ searchParams }: any) {
  async function login(fd: FormData) {
    'use server'
    const s = sb()
    const { data, error } = await s.auth.signInWithPassword({ email: String(fd.get('email')), password: String(fd.get('password')) })
    if (error || !data.user) redirect('/login?error=1')
    const { data: p } = await s.from('profiles').select('role').eq('id', data.user.id).single()
    redirect('/' + (p?.role ?? 'login'))
  }
  return <form action={login} className="space-y-3 pt-10 max-w-sm">
    <h1 className="text-2xl">Log in</h1>
    {searchParams.error && <p className="text-red-700">Wrong email or password.</p>}
    <input className="in" name="email" type="email" placeholder="Email" required />
    <input className="in" name="password" type="password" placeholder="Password" required />
    <button className="btn">Log in</button>
  </form>
}
