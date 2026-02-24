import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, '$2a$12$placeholderhashtopreventtiming00')

    if (!user || !valid)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, displayName: user.displayName } })
    response.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
    })
    return response
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
