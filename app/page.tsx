import Link from 'next/link'
export default function Home() {
  return <div className="space-y-4 pt-10">
    <h1 className="text-3xl">Fashion House</h1>
    <p>Commission tailor-made clothing from your fashion house.</p>
    <div className="flex gap-3"><Link className="btn" href="/signup">Sign up</Link><Link className="btn" href="/login">Log in</Link></div>
  </div>
}
