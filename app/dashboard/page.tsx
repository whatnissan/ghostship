'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

interface RoutingCode {
  id: string; code: string; label: string | null
  isActive: boolean; usageCount: number; maxUsage: number | null
  expiresAt: string | null; createdAt: string
}

interface AddressForm {
  name: string; line1: string; line2: string
  city: string; state: string; zip: string; country: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [codes, setCodes] = useState<RoutingCode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [zipLookup, setZipLookup] = useState(false)
  const [address, setAddress] = useState<AddressForm>({
    name: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US'
  })
  const [label, setLabel] = useState('')

  useEffect(() => { fetchCodes() }, [])

  useEffect(() => {
    if (address.city.length > 2 && address.state.length === 2) {
      lookupZip(address.city, address.state)
    }
  }, [address.city, address.state])

  async function lookupZip(city: string, state: string) {
    setZipLookup(true)
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${state}/${encodeURIComponent(city)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.places?.[0]) setAddress(a => ({ ...a, zip: data.places[0]['post code'] }))
      }
    } catch { /* silent fail */ }
    finally { setZipLookup(false) }
  }

  async function fetchCodes() {
    try {
      const res = await fetch('/api/routing-codes')
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setCodes(data.codes || [])
      if (data.codes?.length === 0) setShowForm(true)
    } catch { setError('Failed to load routing codes') }
    finally { setLoading(false) }
  }

  async function createCode() {
    setError(''); setCreating(true)
    try {
      const body: Record<string, unknown> = { label: label || undefined }
      if (codes.length === 0) body.address = address
      const res = await fetch('/api/routing-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowForm(false); setLabel('')
      await fetchCodes()
    } catch { setError('Something went wrong') }
    finally { setCreating(false) }
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white">👻 Ghost Ship</span>
        <div className="flex items-center gap-4"><a href="/send" className="text-sm text-slate-400 hover:text-white">Send a Package</a><button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/') }} className="text-sm text-slate-400 hover:text-white">Log out</button></div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Your Routing Codes</h1>
            <p className="text-slate-400 text-sm mt-1">Share these publicly — your real address stays hidden.</p>
          </div>
          {codes.length > 0 && (
            <button onClick={() => { setShowForm(true); setLabel('') }}
              className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-500 transition-colors">
              + New Code
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
        )}

        {showForm && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-8">
            <h2 className="font-semibold text-white mb-1">
              {codes.length === 0 ? 'Set up your shipping address' : 'Create another routing code'}
            </h2>
            <p className="text-sm text-slate-400 mb-5">Stored encrypted. Never visible to senders.</p>

            {codes.length === 0 && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Recipient Name</label>
                  <input type="text" placeholder="Full name on label" value={address.name}
                    onChange={e => setAddress(a => ({ ...a, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Street Address</label>
                  <input type="text" placeholder="123 Main St" value={address.line1}
                    onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Apt / Suite <span className="text-slate-600">(optional)</span></label>
                  <input type="text" placeholder="Apt 4B" value={address.line2}
                    onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                    <input type="text" placeholder="Los Angeles" value={address.city}
                      onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">State</label>
                    <select value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">Select state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    ZIP Code {zipLookup && <span className="text-violet-400 ml-1">Looking up...</span>}
                  </label>
                  <input type="text" placeholder="Auto-filled from city + state" value={address.zip}
                    onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Code Label <span className="text-slate-600">(optional)</span></label>
              <input type="text" placeholder='e.g. "Fan Mail"' value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>

            <button onClick={createCode} disabled={creating}
              className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-violet-500 transition-colors disabled:opacity-50">
              {creating ? 'Generating...' : 'Generate Routing Code'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {codes.map(code => (
            <div key={code.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold text-violet-400 tracking-widest">{code.code}</span>
                  {code.label && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{code.label}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">{code.usageCount} shipment{code.usageCount !== 1 ? 's' : ''} received</div>
              </div>
              <button onClick={() => copy(code.code)}
                className="text-sm text-violet-400 hover:text-violet-300 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                {copied === code.code ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
