import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/auth'
import { encryptAddress } from '@/lib/encryption'
import { generateUniqueRoutingCode } from '@/lib/routing-codes'

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const codes = await prisma.routingCode.findMany({
    where: { userId: session.userId },
    select: { id: true, code: true, label: true, isActive: true, usageCount: true, maxUsage: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { label, address } = await req.json()
    let shippingProfile = await prisma.shippingProfile.findUnique({ where: { userId: session.userId } })

    if (!shippingProfile) {
      if (!address) return NextResponse.json({ error: 'Address required for first routing code' }, { status: 400 })
      const { line1, line2, city, state, zip, country, name } = address
      if (!line1 || !city || !state || !zip || !country || !name)
        return NextResponse.json({ error: 'Incomplete address' }, { status: 400 })
      shippingProfile = await prisma.shippingProfile.create({
        data: { userId: session.userId, countryCode: country.toUpperCase(), ...encryptAddress({ line1, line2, city, state, zip, country, name }) },
      })
    }

    const code = await generateUniqueRoutingCode()
    const routingCode = await prisma.routingCode.create({
      data: { code, label: label ?? null, userId: session.userId, shippingProfileId: shippingProfile.id },
    })
    return NextResponse.json({ success: true, routingCode: { id: routingCode.id, code: routingCode.code, label: routingCode.label } }, { status: 201 })
  } catch (err) {
    console.error('[routing-codes POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
