import { revalidatePath } from 'next/cache'
import { sb } from '@/lib/supabase'
const M = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'inseam']
export default async function Client() {
  const s = sb()
  const { data: posts } = await s.from('gallery_posts').select('*').order('created_at', { ascending: false })
  const { data: orders } = await s.from('orders').select('id,status,description,created_at').order('created_at', { ascending: false })
  async function order(fd: FormData) { 'use server'
    const c = sb()
    let measurement_id = null
    const request = fd.get('measure') === 'request'
    if (!request) {
      const data = Object.fromEntries(M.map(k => [k, fd.get(k)]))
      const { data: m } = await c.from('measurements').insert({ data }).select().single()
      measurement_id = m?.id // attached automatically to this order
    }
    await c.from('orders').insert({
      description: fd.get('description'), materials: fd.get('materials'),
      gallery_post_id: fd.get('post') || null, measurement_id, measurement_request: request,
      delivery_type: fd.get('delivery'), delivery_address: fd.get('address') })
    revalidatePath('/client') }
  return <div className="space-y-6">
    <h1 className="text-2xl">Your commissions</h1>
    <h2 className="text-xl">Gallery</h2>
    {!posts?.length && <p>No completed jobs posted yet.</p>}
    <div className="grid grid-cols-2 gap-2">{posts?.map(p => <div key={p.id} className="border rounded p-2">
      <img src={p.image_url} alt={p.title} className="w-full aspect-square object-cover" /><b>{p.title}</b><div className="text-sm">{p.category}</div></div>)}</div>
    <h2 className="text-xl">New commission</h2>
    <form action={order} className="space-y-2">
      <select className="in" name="post"><option value="">My own design</option>{posts?.map(p => <option key={p.id} value={p.id}>Inspired by: {p.title}</option>)}</select>
      <textarea className="in" name="description" placeholder="Describe the style and how it should be made" required />
      <input className="in" name="materials" placeholder="Fabric / materials" />
      <fieldset className="border rounded p-2 space-y-2"><legend>Measurements (cm)</legend>
        <select className="in" name="measure"><option value="own">I will enter my own</option><option value="request">Send someone from the fashion house</option></select>
        <div className="grid grid-cols-2 gap-2">{M.map(k => <input key={k} className="in" name={k} placeholder={k} />)}</div></fieldset>
      <select className="in" name="delivery"><option value="delivery">Deliver to me</option><option value="pickup">I will pick it up</option></select>
      <input className="in" name="address" placeholder="Delivery address or location (also used for measurement visit)" />
      <button className="btn">Submit commission</button></form>
    <h2 className="text-xl">Your orders</h2>
    {orders?.map(o => <div key={o.id} className="border rounded p-2"><i>{o.status}</i> · {o.description}</div>)}
  </div>
}
