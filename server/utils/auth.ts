import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, setCookie } from 'h3'

export const SESSION_COOKIE_NAME = 'vibe-player-session'

interface SessionPayload {
  kind: 'vibe-player'
  exp: number
}

function toBase64Url(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  return Buffer.from(bytes).toString('base64url')
}

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8')
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return toBase64Url(new Uint8Array(signature))
}

export async function signSessionToken(payload: SessionPayload, secret: string) {
  const serialized = JSON.stringify(payload)
  const encoded = toBase64Url(serialized)
  const signature = await hmac(encoded, secret)
  return `${encoded}.${signature}`
}

export async function verifySessionToken(token: string, secret: string) {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) {
    return null
  }

  const expectedSignature = await hmac(encoded, secret)
  if (signature !== expectedSignature) {
    return null
  }

  const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload
  if (payload.kind !== 'vibe-player' || payload.exp < Date.now()) {
    return null
  }

  return payload
}

export async function createSessionCookie(secret: string, durationMs = 1000 * 60 * 60 * 24 * 7) {
  return signSessionToken({ kind: 'vibe-player', exp: Date.now() + durationMs }, secret)
}

export async function setSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  const token = await createSessionCookie(config.sessionSecret)

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearAppSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: '/'
  })
}

export async function getAppSession(event: H3Event) {
  const config = useRuntimeConfig(event)
  const token = getCookie(event, SESSION_COOKIE_NAME)

  if (!token) {
    return null
  }

  return verifySessionToken(token, config.sessionSecret)
}

export async function requireAppSession(event: H3Event) {
  const session = await getAppSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Passcode required'
    })
  }

  return session
}
