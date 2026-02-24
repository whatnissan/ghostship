import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return _stripe
}

export async function createShippingPaymentIntent({
  amountCents, currency = 'usd', routingCode, senderEmail, shipmentId,
}: {
  amountCents: number; currency?: string
  routingCode: string; senderEmail: string; shipmentId: string
}) {
  return getStripe().paymentIntents.create({
    amount: amountCents,
    currency,
    receipt_email: senderEmail,
    metadata: { routingCode, senderEmail, shipmentId, service: 'ghostship' },
    automatic_payment_methods: { enabled: true },
  })
}
