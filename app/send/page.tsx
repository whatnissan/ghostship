'use client'
import { useState } from 'react'
import Link from 'next/link'

type Step = 'code' | 'dimensions' | 'rates' | 'success'

interface Rate {
  object_id: string; provider: string
  servicelevel: { name: string }; amount: string
  currency: string; estimated_days: number
}

export default function SendPage() {
  const [step, setStep] = useState<Step>('code')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [routingCode, setRoutingCode] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [dims, setDims] = useState({ weightOz: '', lengthIn: '', widthIn: '', heightIn: '' })
  const [rates, setRates] = useState<Rate[]>([])
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null)

  async function handleGetRates() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingCode: routingCode.toUpperCase().trim(),
          senderEmail, senderName,
          weightOz: parseFloat(dims.weightOz), lengthIn: parseFloat(dims.lengthIn),
          widthIn: parseFloat(dims.widthIn), heightIn: parseFloat(dims.heightIn),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setRates(data.rates); setStep('rates')
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  const steps: Step[] = ['code', 'dimensions', 'rates', 'success']

  return (
    <main className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">👻 Ghost Ship</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Send a Package</h1>
          <p className="text-slate-400 text-sm mt-1">Enter the recipient&apos;s routing code to get started.</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-violet-500' : steps.indexOf(step) > i ? 'bg-violet-800' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          {error && <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

          {step === 'code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Routing Code</label>
                <input type="text" placeholder="e.g. GHOST-4821"
                  value={routingCode} onChange={e => setRoutingCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
                <input type="text" placeholder="So they know who sent it"
                  value={senderName} onChange={e => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Your Email</label>
                <input type="email" placeholder="For your receipt"
                  value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button onClick={() => setStep('dimensions')} disabled={!routingCode || !senderEmail || !senderName}
                className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                Continue →
              </button>
            </div>
          )}

          {step === 'dimensions' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Package Dimensions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'weightOz', label: 'Weight (oz)' }, { key: 'lengthIn', label: 'Length (in)' },
                  { key: 'widthIn', label: 'Width (in)' }, { key: 'heightIn', label: 'Height (in)' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                    <input type="number" min="0" step="0.1"
                      value={dims[f.key as keyof typeof dims]}
                      onChange={e => setDims(d => ({ ...d, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleGetRates} disabled={loading || !dims.weightOz}
                className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                {loading ? 'Getting rates...' : 'Get Shipping Rates →'}
              </button>
            </div>
          )}

          {step === 'rates' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Choose Shipping</h2>
              <div className="space-y-2">
                {rates.map(rate => (
                  <button key={rate.object_id} onClick={() => setSelectedRate(rate)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedRate?.object_id === rate.object_id ? 'border-violet-500 bg-violet-950' : 'border-slate-700 hover:border-slate-600 bg-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm text-white">{rate.provider}</span>
                        <span className="text-xs text-slate-400 ml-2">{rate.servicelevel.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">${rate.amount}</div>
                        <div className="text-xs text-slate-400">{rate.estimated_days} day{rate.estimated_days !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button disabled={!selectedRate || loading}
                className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                {loading ? 'Processing...' : 'Pay & Get QR Code →'}
              </button>
              <p className="text-xs text-slate-500 text-center">Stripe payment integration coming next — QR code delivered instantly on success.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
