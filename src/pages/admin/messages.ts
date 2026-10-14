import { useCallback, useState } from 'react'

// A track sent through the Contact page (stored by the Worker, newest first).
export type Enquiry = { id: string; at: string; name: string; email: string; track: string; service: string; link: string; note: string }

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Which messages have been opened, remembered in this browser.
const READ_KEY = 'ricey-admin-read'
const loadRead = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
export function useReadMessages() {
  const [read, setRead] = useState(loadRead)
  const markRead = useCallback((id: string) => {
    setRead(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next].slice(-500)))
      } catch {
        /* private window: forgotten on reload */
      }
      return next
    })
  }, [])
  return { isRead: (id: string) => read.has(id), markRead }
}
