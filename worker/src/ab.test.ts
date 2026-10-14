import { describe, expect, it } from 'vitest'
import { audioPath, isSha, validateEntry } from './ab'

const peaks = Array.from({ length: 160 }, (_, i) => (i % 10) / 10)
const base = {
  title: 'The One',
  artist: 'zaccwithtwocs',
  art: '/images/credits/zaccwithtwocs-the-one.jpg',
  date: '2026-08-28',
  mode: 'Mixing & mastering',
  lufs: { before: -16.6, after: -10.8 },
  duration: 66.85,
  peaks: { before: peaks, after: peaks },
}

describe('validateEntry', () => {
  it('accepts a complete pair and sets the id and paths from the title', () => {
    const r = validateEntry({ ...base, src: { before: '/elsewhere.mp3', after: '../../x' } })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.id).toBe('the-one')
      expect(r.entry.src).toEqual({ before: '/audio/ab/the-one-before.mp3', after: '/audio/ab/the-one-after.mp3' })
      expect(audioPath(r.id, 'after')).toBe('public/audio/ab/the-one-after.mp3')
    }
  })

  it('rejects an unknown comparison', () => {
    expect(validateEntry({ ...base, mode: 'Remix' }).ok).toBe(false)
  })

  it('rejects broken waveform or loudness data', () => {
    expect(validateEntry({ ...base, peaks: { before: [1, 2], after: peaks } }).ok).toBe(false)
    expect(validateEntry({ ...base, lufs: { before: 'loud', after: -8 } }).ok).toBe(false)
  })

  it('keeps titles that would escape the folder inside it', () => {
    const r = validateEntry({ ...base, title: '../../src/main' })
    expect(r.ok && r.id).toBe('src-main')
  })
})

describe('isSha', () => {
  it('accepts only a 40-character hex sha', () => {
    expect(isSha('a'.repeat(40))).toBe(true)
    expect(isSha('main')).toBe(false)
  })
})
