import { describe, expect, it } from 'vitest'
import { normalizeCredits, sortRoles, type Credit } from './credits'

const c = (title: string, date: string, extra: Partial<Credit> = {}): Credit => ({
  id: title.toLowerCase(), title, artist: 'A', roles: ['Mastering'], date, ...extra,
})

describe('normalizeCredits', () => {
  it('sorts newest release first', () => {
    const out = normalizeCredits([c('Old', '2023-01-01'), c('New', '2026-08-07'), c('Mid', '2025-05-09')])
    expect(out.map(x => x.title)).toEqual(['New', 'Mid', 'Old'])
  })
  it('drops entries without title, artist or date', () => {
    const out = normalizeCredits([c('Ok', '2025-01-01'), c('', '2025-01-01'), c('No date', '')])
    expect(out.map(x => x.title)).toEqual(['Ok'])
  })
  it('fills a missing id from artist and title', () => {
    const out = normalizeCredits([c('Years', '2026-06-05', { id: '', artist: 'Ricey' })])
    expect(out[0].id).toBe('ricey-years')
  })
})

describe('sortRoles', () => {
  it('puts mixing and mastering before production roles', () => {
    expect(sortRoles(['Composer', 'Mastering', 'Producer', 'Mixing'])).toEqual(['Mixing', 'Mastering', 'Producer', 'Composer'])
  })
})
