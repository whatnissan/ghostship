import { prisma } from './prisma'

const PREFIXES = [
  'GHOST','SHIP','NOVA','ECHO','FLUX',
  'IRON','JADE','MIST','ONYX','SAGE',
  'TIDE','VALE','WAVE','STAR','APEX',
]

function generateCandidate(): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]
  const number = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${number}`
}

export async function generateUniqueRoutingCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateCandidate()
    const existing = await prisma.routingCode.findUnique({ where: { code: candidate } })
    if (!existing) return candidate
  }
  throw new Error('Could not generate unique routing code')
}

export function isValidRoutingCodeFormat(code: string): boolean {
  return /^[A-Z]{2,8}-\d{4}$/.test(code.toUpperCase().trim())
}
