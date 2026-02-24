'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">👻 Ghost Ship</Link>
          <h1 className="mt-4 text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1 text-sm">Log in to your account</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Your password' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-300 mb-1">{field.label}</label>
                <input type={field.type} required placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            ))}
            {error && <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-violet-400 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
