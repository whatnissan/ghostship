import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const ENCODING = 'hex' as const

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY not set')
  if (key.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex characters')
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(':')
}

export function decrypt(encryptedData: string): string {
  const key = getKey()
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, ENCODING)
  const authTag = Buffer.from(authTagHex, ENCODING)
  const ciphertext = Buffer.from(ciphertextHex, ENCODING)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function encryptAddress(address: {
  line1: string; line2?: string; city: string
  state: string; zip: string; country: string; name: string
}) {
  return {
    encryptedLine1:   encrypt(address.line1),
    encryptedLine2:   address.line2 ? encrypt(address.line2) : null,
    encryptedCity:    encrypt(address.city),
    encryptedState:   encrypt(address.state),
    encryptedZip:     encrypt(address.zip),
    encryptedCountry: encrypt(address.country),
    encryptedName:    encrypt(address.name),
  }
}

export function decryptAddress(profile: {
  encryptedLine1: string; encryptedLine2: string | null; encryptedCity: string
  encryptedState: string; encryptedZip: string; encryptedCountry: string; encryptedName: string
}) {
  return {
    line1:   decrypt(profile.encryptedLine1),
    line2:   profile.encryptedLine2 ? decrypt(profile.encryptedLine2) : undefined,
    city:    decrypt(profile.encryptedCity),
    state:   decrypt(profile.encryptedState),
    zip:     decrypt(profile.encryptedZip),
    country: decrypt(profile.encryptedCountry),
    name:    decrypt(profile.encryptedName),
  }
}
