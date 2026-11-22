import { revalidatePath } from 'next/cache'
import { sb } from '@/lib/supabase'
export default async function Tailor() {
  // tailor_jobs view exposes no client name, phone, address or id
  const { data: jobs } = await sb().from('tailor_jobs').select('*')
  async function respond(fd: FormData) { 'use server'
    const a = String(fd.get('action'))
    const patch = a === 'accept' ? { status: 'accepted' } : a === 'reject' ? { status: 'rejected', reject_reason: fd.get('reason') } : { status: 'completed' }
    await sb().from('assignments').update(patch).eq('id', fd.get('id')); revalidatePath('/tailor') }
  return <div className="space-y-4">
    <h1 className="text-2xl">Your jobs</h1>
    {!jobs?.length && <p>No jobs assigned yet.</p>}
    {jobs?.map(j => <div key={j.assignment_id} className="border rounded p-3 space-y-2">
      <p><i>{j.status}</i></p><p>{j.description}</p><p>Materials: {j.materials || '—'}</p>
      <p>Measurements: {JSON.stringify(j.measurements)}</p>
      <form action={respond} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={j.assignment_id} />
        {j.status === 'pending' && <>
          <input className="in" name="reason" placeholder="Reason (if rejecting)" />
          <button className="btn" name="action" value="accept">Accept</button>
          <button className="btn" name="action" value="reject">Reject</button></>}
        {j.status === 'accepted' && <button className="btn" name="action" value="complete">Submit as completed</button>}
      </form></div>)}
  </div>
}
