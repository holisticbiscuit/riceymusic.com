import { describe, expect, it } from 'vitest'
import { parseLink, parseSpotifyPage } from './lookup'

describe('parseLink', () => {
  it('reads Spotify track links', () => {
    expect(parseLink('https://open.spotify.com/track/3ri0AagToCTAAQbDcNvGUJ?si=abc')).toEqual({ kind: 'spotify', id: '3ri0AagToCTAAQbDcNvGUJ' })
    expect(parseLink('https://open.spotify.com/intl-de/track/3ri0AagToCTAAQbDcNvGUJ')).toEqual({ kind: 'spotify', id: '3ri0AagToCTAAQbDcNvGUJ' })
  })
  it('reads Apple Music song links', () => {
    expect(parseLink('https://music.apple.com/gb/album/years-single/1896463665?i=1896463666')).toEqual({ kind: 'apple', id: '1896463666' })
    expect(parseLink('https://music.apple.com/gb/song/years/1896463666')).toEqual({ kind: 'apple', id: '1896463666' })
  })
  it('rejects anything else', () => {
    expect(parseLink('https://example.com/track/1')).toBeNull()
    expect(parseLink('https://open.spotify.com/album/3ri0AagToCTAAQbDcNvGUJ')).toBeNull()
    expect(parseLink('not a url')).toBeNull()
  })
})

describe('parseSpotifyPage', () => {
  it('pulls title, artist, date and cover from meta tags', () => {
    const html =
      '<meta property="og:title" content="Alive"/><meta property="og:description" content="SERGIO DO CARMO · Alive · Song · 2026"/>' +
      '<meta property="og:image" content="https://i.scdn.co/image/abc"/><meta name="music:release_date" content="2026-08-07"/>'
    expect(parseSpotifyPage(html)).toEqual({ title: 'Alive', artist: 'SERGIO DO CARMO', date: '2026-08-07', art: 'https://i.scdn.co/image/abc' })
  })
  it('decodes HTML entities', () => {
    const html = '<meta property="og:title" content="Rock &amp; Roll"/><meta property="og:description" content="A &amp; B · Rock · Song · 2025"/>'
    expect(parseSpotifyPage(html)).toMatchObject({ title: 'Rock & Roll', artist: 'A & B' })
  })
})
