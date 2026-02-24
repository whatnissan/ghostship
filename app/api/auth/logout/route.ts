import { NextResponse } from 'next/server'
import { TOKEN_COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(TOKEN_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return response
}
