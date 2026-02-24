import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json()
    if (!email || !password || !displayName)
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: 'Account already exists with this email' }, { status: 409 })

    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), displayName },
    })

    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    const response = NextResponse.json(
      { success: true, user: { id: user.id, email: user.email, displayName: user.displayName } },
      { status: 201 }
    )
    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
    })
    return response
  } catch (err) {
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
