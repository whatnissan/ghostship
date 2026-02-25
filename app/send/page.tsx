'use client'
import { useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Step = 'code' | 'dimensions' | 'rates' | 'payment' | 'success'

interface Rate {
  object_id: string
  provider: string
  servicelevel: { name: string }
  amount: string
  currency: string
  estimated_days: number
}

// ── Stripe payment form ───────────────────────────────────────────────────────
function CheckoutForm({ amountCents, carrier, service, onSuccess }: {
  amountCents: number
  carrier: string
  service: string
  onSuccess: (qrCodeUrl: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError('')
    setLoading(true)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Payment failed')
      setLoading(false)
      return
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      // Poll for QR code — webhook needs a moment to generate it
      let attempts = 0
      const poll = async () => {
        const res = await fetch(`/api/shipments/qr?paymentIntentId=${paymentIntent.id}`)
        const data = await res.json()
        if (data.qrCodeUrl) {
          onSuccess(data.qrCodeUrl)
        } else if (attempts < 10) {
          attempts++
          setTimeout(poll, 2000)
        } else {
          setError('QR code is taking longer than expected. Check your email for updates.')
        }
      }
      poll()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-300 flex justify-between">
        <span>{carrier} · {service}</span>
        <span className="font-semibold text-white">${(amountCents / 100).toFixed(2)}</span>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button type="submit" disabled={!stripe || loading}
        className="w-full bg-violet-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
        {loading ? 'Processing...' : `Pay $${(amountCents / 100).toFixed(2)}`}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Secured by Stripe · Your card details are never stored on our servers
      </p>
    </form>
  )
}

// ── Main send page ────────────────────────────────────────────────────────────
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
  const [clientSecret, setClientSecret] = useState('')
  const [amountCents, setAmountCents] = useState(0)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  async function handleGetRates() {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingCode: routingCode.toUpperCase().trim(),
          senderEmail, senderName,
          weightOz: parseFloat(dims.weightOz),
          lengthIn: parseFloat(dims.lengthIn),
          widthIn: parseFloat(dims.widthIn),
          heightIn: parseFloat(dims.heightIn),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setRates(data.rates)
      setStep('rates')
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  async function handleSelectRate() {
    if (!selectedRate) return
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routingCode: routingCode.toUpperCase().trim(),
          senderEmail, senderName,
          weightOz: parseFloat(dims.weightOz),
          lengthIn: parseFloat(dims.lengthIn),
          widthIn: parseFloat(dims.widthIn),
          heightIn: parseFloat(dims.heightIn),
          selectedRateId: selectedRate.object_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setClientSecret(data.clientSecret)
      setAmountCents(data.amountCents)
      setStep('payment')
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  const steps: Step[] = ['code', 'dimensions', 'rates', 'payment', 'success']

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

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
              step === s ? 'bg-violet-500' : steps.indexOf(step) > i ? 'bg-violet-800' : 'bg-slate-700'
            }`} />
          ))}
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8">
          {error && (
            <div className="bg-red-950 border border-red-900 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Code + sender info */}
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
              <button onClick={() => setStep('dimensions')}
                disabled={!routingCode || !senderEmail || !senderName}
                className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Dimensions */}
          {step === 'dimensions' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Package Dimensions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'weightOz', label: 'Weight (oz)' },
                  { key: 'lengthIn', label: 'Length (in)' },
                  { key: 'widthIn', label: 'Width (in)' },
                  { key: 'heightIn', label: 'Height (in)' },
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

          {/* Step 3: Rate selection */}
          {step === 'rates' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Choose Shipping</h2>
              <div className="space-y-2">
                {rates.map(rate => (
                  <button key={rate.object_id} onClick={() => setSelectedRate(rate)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedRate?.object_id === rate.object_id
                        ? 'border-violet-500 bg-violet-950'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                    }`}>
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
              <button onClick={handleSelectRate} disabled={!selectedRate || loading}
                className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                {loading ? 'Preparing payment...' : 'Continue to Payment →'}
              </button>
            </div>
          )}

          {/* Step 4: Stripe payment */}
          {step === 'payment' && clientSecret && (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#7c3aed',
                  colorBackground: '#1e293b',
                  colorText: '#f1f5f9',
                  colorDanger: '#ef4444',
                  borderRadius: '8px',
                },
              },
            }}>
              <CheckoutForm
                amountCents={amountCents}
                carrier={selectedRate?.provider ?? ''}
                service={selectedRate?.servicelevel.name ?? ''}
                onSuccess={(url) => { setQrCodeUrl(url); setStep('success') }}
              />
            </Elements>
          )}

          {/* Step 5: QR code success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="text-5xl">✅</div>
              <div>
                <h2 className="font-bold text-white text-xl mb-2">Your QR Code is Ready!</h2>
                <p className="text-sm text-slate-400">
                  Take your sealed package to any USPS location. Show this QR code —
                  the clerk scans it and prints the label. You never see the destination address.
                </p>
              </div>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="Shipping QR Code"
                    className="w-52 h-52 rounded-xl border-2 border-violet-500 bg-white p-2" />
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-4 text-sm text-slate-400 space-y-1">
                <p>📦 Bring your sealed box</p>
                <p>📱 Show this QR code to the USPS clerk</p>
                <p>✅ They print and attach the label — you&apos;re done</p>
              </div>
              <p className="text-xs text-slate-500">
                Screenshot this QR code. It expires after drop-off.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
