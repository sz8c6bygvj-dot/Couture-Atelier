import { revalidatePath } from 'next/cache'
import { sb } from '@/lib/supabase'
const STATUSES = ['new', 'assigned', 'in_progress', 'completed', 'delivered']
export default async function Admin() {
  const s = sb()
  const { data: { user } } = await s.auth.getUser()
  const { data: me } = await s.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const { data: tenant } = await s.from('tenants').select('*').eq('id', me!.tenant_id).single()
  const { data: orders } = await s.from('orders')
    .select('*, client:profiles(full_name,phone), measurement:measurements(data), assignments(id,status,reject_reason,tailor:profiles(full_name))')
    .order('created_at', { ascending: false })
  const { data: tailors } = await s.from('profiles').select('id,full_name').eq('role', 'tailor').eq('active', true)
  const list = orders ?? []
  const stats = {
    clients: new Set(list.map(o => o.client_id)).size,
    pending: list.filter(o => ['new', 'assigned'].includes(o.status)).length,
    progress: list.filter(o => o.status === 'in_progress').length,
    settled: list.filter(o => ['completed', 'delivered'].includes(o.status)).length }

  async function toggle() { 'use server'
    await sb().from('tenants').update({ tailor_signup_open: !tenant.tailor_signup_open }).eq('id', tenant.id); revalidatePath('/admin') }
  async function assign(fd: FormData) { 'use server'
    const c = sb(), oid = String(fd.get('order'))
    await c.from('assignments').insert({ order_id: oid, tailor_id: fd.get('tailor'), tenant_id: tenant.id })
    await c.from('orders').update({ status: 'assigned' }).eq('id', oid); revalidatePath('/admin') }
  async function setStatus(fd: FormData) { 'use server'
    await sb().from('orders').update({ status: fd.get('status') }).eq('id', fd.get('order')); revalidatePath('/admin') }
  async function post(fd: FormData) { 'use server'
    await sb().from('gallery_posts').insert({ title: fd.get('title'), description: fd.get('description'), category: fd.get('category'), image_url: fd.get('image_url') }); revalidatePath('/admin') }

  return <div className="space-y-6">
    <h1 className="text-2xl">{tenant.name} · Admin</h1>
    <form action={toggle} className="flex items-center gap-3">
      <span>Tailor sign-up: <b>{tenant.tailor_signup_open ? 'Open' : 'Locked'}</b></span>
      <button className="btn">{tenant.tailor_signup_open ? 'Lock sign-up' : 'Open sign-up'}</button></form>
    <div className="grid grid-cols-2 gap-2">
      {Object.entries({ 'Clients who ordered': stats.clients, Pending: stats.pending, 'In progress': stats.progress, 'Completed / settled': stats.settled })
        .map(([k, v]) => <div key={k} className="border rounded p-3"><div className="text-2xl">{v}</div>{k}</div>)}</div>
    <h2 className="text-xl">Orders</h2>
    {list.length === 0 && <p>No orders yet.</p>}
    {list.map(o => { const asg = o.assignments?.[o.assignments.length - 1]
      return <div key={o.id} className="border rounded p-3 space-y-2">
        <div><b>{o.client?.full_name}</b> · {o.client?.phone} · <i>{o.status}</i></div>
        <p>{o.description}</p><p>Materials: {o.materials || '—'}</p>
        <p>Delivery: {o.delivery_type === 'pickup' ? 'Pick-up' : o.delivery_address}</p>
        <p>Measurements: {o.measurement_request ? 'Client asked for a house visit' : JSON.stringify(o.measurement?.data)}</p>
        {asg && <p>Tailor: {asg.tailor?.full_name} ({asg.status}{asg.reject_reason ? `: ${asg.reject_reason}` : ''})</p>}
        {(!asg || asg.status === 'rejected') &&
          <form action={assign} className="flex gap-2"><input type="hidden" name="order" value={o.id} />
            <select className="in" name="tailor">{tailors?.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
            <button className="btn">Assign</button></form>}
        <form action={setStatus} className="flex gap-2"><input type="hidden" name="order" value={o.id} />
          <select className="in" name="status" defaultValue={o.status}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
          <button className="btn">Update</button></form></div> })}
    <h2 className="text-xl">Post a completed job</h2>
    <form action={post} className="space-y-2">
      <input className="in" name="title" placeholder="Title" required />
      <input className="in" name="category" placeholder="Category (e.g. wedding, casual)" />
      <input className="in" name="image_url" placeholder="Image URL" required />
      <textarea className="in" name="description" placeholder="Description and materials" />
      <button className="btn">Publish to gallery</button></form>
  </div>
}
