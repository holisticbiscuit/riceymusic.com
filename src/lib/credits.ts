import { useEffect, useState } from 'react'
import seed from '../data/credits.json'
import { API_URL } from './api'

export type Role = 'Mixing' | 'Mastering' | 'Producer' | 'Composer' | 'Lyricist'

export type Credit = {
  id: string
  title: string
  artist: string
  roles: string[]
  date: string // yyyy-mm-dd
  art?: string
  url?: string
  versions?: string[]
}

export const ROLES: Role[] = ['Mixing', 'Mastering', 'Producer', 'Composer', 'Lyricist']

// Mixing and mastering lead: this grid is the engineering portfolio.
export const sortRoles = (roles: string[]) =>
  [...roles].sort((a, b) => ROLES.indexOf(a as Role) - ROLES.indexOf(b as Role))

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Valid entries only, each with an id, newest release first.
export function normalizeCredits(list: Credit[]): Credit[] {
  return list
    .filter(c => c && c.title && c.artist && c.date)
    .map(c => ({ ...c, id: c.id || slug(`${c.artist.split(',')[0]}-${c.title}`) }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const SEED: Credit[] = normalizeCredits(seed.credits as Credit[])

// Live list from the API. The bundled seed renders first and stays if the API is unreachable.
export function useCredits() {
  const [credits, setCredits] = useState<Credit[]>(SEED)
  useEffect(() => {
    if (!API_URL) return
    const ctl = new AbortController()
    fetch(`${API_URL}/credits`, { signal: ctl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((list: Credit[]) => {
        if (Array.isArray(list) && list.length) setCredits(normalizeCredits(list))
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [])
  return credits
}
