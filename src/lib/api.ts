// Worker base URL, set in .env.production once the Worker is deployed. Empty means seed only.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const TOKEN_KEY = 'ricey-admin-token'

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export const setToken = (t: string | null) => {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* private mode: the session simply isn't remembered */ }
}

export class AuthError extends Error {}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const r = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const body = await r.json().catch(() => null)
  if (r.status === 401) {
    setToken(null)
    throw new AuthError(body?.error ?? 'Not signed in')
  }
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`)
  return body as T
}
