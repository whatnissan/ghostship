import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { decryptAddress } from '@/lib/encryption'
import { createLabelWithQRCode } from '@/lib/shippo'
import Stripe from 'stripe'
import { sendQRCodeEmail, sendPackageNotificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature!, webhookSecret)
  } catch (err) {
    console.error('[webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    try {
      const shipment = await prisma.shipment.findFirst({
        where: { stripePaymentIntentId: pi.id },
        include: { routingCode: { include: { shippingProfile: true } } },
      })
      if (!shipment || shipment.status !== 'PAYMENT_PENDING') return NextResponse.json({ success: true })

      await prisma.shipment.update({ where: { id: shipment.id }, data: { status: 'LABEL_GENERATING', stripeStatus: 'paid' } })

      const address = decryptAddress(shipment.routingCode.shippingProfile)
      const result = await createLabelWithQRCode({
        toAddress: { name: address.name, street1: address.line1, street2: address.line2, city: address.city, state: address.state, zip: address.zip, country: address.country },
        pkg: { weightOz: shipment.weightOz, lengthIn: shipment.lengthIn, widthIn: shipment.widthIn, heightIn: shipment.heightIn },
        rateObjectId: shipment.shippoShipmentId!,
      })

      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { status: 'LABEL_READY', shippoTransactionId: result.transactionId, qrCodeUrl: result.qrCodeUrl, labelUrl: result.labelUrl, trackingNumber: result.trackingNumber },
      })
      await prisma.routingCode.update({ where: { id: shipment.routingCodeId }, data: { usageCount: { increment: 1 } } })

      // Send emails
      const receiver = await prisma.user.findUnique({ where: { id: shipment.routingCode.userId }, select: { email: true, displayName: true } })
      
      await sendQRCodeEmail({
        toEmail: shipment.senderEmail,
        toName: shipment.senderName ?? 'Sender',
        qrCodeUrl: result.qrCodeUrl,
        carrier: shipment.carrier ?? '',
        service: shipment.serviceLevel ?? '',
        trackingNumber: result.trackingNumber,
        routingCode: shipment.routingCode.code,
      }).catch(err => console.error('[email] QR code email failed:', err))

      if (receiver) {
        await sendPackageNotificationEmail({
          toEmail: receiver.email,
          toName: receiver.displayName ?? 'there',
          senderName: shipment.senderName ?? 'Someone',
          carrier: shipment.carrier ?? '',
          service: shipment.serviceLevel ?? '',
          trackingNumber: result.trackingNumber,
        }).catch(err => console.error('[email] Notification email failed:', err))
      }
    } catch (err) {
      console.error('[webhook] Label generation failed:', err)
      await prisma.shipment.updateMany({ where: { stripePaymentIntentId: pi.id }, data: { status: 'PAYMENT_FAILED' } }).catch(() => {})
      return NextResponse.json({ error: 'Label generation failed' }, { status: 500 })
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    await prisma.shipment.updateMany({ where: { stripePaymentIntentId: pi.id }, data: { status: 'PAYMENT_FAILED', stripeStatus: 'failed' } }).catch(console.error)
  }

  return NextResponse.json({ received: true })
}
