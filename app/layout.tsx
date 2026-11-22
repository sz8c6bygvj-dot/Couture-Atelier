import './globals.css'
export const metadata = { title: 'Fashion House' }
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><main className="max-w-3xl mx-auto p-4">{children}</main></body></html>
}
