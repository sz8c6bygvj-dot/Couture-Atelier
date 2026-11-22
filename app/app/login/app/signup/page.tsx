import { redirect } from 'next/navigation'
import { sb, svc } from '@/lib/supabase'
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export default function Signup({ searchParams }: any) {
  async function signup(fd: FormData) {
    'use server'
    const role = String(fd.get('role')), house = String(fd.get('house')).trim()
    if (!['admin', 'tailor', 'client'].includes(role)) redirect('/signup?error=role')
    const a = svc()
    let tenantId: string
    if (role === 'admin') {
      const { data, error } = await a.from('tenants').insert({ name: house, slug: slugify(house) }).select().single()
      if (error || !data) redirect('/signup?error=house-taken')
      tenantId = data.id
    } else {
      const { data: t } = await a.from('tenants').select('id,tailor_signup_open').eq('slug', slugify(house)).single()
      if (!t) redirect('/signup?error=no-house')
      if (role === 'tailor' && !t.tailor_signup_open) redirect('/signup?error=closed') // enforced server-side
      tenantId = t.id
    }
    const email = String(fd.get('email')), password = String(fd.get('password'))
    const { data: u, error } = await a.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !u.user) redirect('/signup?error=account')
    await a.from('profiles').insert({ id: u.user.id, tenant_id: tenantId, role, full_name: fd.get('name'), phone: fd.get('phone') })
    await sb().auth.signInWithPassword({ email, password })
    redirect('/' + role)
  }
  const msg: any = { closed: 'This fashion house is not recruiting tailors right now.', 'no-house': 'Fashion house not found. Check the name.', 'house-taken': 'That house name is taken.', account: 'Could not create account.' }
  return <form action={signup} className="space-y-3 pt-6 max-w-sm">
    <h1 className="text-2xl">Create account</h1>
    {searchParams.error && <p className="text-red-700">{msg[searchParams.error] ?? 'Check your details.'}</p>}
    <select className="in" name="role"><option value="client">Client</option><option value="tailor">Tailor</option><option value="admin">Admin (create a new fashion house)</option></select>
    <input className="in" name="house" placeholder="Fashion house name" required />
    <input className="in" name="name" placeholder="Full name" required />
    <input className="in" name="phone" placeholder="Phone" />
    <input className="in" name="email" type="email" placeholder="Email" required />
    <input className="in" name="password" type="password" minLength={8} placeholder="Password" required />
    <button className="btn">Sign up</button>
  </form>
}
