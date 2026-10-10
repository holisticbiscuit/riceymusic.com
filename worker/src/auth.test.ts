import { describe, expect, it } from 'vitest'
import { safeEqual, signToken, verifyToken } from './auth'

const SECRET = 'test-secret'

describe('safeEqual', () => {
  it('matches equal strings and rejects different ones', async () => {
    expect(await safeEqual('ricey', 'ricey')).toBe(true)
    expect(await safeEqual('ricey', 'rice')).toBe(false)
    expect(await safeEqual('', 'x')).toBe(false)
    expect(await safeEqual('', '')).toBe(false)
  })
})

describe('tokens', () => {
  it('verifies a fresh token', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken(SECRET, t, 1000 + 59)).toBe(true)
  })
  it('rejects an expired token', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken(SECRET, t, 1000 + 61)).toBe(false)
  })
  it('rejects a token signed with another secret or tampered with', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken('other', t, 1001)).toBe(false)
    const [exp, sig] = t.split('.')
    expect(await verifyToken(SECRET, `${Number(exp) + 999}.${sig}`, 1001)).toBe(false)
    expect(await verifyToken(SECRET, 'garbage', 1001)).toBe(false)
    expect(await verifyToken(SECRET, '', 1001)).toBe(false)
  })
})
