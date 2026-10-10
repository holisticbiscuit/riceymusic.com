# Ricey Scarf Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild riceymusic.com as a multi-page site (hero-only homepage, scarf-blue inner pages, gapless credits grid) plus a Cloudflare Worker admin for credits.

**Architecture:** The Vite + React SPA gets React Router with one component per page under `src/pages/`, sharing a layout (nav, footer) and a `PageShell` (deep-scarf background, glow, title). Credits come from a Worker API (`worker/`, KV storage, HMAC tokens), falling back to a bundled seed. GitHub Pages serves deep links through a `404.html` copy of the app.

**Tech Stack:** React 19, Vite 8, Tailwind v4, React Router 7, Vitest, Cloudflare Workers + KV + Wrangler.

**Spec:** `docs/superpowers/specs/2026-10-10-orthearc-redesign-design.md`
**Visual reference (git-ignored prototype):** `.prototypes/aed9204d/src/protos/home/J.tsx`, `home/parts.tsx`, `credits/B.tsx`, `src/theme.css`

---

## File map

Site (`src/`):

| File | Responsibility |
|---|---|
| `main.tsx` | Fonts, CSS, router mount |
| `App.tsx` | Route table + `Layout` (nav, outlet, footer, scroll reset) |
| `content.ts` | Copy (existing; RELEASE.art etc. unchanged) |
| `data/credits.json` | Bundled seed (moved from docs) |
| `lib/credits.ts` | `Credit` type, `sortCredits`, `sortRoles`, `useCredits` (API + fallback) |
| `lib/credits.test.ts` | Unit tests for sorting/normalising |
| `lib/api.ts` | `API_URL`, `apiFetch` with bearer token |
| `components/Nav.tsx` | Top nav, phone menu |
| `components/Footer.tsx` | Footer (hidden on home) |
| `components/Pill.tsx` | Pill link/button |
| `components/PageShell.tsx` | Deep-scarf page frame with glow + eyebrow + title |
| `components/CreditTile.tsx` | Square cover tile with hover/tap info |
| `pages/Home.tsx` … `pages/Contact.tsx`, `pages/Admin.tsx`, `pages/NotFound.tsx` | One page each |
| `index.css` | Tokens: scarf colours replace ember |

Removed: `components/SceneBackdrop.tsx`, `Spotlight.tsx`, `ReactiveWordmark.tsx`, `GlareCard.tsx`, `MaskText.tsx`, `Loader.tsx`, `Cursor.tsx`, `PlayTheRecord.tsx`, `App.css`, `lib/useLenis.ts` (and the `lenis` dependency). Kept: `AudioPlayer.tsx`, `YearsPlayer.tsx`, `Magnetic.tsx`, `lib/audioBus.ts`, `lib/recordPlayer.ts`, `lib/utils.ts`.

Worker (`worker/`, own `package.json`):

| File | Responsibility |
|---|---|
| `wrangler.toml` | Name, KV binding, vars |
| `src/index.ts` | Request routing, CORS |
| `src/auth.ts` | Constant-time compare, HMAC token sign/verify |
| `src/lookup.ts` | Parse Spotify / Apple links, fetch metadata |
| `src/credits.ts` | Validate credit input, KV read/write |
| `src/*.test.ts` | Vitest unit tests |

Build: `scripts/spa-404.mjs` copies `dist/index.html` to `dist/404.html`.

---

## Chunk 1: Foundation

### Task 1: Dependencies, tokens and the bundled seed

**Files:**
- Modify: `package.json`, `src/index.css`
- Move: `docs/superpowers/specs/credits-seed.json` → `src/data/credits.json`
- Modify: `docs/superpowers/specs/2026-10-10-orthearc-redesign-design.md` (seed path)

- [ ] **Step 1: Install and remove packages**

```bash
npm i react-router@7
npm i -D vitest@3
npm uninstall lenis
```

- [ ] **Step 2: Add the test script** to `package.json` `scripts`: `"test": "vitest run"`, and scope root tests to the site in `vite.config.ts` (the worker runs its own):

```ts
/// <reference types="vitest/config" />
// inside defineConfig({...}):
  test: { include: ['src/**/*.test.ts'] },
```

- [ ] **Step 3: Move the seed**

```bash
mkdir -p src/data && git mv docs/superpowers/specs/credits-seed.json src/data/credits.json
```

In the spec, replace `docs/superpowers/specs/credits-seed.json` with `src/data/credits.json`.

- [ ] **Step 4: Swap tokens in `src/index.css`**

Replace the `--color-ember` line in `@theme` with:

```css
  /* Scarf blue, measured from public/images/portrait.webp */
  --color-scarf: #01289a;      /* lit folds */
  --color-scarf-deep: #020933; /* shadow: inner page background */
  --color-scarf-lift: #0b4de8; /* rim light */
  --color-scarf-text: #5b86ff; /* small accent text on dark */
```

Change `--color-base` to `#000000` (the hero photo's backdrop is pure black) and `theme-color` in `index.html` to `#000000`. Delete the now-unused CSS blocks: `spotlight`, `aurora`, `ricey-glow`, `.animate-spotlight`, `kenburns`, `breathe`, `ember-drift`, `.audio-bloom`, cursor styles, `.mask-line`, and their reduced-motion entries. Keep `.grain` (change `position: fixed` stays), `.vol-range`, `.eyebrow`, focus and scrollbar styles.

- [ ] **Step 5: Replace remaining ember references**

Run: `grep -rn "ember" src` and change each `var(--color-ember)` / `bg-[var(--color-ember)]` to the scarf-lift equivalent. Expected after: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Swap to scarf tokens, add router and vitest, move credits seed"
```

### Task 2: Credits library (TDD)

**Files:**
- Create: `src/lib/credits.ts`, `src/lib/credits.test.ts`

- [ ] **Step 1: Write the failing tests** in `src/lib/credits.test.ts`:

```ts
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
    const out = normalizeCredits([c('Ok', '2025-01-01'), { ...c('', '2025-01-01') }, { ...c('No date', '') }])
    expect(out.map(x => x.title)).toEqual(['Ok'])
  })
  it('fills a missing id from artist and title', () => {
    const out = normalizeCredits([{ ...c('Years', '2026-06-05'), id: '', artist: 'Ricey' }])
    expect(out[0].id).toBe('ricey-years')
  })
})

describe('sortRoles', () => {
  it('puts mixing and mastering before production roles', () => {
    expect(sortRoles(['Composer', 'Mastering', 'Producer', 'Mixing'])).toEqual(['Mixing', 'Mastering', 'Producer', 'Composer'])
  })
})
```

- [ ] **Step 2: Run:** `npm test` — Expected: FAIL, cannot find module `./credits`.

- [ ] **Step 3: Implement `src/lib/credits.ts`:**

```ts
import { useEffect, useState } from 'react'
import seed from '../data/credits.json'
import { API_URL } from './api'

export type Role = 'Composer' | 'Producer' | 'Lyricist' | 'Mixing' | 'Mastering'
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

// Live list from the API; the bundled seed renders first and stays if the API is unreachable.
export function useCredits() {
  const [credits, setCredits] = useState<Credit[]>(SEED)
  useEffect(() => {
    if (!API_URL) return
    const ctl = new AbortController()
    fetch(`${API_URL}/credits`, { signal: ctl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((list: Credit[]) => { if (Array.isArray(list) && list.length) setCredits(normalizeCredits(list)) })
      .catch(() => {})
    return () => ctl.abort()
  }, [])
  return credits
}
```

And `src/lib/api.ts`:

```ts
// Worker base URL, set in .env.production once the Worker is deployed. Empty means seed only.
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const TOKEN_KEY = 'ricey-admin-token'
export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => {
  try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const r = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (r.status === 401) setToken(null)
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `Request failed (${r.status})`)
  return r.json() as Promise<T>
}
```

- [ ] **Step 4: Run:** `npm test` — Expected: 4 passed.

- [ ] **Step 5: Commit:** `git add src/lib && git commit -m "Add credits library with seed fallback"`

### Task 3: Router, layout and SPA fallback

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx` (full rewrite), `package.json` (`build`)
- Create: `scripts/spa-404.mjs`, `src/pages/NotFound.tsx`
- Delete: the removed components listed in the file map, `src/App.css`, `src/lib/useLenis.ts`

- [ ] **Step 1: `scripts/spa-404.mjs`**

```js
// GitHub Pages serves 404.html for unknown paths; a copy of the app makes deep links work.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
```

`package.json`: `"build": "tsc -b && vite build && node scripts/spa-404.mjs"`.

- [ ] **Step 2: `src/main.tsx`** — keep the font imports and `./index.css`; render inside `<BrowserRouter>` from `react-router`.

- [ ] **Step 3: Rewrite `src/App.tsx`:**

```tsx
import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import Home from './pages/Home'
import Credits from './pages/Credits'
import Artist from './pages/Artist'
import BeforeAfter from './pages/BeforeAfter'
import Services from './pages/Services'
import About from './pages/About'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const home = pathname === '/'
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[200] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-base">Skip to content</a>
      <Nav />
      <main id="main"><Outlet /></main>
      {!home && <Footer />}
      <div className="grain" aria-hidden />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="credits" element={<Credits />} />
        <Route path="artist" element={<Artist />} />
        <Route path="before-after" element={<BeforeAfter />} />
        <Route path="services" element={<Services />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<Admin />} />
    </Routes>
  )
}
```

Each page sets `document.title` with a tiny `usePageTitle(title)` hook in `src/lib/usePageTitle.ts`:

```ts
import { useEffect } from 'react'
export function usePageTitle(title?: string) {
  useEffect(() => { document.title = title ? `${title} · RICEY` : 'RICEY · Artist, Producer, Mixing & Mastering' }, [title])
}
```

- [ ] **Step 4: Stub every page** (`export default function X() { return null }`) for the pages built in Chunk 2, so the app compiles. `NotFound.tsx` is built now (inside `PageShell`, Task 4): eyebrow "404", title "Not here", a Pill back to `/`.

- [ ] **Step 5: Delete removed files**

```bash
git rm src/components/SceneBackdrop.tsx src/components/Spotlight.tsx src/components/ReactiveWordmark.tsx src/components/GlareCard.tsx src/components/MaskText.tsx src/components/Loader.tsx src/components/Cursor.tsx src/components/PlayTheRecord.tsx src/App.css src/lib/useLenis.ts
```

- [ ] **Step 6: Verify:** `npm run build` — Expected: succeeds, `dist/404.html` exists.

- [ ] **Step 7: Commit:** `git add -A && git commit -m "Add router, layout and GitHub Pages deep-link fallback"`

### Task 4: Shared components

**Files:** Create `src/components/Pill.tsx`, `Nav.tsx`, `Footer.tsx`, `PageShell.tsx`, `CreditTile.tsx`

Port from the prototype's `home/parts.tsx`, with real routing:

- [ ] **Step 1: `Pill.tsx`** — `Pill({ to?, href?, solid?, children, className })`. `to` renders a router `<Link>`, `href` an `<a target="_blank" rel="noopener">` (or plain for `mailto:`). Classes as in the prototype: `inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em]`; solid `bg-ink text-base hover:bg-white`; outline `border border-white/25 text-ink hover:border-white/70 hover:bg-white/[0.06]`.

- [ ] **Step 2: `Nav.tsx`** — absolute top bar, `RICEY` wordmark `Link` to `/`; desktop links via `NavLink` (Credits `/credits`, Artist `/artist`, Before / After `/before-after`, Services `/services`, About `/about`), active link `text-ink`, others `text-white/60`; outlined Contact Pill to `/contact`. Phone: menu button (`aria-expanded`, 44px target) opening the full-width list; closes on route change (`useEffect` on `pathname`) and on Escape.

- [ ] **Step 3: `Footer.tsx`** — port the prototype `Footer`, using `INSTAGRAM`, `SOUNDCLOUD`, `SPOTIFY_TRACK`, `EMAIL` from `content.ts` and `© 2026 Ricey`.

- [ ] **Step 4: `PageShell.tsx`:**

```tsx
import type { ReactNode } from 'react'
import { usePageTitle } from '../lib/usePageTitle'

// Inner-page frame: the scarf's shadow blue, its lit blue glowing down behind the title.
export function PageShell({ eyebrow, title, children, wide }: { eyebrow?: string; title: string; children: ReactNode; wide?: boolean }) {
  usePageTitle(title)
  return (
    <div className="relative min-h-svh bg-scarf-deep text-ink-soft">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-scarf),transparent_75%)]" />
      <header className="relative px-5 pb-12 pt-32 text-center sm:px-8">
        {eyebrow && <p className="eyebrow text-white/55">{eyebrow}</p>}
        <h1 className="mt-5 font-display text-[clamp(3rem,9vw,7rem)] leading-none text-ink">{title}</h1>
      </header>
      <div className={wide ? 'relative' : 'relative mx-auto max-w-4xl px-5 pb-28 sm:px-8'}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 5: `CreditTile.tsx`** — port `CreditTile` from the prototype with these rules: roles via `sortRoles`, each role its own `<span>` (no dot separators) in `text-scarf-text`; second line year and, when `versions`, `N versions`; missing art renders title/artist on `bg-[radial-gradient(120%_90%_at_30%_20%,var(--color-scarf),var(--color-scarf-deep)_70%)]`; tap toggles the overlay, mouse leave hides it; when `url` is set, the overlay includes a small "Listen" link (`target="_blank"`). Export `CreditGrid({ credits })` rendering `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.

- [ ] **Step 6: Verify:** `npm run build && npm run lint` — Expected: both pass.

- [ ] **Step 7: Commit:** `git add src && git commit -m "Add nav, footer, page shell and credit tile"`

---

## Chunk 2: Pages

Each page: build it, check it in the browser preview at 1440 and 390 wide, commit. Copy comes from `src/content.ts` and the old `App.tsx` sections (in git history at `HEAD~N`, or `git show master:src/App.tsx`).

### Task 5: Home

**Files:** `src/pages/Home.tsx`

- [ ] **Step 1:** Port prototype `home/J.tsx`: `h-svh min-h-[600px] overflow-hidden bg-black`, `<img src="/images/portrait.webp" alt="Ricey" class="absolute inset-0 h-full w-full object-cover object-[58%_18%]" fetchpriority="high">`, bottom fade `h-[55%] bg-gradient-to-t from-black via-black/60`, `h1` RICEY, tagline "Artist · Producer · Mixing · Mastering", outlined Contact Pill to `/contact`. `usePageTitle()` with no title. No scroll: `body` must not overflow on this route (the section is exactly one screen; footer hidden by Layout).
- [ ] **Step 2:** Preview check: no vertical scrollbar at 1440×900 and 390×844; face fully visible; text legible.
- [ ] **Step 3:** Commit `"Home: portrait hero"`.

### Task 6: Credits

**Files:** `src/pages/Credits.tsx`

- [ ] **Step 1:** `const credits = useCredits()`; `<PageShell eyebrow={`${credits.length} releases`} title="Credits" wide><CreditGrid credits={credits} /></PageShell>`.
- [ ] **Step 2:** Preview: first tile is Alive (2026-08-07), then Make It Through, Years; 18 tiles; hover/tap shows roles without dots.
- [ ] **Step 3:** Commit `"Credits page"`.

### Task 7: Artist

**Files:** `src/pages/Artist.tsx`

- [ ] **Step 1:** `PageShell eyebrow="mau5trap · 2026" title="Years"`. Sections ported from old `App.tsx` `Years`, `Support`, `Rotation` (drop `SectionLabel`, `MaskText`, `GlareCard`, numbering; use plain `h2 font-display text-3xl` subheads "Support" and "On rotation"): cover image (rounded-none, square, max 340px), label/year/format line, blurb, `<YearsPlayer src="/audio/years-excerpt.mp3" />`, streaming links list, Chris Avantgarde YouTube clip with Watch Pill, Spotify playlist embed with Open in Spotify Pill.
- [ ] **Step 2:** Preview: player plays; embeds load lazily; phone layout stacks.
- [ ] **Step 3:** Commit `"Artist page"`.

### Task 8: Before / After, Services, About, Contact

**Files:** `src/pages/BeforeAfter.tsx`, `Services.tsx`, `About.tsx`, `Contact.tsx`

- [ ] **Step 1: Before / After** — `PageShell eyebrow="Hear the difference" title="Before / After"`, line "One track, two states. Switch while it plays.", `<AudioPlayer />`, Pill to `/services` "Mastering rates".
- [ ] **Step 2: Services** — `PageShell eyebrow="Mixing & mastering" title="Services"`: `RATES` rows (ported markup), `CREDITS` labels line, Pills to `/before-after` and `/contact`.
- [ ] **Step 3: About** — `PageShell eyebrow="London, UK" title="About"`: the two bio paragraphs from old `About`, `FACTS` grid.
- [ ] **Step 4: Contact** — `PageShell eyebrow="Get in touch" title="Contact"`: intro line, big `mailto:` email link, Instagram / SoundCloud / Spotify row.
- [ ] **Step 5:** `npm run build && npm run lint && npm test` — all pass.
- [ ] **Step 6:** Preview every route at both widths; reload on `/services` in `npm run preview` to confirm deep links (Vite preview serves SPA fallback; real check is after deploy).
- [ ] **Step 7:** Commit `"Before/After, Services, About and Contact pages"`.

---

## Chunk 3: Worker and admin

### Task 9: Worker scaffold and auth (TDD)

**Files:** Create `worker/package.json`, `worker/tsconfig.json`, `worker/wrangler.toml`, `worker/src/auth.ts`, `worker/src/auth.test.ts`. Add `worker` to root `eslint.config.js` ignores and keep root `tsconfig` `include: ["src"]`.

- [ ] **Step 1: Scaffold**

`worker/package.json`:

```json
{
  "name": "ricey-api",
  "private": true,
  "type": "module",
  "scripts": { "dev": "wrangler dev", "deploy": "wrangler deploy", "test": "vitest run" },
  "devDependencies": { "wrangler": "^4", "vitest": "^3", "@cloudflare/workers-types": "^4", "typescript": "~5.9" }
}
```

`worker/wrangler.toml`:

```toml
name = "ricey-api"
main = "src/index.ts"
compatibility_date = "2026-09-01"

[vars]
ALLOWED_ORIGINS = "https://riceymusic.com,http://localhost:5173,http://localhost:4173"

# id filled in after `wrangler kv namespace create CREDITS`
[[kv_namespaces]]
binding = "CREDITS"
id = "REPLACE_ME"
```

Secrets (set by the user, never in files): `ADMIN_USER`, `ADMIN_PASS`, `TOKEN_SECRET`.

Run: `cd worker && npm install`.

- [ ] **Step 2: Failing tests `worker/src/auth.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { safeEqual, signToken, verifyToken } from './auth'

const SECRET = 'test-secret'

describe('safeEqual', () => {
  it('matches equal strings and rejects different ones', async () => {
    expect(await safeEqual('ricey', 'ricey')).toBe(true)
    expect(await safeEqual('ricey', 'rice')).toBe(false)
    expect(await safeEqual('', 'x')).toBe(false)
  })
})

describe('tokens', () => {
  it('verifies a fresh token', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken(SECRET, t, 1000 + 59)).toBe(true)
  })
  it('rejects an expired token', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken(SECRET, t, 1000 + 61)).toBe(false)
  })
  it('rejects a token signed with another secret or tampered', async () => {
    const t = await signToken(SECRET, 1000, 60)
    expect(await verifyToken('other', t, 1001)).toBe(false)
    const [exp, sig] = t.split('.')
    expect(await verifyToken(SECRET, `${Number(exp) + 999}.${sig}`, 1001)).toBe(false)
    expect(await verifyToken(SECRET, 'garbage', 1001)).toBe(false)
  })
})
```

- [ ] **Step 3: Run** `cd worker && npm test` — Expected: FAIL (module missing).

- [ ] **Step 4: Implement `worker/src/auth.ts`:**

```ts
const enc = new TextEncoder()

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Compare HMACs of both values under a random key: equal-length digests, no early exit on content.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const k = crypto.randomUUID()
  const [x, y] = await Promise.all([hmac(k, a), hmac(k, b)])
  let diff = x.length ^ y.length
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i) // both are 43-char SHA-256 digests
  return diff === 0 && a.length > 0
}

// Token: "<expiry unix seconds>.<hmac(expiry)>"
export async function signToken(secret: string, now: number, ttl = 12 * 3600): Promise<string> {
  const exp = String(Math.floor(now) + ttl)
  return `${exp}.${await hmac(secret, exp)}`
}

export async function verifyToken(secret: string, token: string, now: number): Promise<boolean> {
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false
  return safeEqual(sig, await hmac(secret, exp))
}
```

- [ ] **Step 5: Run** `npm test` — Expected: 4 passed.
- [ ] **Step 6: Commit:** `git add worker eslint.config.js && git commit -m "Worker: scaffold and HMAC token auth"`

### Task 10: Lookup and credit validation (TDD)

**Files:** Create `worker/src/lookup.ts`, `worker/src/lookup.test.ts`, `worker/src/credits.ts`, `worker/src/credits.test.ts`

- [ ] **Step 1: Failing tests `lookup.test.ts`:**

```ts
import { describe, expect, it } from 'vitest'
import { parseLink, parseSpotifyPage } from './lookup'

describe('parseLink', () => {
  it('reads Spotify track links', () => {
    expect(parseLink('https://open.spotify.com/track/3ri0AagToCTAAQbDcNvGUJ?si=abc')).toEqual({ kind: 'spotify', id: '3ri0AagToCTAAQbDcNvGUJ' })
  })
  it('reads Apple Music song links (?i=)', () => {
    expect(parseLink('https://music.apple.com/gb/album/years-single/1896463665?i=1896463666')).toEqual({ kind: 'apple', id: '1896463666' })
  })
  it('rejects anything else', () => {
    expect(parseLink('https://example.com/track/1')).toBeNull()
    expect(parseLink('not a url')).toBeNull()
  })
})

describe('parseSpotifyPage', () => {
  it('pulls title, artist, date and cover from meta tags', () => {
    const html = `<meta property="og:title" content="Alive"/><meta property="og:description" content="SERGIO DO CARMO · Alive · Song · 2026"/><meta property="og:image" content="https://i.scdn.co/image/abc"/><meta name="music:release_date" content="2026-08-07"/>`
    expect(parseSpotifyPage(html)).toEqual({ title: 'Alive', artist: 'SERGIO DO CARMO', date: '2026-08-07', art: 'https://i.scdn.co/image/abc' })
  })
})
```

`credits.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateCredit } from './credits'

describe('validateCredit', () => {
  it('accepts a complete credit and trims fields', () => {
    const r = validateCredit({ title: ' Alive ', artist: 'SERGIO DO CARMO', roles: ['Producer'], date: '2026-08-07' })
    expect(r.ok && r.credit.title).toBe('Alive')
  })
  it('rejects unknown roles, bad dates and missing fields', () => {
    expect(validateCredit({ title: 'x', artist: 'y', roles: ['DJ'], date: '2026-08-07' }).ok).toBe(false)
    expect(validateCredit({ title: 'x', artist: 'y', roles: ['Mixing'], date: '07/08/2026' }).ok).toBe(false)
    expect(validateCredit({ artist: 'y', roles: ['Mixing'], date: '2026-08-07' }).ok).toBe(false)
  })
  it('only allows http(s) art and links', () => {
    expect(validateCredit({ title: 'x', artist: 'y', roles: ['Mixing'], date: '2026-08-07', art: 'javascript:alert(1)' }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement `lookup.ts`:**

```ts
export type Link = { kind: 'spotify' | 'apple'; id: string }
export type Found = { title: string; artist: string; date: string; art: string }

export function parseLink(raw: string): Link | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.hostname === 'open.spotify.com') {
    const m = u.pathname.match(/\/track\/([A-Za-z0-9]{22})/)
    return m ? { kind: 'spotify', id: m[1] } : null
  }
  if (u.hostname === 'music.apple.com') {
    const i = u.searchParams.get('i') ?? u.pathname.match(/\/song\/[^/]+\/(\d+)/)?.[1]
    return i && /^\d+$/.test(i) ? { kind: 'apple', id: i } : null
  }
  return null
}

const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1] ?? ''

export function parseSpotifyPage(html: string): Found {
  const desc = meta(html, 'og:description') // "ARTIST · Title · Song · 2026"
  return { title: meta(html, 'og:title'), artist: desc.split(' · ')[0] ?? '', date: meta(html, 'music:release_date'), art: meta(html, 'og:image') }
}

export async function lookup(link: Link): Promise<Found> {
  if (link.kind === 'spotify') {
    const r = await fetch(`https://open.spotify.com/track/${link.id}`, { headers: { 'user-agent': 'Mozilla/5.0' } })
    return parseSpotifyPage(await r.text())
  }
  const j = (await (await fetch(`https://itunes.apple.com/lookup?id=${link.id}&entity=song`)).json()) as { results?: any[] }
  const t = j.results?.find(x => x.wrapperType === 'track')
  if (!t) throw new Error('Not found on Apple Music')
  return { title: t.trackName, artist: t.artistName, date: String(t.releaseDate).slice(0, 10), art: String(t.artworkUrl100).replace('100x100bb', '1000x1000bb') }
}
```

`credits.ts`:

```ts
export const ROLES = ['Composer', 'Producer', 'Lyricist', 'Mixing', 'Mastering'] as const
export type Credit = { id: string; title: string; artist: string; roles: string[]; date: string; art?: string; url?: string; versions?: string[] }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const isHttp = (v: string) => /^https?:\/\//.test(v)
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function validateCredit(input: any): { ok: true; credit: Credit } | { ok: false; error: string } {
  const title = str(input?.title), artist = str(input?.artist), date = str(input?.date)
  const art = str(input?.art), url = str(input?.url)
  const roles = Array.isArray(input?.roles) ? input.roles.map(str) : []
  if (!title || !artist) return { ok: false, error: 'Title and artist are required' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Date must be yyyy-mm-dd' }
  if (!roles.length || roles.some((r: string) => !(ROLES as readonly string[]).includes(r))) return { ok: false, error: 'Pick at least one valid role' }
  if ((art && !isHttp(art)) || (url && !isHttp(url))) return { ok: false, error: 'Links must start with http(s)://' }
  const versions = Array.isArray(input?.versions) ? input.versions.map(str).filter(Boolean) : undefined
  return { ok: true, credit: { id: str(input?.id) || slug(`${artist.split(',')[0]}-${title}`), title, artist, roles, date, ...(art && { art }), ...(url && { url }), ...(versions?.length && { versions }) } }
}

export async function readCredits(kv: KVNamespace): Promise<Credit[]> {
  return ((await kv.get('credits', 'json')) as Credit[] | null) ?? []
}
export async function writeCredits(kv: KVNamespace, list: Credit[]) {
  await kv.put('credits', JSON.stringify(list))
}
```

- [ ] **Step 4: Run** `npm test` — Expected: all pass.
- [ ] **Step 5: Commit** `"Worker: link lookup and credit validation"`

### Task 11: Worker routes

**Files:** Create `worker/src/index.ts`

- [ ] **Step 1: Implement:**

```ts
import { safeEqual, signToken, verifyToken } from './auth'
import { lookup, parseLink } from './lookup'
import { readCredits, validateCredit, writeCredits } from './credits'

export interface Env { CREDITS: KVNamespace; ADMIN_USER: string; ADMIN_PASS: string; TOKEN_SECRET: string; ALLOWED_ORIGINS: string }

const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''
    const allowed = env.ALLOWED_ORIGINS.split(',').includes(origin) ? origin : ''
    const cors = { 'access-control-allow-origin': allowed, 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', vary: 'origin' }
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors, ...extra } })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(req.url)
    const now = Date.now() / 1000

    if (req.method === 'GET' && url.pathname === '/credits')
      return json(await readCredits(env.CREDITS), 200, { 'cache-control': 'public, max-age=60' })

    if (req.method === 'POST' && url.pathname === '/login') {
      const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
      const key = `fails:${ip}`
      const fails = Number((await env.CREDITS.get(key)) ?? 0)
      if (fails >= MAX_FAILS) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
      const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string }
      // Both compared every time, so timing does not reveal which one was wrong.
      const userOk = await safeEqual(String(body.username ?? ''), env.ADMIN_USER)
      const passOk = await safeEqual(String(body.password ?? ''), env.ADMIN_PASS)
      if (!(userOk && passOk)) {
        await env.CREDITS.put(key, String(fails + 1), { expirationTtl: LOCK_SECONDS })
        return json({ error: 'Wrong username or password' }, 401)
      }
      await env.CREDITS.delete(key)
      return json({ token: await signToken(env.TOKEN_SECRET, now) })
    }

    // Everything below needs a valid token.
    const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
    if (!(await verifyToken(env.TOKEN_SECRET, token, now))) return json({ error: 'Not signed in' }, 401)

    if (req.method === 'GET' && url.pathname === '/lookup') {
      const link = parseLink(url.searchParams.get('url') ?? '')
      if (!link) return json({ error: 'Paste a Spotify or Apple Music track link' }, 400)
      try { return json({ ...(await lookup(link)), url: url.searchParams.get('url') }) }
      catch (e) { return json({ error: (e as Error).message || 'Lookup failed' }, 502) }
    }

    if (url.pathname === '/credits' && (req.method === 'PUT' || req.method === 'POST')) {
      // PUT replaces the whole ordered list (save after add/edit/delete/reorder); POST appends one.
      const body = await req.json().catch(() => null)
      const items = req.method === 'PUT' ? body : [...(await readCredits(env.CREDITS)), body]
      if (!Array.isArray(items)) return json({ error: 'Expected a list' }, 400)
      const out = []
      for (const item of items) {
        const r = validateCredit(item)
        if (!r.ok) return json({ error: `${item?.title ?? 'Item'}: ${r.error}` }, 400)
        out.push(r.credit)
      }
      await writeCredits(env.CREDITS, out)
      return json(out)
    }

    return json({ error: 'Not found' }, 404)
  },
}
```

(One `PUT /credits` with the full ordered list covers edit, delete and reorder; this is simpler than per-item routes and the list is small. Spec's per-item routes are folded into it.)

- [ ] **Step 2:** `cd worker && npx tsc --noEmit -p .` — Expected: no errors. `npm test` — still passing.
- [ ] **Step 3: Local run:** create `worker/.dev.vars` (git-ignored; add `worker/.dev.vars` and `worker/node_modules` to root `.gitignore`) with throwaway local values, `npx wrangler dev`, then:
  - `curl localhost:8787/credits` → `[]`
  - `curl -X POST localhost:8787/login -d '{"username":"x","password":"y"}'` → 401
  - login with the `.dev.vars` values → `{ token }`
  - `curl "localhost:8787/lookup?url=https://open.spotify.com/track/3ri0AagToCTAAQbDcNvGUJ" -H "authorization: Bearer <token>"` → Alive / SERGIO DO CARMO / 2026-08-07
- [ ] **Step 4: Commit** `"Worker: routes, CORS and login rate limit"`

### Task 12: Admin page

**Files:** Create `src/pages/Admin.tsx` (plus `src/pages/admin/LoginForm.tsx`, `src/pages/admin/CreditEditor.tsx` if `Admin.tsx` passes ~200 lines)

- [ ] **Step 1: Behaviour**
  - Sets `<meta name="robots" content="noindex">` on mount (removes on unmount) and title "Admin".
  - No `API_URL`: shows "The admin needs the API. Set VITE_API_URL." and nothing else.
  - Signed out: username + password form → `POST /login` → `setToken`. Shows the server's error text (wrong details, rate limit).
  - Signed in: loads `GET /credits` (if empty, offers "Import the 18 built-in credits", which PUTs `SEED`). List rows: cover thumb, title, artist, date, roles; up/down buttons to reorder; Edit; Delete (confirm). "Add credit": paste link → `GET /lookup` fills title/artist/date/art/url, role checkboxes (`ROLES`), optional versions (one per line), Save. Every change PUTs the full list and re-renders from the response. Sign out clears the token. A 401 anywhere returns to the login form.
  - Styling: `PageShell`-like deep scarf, `max-w-3xl`, inputs `bg-white/[0.06] border-white/15 rounded-lg min-h-11`.
- [ ] **Step 2: Local end-to-end:** root `.env.development.local` with `VITE_API_URL=http://localhost:8787`, run worker + `npm run dev`, sign in, import seed, add Alive by link, reorder, delete, reload `/credits` and see the change.
- [ ] **Step 3:** `npm run build && npm run lint && npm test` pass.
- [ ] **Step 4: Commit** `"Admin page for credits"`

---

## Chunk 4: Verify and ship

### Task 13: Final checks

- [ ] **Step 1:** `npm run build && npm run lint && npm test && (cd worker && npm test)` — all pass.
- [ ] **Step 2:** Browser preview, every route at 1440×900 and 390×844: no horizontal scroll, nav works, phone menu opens/closes, home has no vertical scroll, credits newest first, players work. Screenshots to the user.
- [ ] **Step 3:** Update the project memory file `redesign-orthearc-direction.md` with status.

### Task 14: User steps and deploy (needs the user)

- [ ] **Step 1 (user):** `cd worker`, `npx wrangler login` (browser sign-in to their Cloudflare account).
- [ ] **Step 2:** `npx wrangler kv namespace create CREDITS` → put the printed id in `wrangler.toml`; commit.
- [ ] **Step 3 (user, typed by them):** `npx wrangler secret put ADMIN_USER`, `npx wrangler secret put ADMIN_PASS`, `npx wrangler secret put TOKEN_SECRET` (a long random string; can be generated with `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`).
- [ ] **Step 4:** `npx wrangler deploy` → note the `*.workers.dev` URL; write `VITE_API_URL=<url>` to `.env.production`; commit.
- [ ] **Step 5:** Sign in on `/admin` (local preview against the live Worker), import the seed.
- [ ] **Step 6:** With the user's go-ahead: merge `react-rebuild` into `master` and push; GitHub Actions deploys. Check `https://riceymusic.com/credits` loads directly (404.html fallback).
