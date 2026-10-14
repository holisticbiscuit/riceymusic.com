// Enquiries from the Contact page. Each one is stored (the admin's Inbox) and, when email is
// set up, sent on to Ricey with Reply-To set to the sender.
export const SERVICES = ['Mastering', 'Stem mastering', 'Mixing & mastering'] as const

export type Enquiry = {
  id: string
  at: string // ISO time received
  name: string
  email: string
  track: string
  service: string
  link: string
  note: string
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export function validateEnquiry(input: unknown): { ok: true; enquiry: Omit<Enquiry, 'id' | 'at'> } | { ok: false; error: string } {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const name = str(o.name, 100)
  const email = str(o.email, 200)
  const track = str(o.track, 200)
  const service = str(o.service, 40)
  const link = str(o.link, 500)
  const note = str(o.note, 3000)
  if (!name) return { ok: false, error: 'Add your name' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Add an email address I can reply to' }
  if (!track) return { ok: false, error: 'Add the track title' }
  if (!(SERVICES as readonly string[]).includes(service)) return { ok: false, error: 'Pick a service' }
  if (!/^https?:\/\/\S+$/.test(link)) return { ok: false, error: 'The link to your files should start with https://' }
  return { ok: true, enquiry: { name, email, track, service, link, note } }
}

// The email Ricey receives. Plain text, so it reads the same in every mail app.
export function enquiryText(e: Omit<Enquiry, 'id'>) {
  return [
    `${e.name} sent a track through riceymusic.com.`,
    '',
    `Track:   ${e.track}`,
    `Service: ${e.service}`,
    `Files:   ${e.link}`,
    `Email:   ${e.email}`,
    ...(e.note ? ['', e.note] : []),
    '',
    'Reply to this email to answer them.',
  ].join('\n')
}

// A minimal RFC 5322 message for Cloudflare's send_email binding.
export function mimeMessage({ from, to, replyTo, subject, text }: { from: string; to: string; replyTo: string; subject: string; text: string }) {
  // Header values: no line breaks (header injection), non-ASCII encoded.
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ')
  const encode = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`)
  const body = btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/.{76}/g, '$&\r\n')
  return [
    `From: RICEY website <${clean(from)}>`,
    `To: ${clean(to)}`,
    `Reply-To: ${clean(replyTo)}`,
    `Subject: ${encode(clean(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${clean(from).split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n')
}
