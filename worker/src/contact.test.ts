import { describe, expect, it } from 'vitest'
import { mimeMessage, validateEnquiry } from './contact'

const base = { name: 'Zacc', email: 'zacc@example.com', track: 'The One', service: 'Mastering', link: 'https://we.tl/t-abc', note: '' }

describe('validateEnquiry', () => {
  it('accepts a complete enquiry and trims it', () => {
    const r = validateEnquiry({ ...base, name: '  Zacc ' })
    expect(r.ok && r.enquiry.name).toBe('Zacc')
  })

  it('needs an email to reply to and a real link', () => {
    expect(validateEnquiry({ ...base, email: 'nope' }).ok).toBe(false)
    expect(validateEnquiry({ ...base, link: 'javascript:alert(1)' }).ok).toBe(false)
  })

  it('rejects unknown services', () => {
    expect(validateEnquiry({ ...base, service: 'Free stuff' }).ok).toBe(false)
  })
})

describe('mimeMessage', () => {
  it('keeps line breaks out of headers', () => {
    const raw = mimeMessage({ from: 'website@riceymusic.com', to: 'me@example.com', replyTo: 'a@b.co', subject: 'Hi\r\nBcc: victim@example.com', text: 'Hello' })
    const headers = raw.split('\r\n\r\n')[0].split('\r\n')
    expect(headers.some(h => h.startsWith('Bcc:'))).toBe(false)
    expect(headers).toContain('Reply-To: a@b.co')
  })

  it('encodes non-ASCII subjects and bodies', () => {
    const raw = mimeMessage({ from: 'website@riceymusic.com', to: 'me@example.com', replyTo: 'a@b.co', subject: 'Mixing & mastering: Café', text: 'Merci — à bientôt' })
    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?/)
    const body = raw.split('\r\n\r\n')[1].replace(/\r\n/g, '')
    expect(new TextDecoder().decode(Uint8Array.from(atob(body), c => c.charCodeAt(0)))).toBe('Merci — à bientôt')
  })
})
