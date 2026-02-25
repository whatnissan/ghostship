import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const paymentIntentId = req.nextUrl.searchParams.get('paymentIntentId')
  if (!paymentIntentId) return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })

  const shipment = await prisma.shipment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { qrCodeUrl: true, status: true },
  })

  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  if (shipment.qrCodeUrl) return NextResponse.json({ qrCodeUrl: shipment.qrCodeUrl })
  return NextResponse.json({ status: shipment.status })
}
