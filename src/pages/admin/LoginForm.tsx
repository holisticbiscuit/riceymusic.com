import { useState, type FormEvent } from 'react'
import { apiFetch, setToken } from '../../lib/api'
import { Pill } from '../../components/Pill'
import { Field, inputCls } from './ui'

export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token } = await apiFetch<{ token: string }>('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      setToken(token)
      setPassword('')
      onSignedIn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-5">
      <Field label="Username">
        <input className={inputCls} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
      </Field>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Pill type="submit" solid disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Pill>
    </form>
  )
}
