import { describe, expect, it } from 'vitest'
import { cityLabel, parseMove, spaceOriginOk } from './space'

describe('parseMove', () => {
  it('accepts a light and rounds it', () => {
    expect(parseMove('{"p":[1.23456,-2,3],"v":[0.5,0,-1.004],"w":"years"}')).toEqual({ p: [1.23, -2, 3], v: [0.5, 0, -1], w: 'years' })
  })
  it('rejects anything malformed or out of range', () => {
    expect(parseMove('not json')).toBeNull()
    expect(parseMove('null')).toBeNull()
    expect(parseMove('{"p":[1,2],"v":[0,0,0],"w":"space"}')).toBeNull()
    expect(parseMove('{"p":[1,2,"x"],"v":[0,0,0],"w":"space"}')).toBeNull()
    expect(parseMove('{"p":[1,2,9999],"v":[0,0,0],"w":"space"}')).toBeNull()
    expect(parseMove('{"p":[1,2,3],"v":[0,0,500],"w":"space"}')).toBeNull()
    expect(parseMove('{"p":[1,2,3],"v":[0,0,0],"w":"mars"}')).toBeNull()
    expect(parseMove(JSON.stringify({ p: [1, 2, 3], v: [0, 0, 0], w: 'space', pad: 'x'.repeat(300) }))).toBeNull()
    expect(parseMove(42)).toBeNull()
  })
})

describe('cityLabel', () => {
  it('keeps real city names', () => {
    expect(cityLabel('London')).toBe('London')
    expect(cityLabel('São Paulo')).toBe('São Paulo')
  })
  it('strips markup and falls back', () => {
    expect(cityLabel('<b>Oslo</b>')).toBe('bOslob')
    expect(cityLabel('')).toBe('somewhere')
    expect(cityLabel(undefined)).toBe('somewhere')
  })
})

describe('spaceOriginOk', () => {
  const allowed = 'https://riceymusic.com,https://www.riceymusic.com'
  it('allows the site, local development and the tailnet', () => {
    expect(spaceOriginOk('https://riceymusic.com', allowed)).toBe(true)
    expect(spaceOriginOk('http://127.0.0.1:5182', allowed)).toBe(true)
    expect(spaceOriginOk('http://localhost:5173', allowed)).toBe(true)
    expect(spaceOriginOk('https://box.tail1234.ts.net', allowed)).toBe(true)
  })
  it('turns everyone else away', () => {
    expect(spaceOriginOk('https://evil.example', allowed)).toBe(false)
    expect(spaceOriginOk('http://box.tail1234.ts.net', allowed)).toBe(false)
    expect(spaceOriginOk('', allowed)).toBe(false)
  })
})
