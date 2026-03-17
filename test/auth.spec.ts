import { describe, expect, it } from 'vitest'
import { signSessionToken, verifySessionToken } from '../server/utils/auth'

describe('session signing', () => {
  it('round-trips a signed session token', async () => {
    const secret = 'test-secret'
    const token = await signSessionToken({
      kind: 'vibe-player',
      exp: Date.now() + 60_000
    }, secret)

    const session = await verifySessionToken(token, secret)
    expect(session?.kind).toBe('vibe-player')
  })

  it('rejects tokens with a different secret', async () => {
    const token = await signSessionToken({
      kind: 'vibe-player',
      exp: Date.now() + 60_000
    }, 'left')

    const session = await verifySessionToken(token, 'right')
    expect(session).toBeNull()
  })
})
