import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createShippingPaymentIntent } from '@/lib/stripe'
import { getShippingRates } from '@/lib/shippo'
import { isValidRoutingCodeFormat } from '@/lib/routing-codes'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { routingCode, senderEmail, senderName, weightOz, lengthIn, widthIn, heightIn, selectedRate } = body

    if (!routingCode || !isValidRoutingCodeFormat(routingCode))
      return NextResponse.json({ error: 'Invalid routing code format' }, { status: 400 })

    const code = await prisma.routingCode.findUnique({
      where: { code: routingCode.toUpperCase().trim() },
      include: { shippingProfile: true },
    })
    if (!code || !code.isActive) return NextResponse.json({ error: 'Routing code not found or inactive' }, { status: 404 })
    if (code.expiresAt && code.expiresAt < new Date()) return NextResponse.json({ error: 'Routing code expired' }, { status: 410 })
    if (code.maxUsage && code.usageCount >= code.maxUsage) return NextResponse.json({ error: 'Routing code usage limit reached' }, { status: 410 })

    const pkg = { weightOz, lengthIn, widthIn, heightIn }

    // Step 1: just get rates
    if (!selectedRate) {
      const rates = await getShippingRates(pkg)
      return NextResponse.json({ rates })
    }

    // Step 2: create payment intent with selected rate passed from frontend
    const totalCents = Math.round(parseFloat(selectedRate.amount) * 100 * 1.15)

    const shipment = await prisma.shipment.create({
      data: {
        routingCodeId: code.id, senderEmail, senderName,
        weightOz, lengthIn, widthIn, heightIn,
        carrier: selectedRate.provider,
        serviceLevel: selectedRate.servicelevel.token,
        stripePaymentIntentId: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        amountCents: totalCents,
        status: 'PAYMENT_PENDING',
        shippoShipmentId: selectedRate.object_id,
      },
    })

    const paymentIntent = await createShippingPaymentIntent({ amountCents: totalCents, routingCode, senderEmail, shipmentId: shipment.id })
    await prisma.shipment.update({ where: { id: shipment.id }, data: { stripePaymentIntentId: paymentIntent.id } })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      shipmentId: shipment.id,
      amountCents: totalCents,
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel.name,
      estimatedDays: selectedRate.estimated_days,
    })
  } catch (err) {
    console.error('[shipments POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
