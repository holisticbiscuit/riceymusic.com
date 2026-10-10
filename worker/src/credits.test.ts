import { describe, expect, it } from 'vitest'
import { validateCredit } from './credits'

const base = { title: 'Alive', artist: 'SERGIO DO CARMO', roles: ['Producer'], date: '2026-08-07' }

describe('validateCredit', () => {
  it('accepts a complete credit, trims fields and fills the id', () => {
    const r = validateCredit({ ...base, title: ' Alive ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.credit.title).toBe('Alive')
      expect(r.credit.id).toBe('sergio-do-carmo-alive')
    }
  })
  it('rejects unknown roles, bad dates and missing fields', () => {
    expect(validateCredit({ ...base, roles: ['DJ'] }).ok).toBe(false)
    expect(validateCredit({ ...base, roles: [] }).ok).toBe(false)
    expect(validateCredit({ ...base, date: '07/08/2026' }).ok).toBe(false)
    expect(validateCredit({ ...base, title: '' }).ok).toBe(false)
    expect(validateCredit(null).ok).toBe(false)
  })
  it('only allows http(s) art and links', () => {
    expect(validateCredit({ ...base, art: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateCredit({ ...base, url: 'data:text/html,x' }).ok).toBe(false)
    expect(validateCredit({ ...base, art: 'https://i.scdn.co/image/x' }).ok).toBe(true)
  })
  it('keeps site-relative art for the bundled covers', () => {
    expect(validateCredit({ ...base, art: '/images/credits/x.jpg' }).ok).toBe(true)
  })
})
