# Ricey site redesign: orthearc structure, scarf-blue world

Date: 2026-10-10
Status: approved in brainstorming; visual direction revised and picked in prototype

## Goal

Rebuild riceymusic.com with the layout and credits treatment of orthearc.com ("The Arc"),
carried out in Ricey's own visual world instead of orthearc's space theme. Add a private
admin panel for adding credits, with cover art pulled automatically.

## Reference: what we take from orthearc

- A homepage that is one full-screen hero: large wordmark, spaced-caps tagline, one pill
  Contact button. No scrolling on the homepage.
- Edge-to-edge, gapless grid of square release covers, on its own Credits page.
- A Before / After page ("Hear the difference").
- Separate pages for every section.
- Small-caps nav links, outlined Contact pill top right.
- Covers carry the colour; the chrome stays restrained.

What we do not take: the starfield, the planet arc, the navy palette and the thin sans wordmark.
The site must not read as a copy of orthearc.

## Visual world (decided in the prototype, 2026-10-10)

- **Hero photo:** `public/images/portrait.webp` (from `RICEY PHOTO 4.png`: studio portrait on
  black, cobalt scarf). Shown in its natural colour on black, no tint. Only a dark fade at the
  bottom so the type reads. Wordmark, tagline and Contact pill sit low, over the scarf.
- **Inner pages take the scarf's colour**, measured from the photo:
  - `--color-scarf: #01289a` (lit folds)
  - `--color-scarf-deep: #020933` (shadow): the page background
  - `--color-scarf-lift: #0b4de8` (rim light)
  - Treatment ("deep scarf"): page is scarf-deep, with a radial glow of scarf rising from the top
    behind the page title. Small accent text (roles on hover): `#5b86ff`.
- The Years red is retired as the site accent.
- Bodoni Moda for wordmark and headings; Inter for UI; JetBrains Mono for spaced-caps labels.
- Keep a light film grain. Lenis and reveals where they fit; drop the scroll-driven backdrop.

Prototype of record: `.prototypes/aed9204d` (git-ignored): `home/J` (hero) and `credits/B`
(credits page).

## Pages

| Route | Content |
|---|---|
| `/` | Hero only: portrait, RICEY, "Artist · Producer · Mixing · Mastering", Contact pill. Fits one screen, no scroll. |
| `/credits` | Page title "Credits", release count, then all releases in the gapless grid (4 / 3 / 2 across), newest release first. Hover shows roles as separate words (no dot separators), year, and "2 versions" for merged releases. |
| `/artist` | Years release, YearsPlayer, Support (Chris Avantgarde clip), On rotation playlist. |
| `/before-after` | Track 1 and Track 2 from `public/audio/`, A/B toggle between Before and After. |
| `/services` | Mastering £50 / track, Stem Mastering £50 + £10 / stem, the labels credits line. |
| `/about` | Carried over from the current site. |
| `/contact` | Email and socials from `src/content.ts`. |
| `/admin` | Credits admin. Not linked anywhere, `noindex`. |

Grid tile: square cover, no gap. On hover (or tap on touch): title, artist, roles, year.
Tile links to the release when a link is known.

## Credits data

Seed: `src/data/credits.json`, 18 releases (17 transcribed from Muso, plus
Alive by SERGIO DO CARMO added by the user), in
Muso popularity order, each with a cover in `public/images/credits/`. Excluded by request:
Apocalypse, CAN'T STOP, Last Dance, PLAY ROUGH, Feel, and all Crainaz releases. Versions are merged into one entry with a `versions` list.

Credit shape:

```ts
type Credit = {
  id: string
  title: string
  artist: string
  roles: ('Composer' | 'Producer' | 'Lyricist' | 'Mixing' | 'Mastering')[]
  date: string        // ISO yyyy-mm-dd
  art?: string        // cover URL
  url?: string        // Spotify / Apple link
  versions?: string[]
}
```

The seed ships inside the site bundle as a fallback, so the grid renders even if the API is
down. Covers for the seed are fetched once (Spotify or iTunes search) and saved into
`public/images/credits/`.

## Admin and API (Cloudflare Worker)

The site stays on GitHub Pages. A Cloudflare Worker in `worker/` provides the API, with
credits stored in Workers KV.

- `GET /credits`: public, cached.
- `POST /login`: compares username and password with Worker secrets `ADMIN_USER` and
  `ADMIN_PASS` in constant time. On success returns an HMAC-signed token (secret
  `TOKEN_SECRET`) that expires after 12 hours. Rate-limited per IP.
- `POST /credits`, `PUT /credits/:id`, `DELETE /credits/:id`, `PUT /credits/order`: need
  `Authorization: Bearer <token>`.
- `GET /lookup?url=`: takes a Spotify or Apple Music link and returns cover, title, artist
  and release date (Spotify oEmbed, iTunes lookup). Auth required.
- CORS limited to the site origin and localhost.

Credentials never appear in the repo or in the site bundle. The user sets the secrets with
`wrangler secret put`. The admin keeps the token in `sessionStorage`.

Admin UI at `/admin`: login form, then the credit list with add, edit, delete and reorder.
Add flow: paste a link, lookup fills the fields, tick roles, save.

## Routing

React Router. GitHub Pages deep links handled by copying `index.html` to `404.html` at build.

## Error handling

- API unreachable: public pages use the bundled seed; admin shows a clear error.
- Lookup fails: admin lets the user fill fields and paste a cover URL by hand.
- Missing cover: tile shows title and artist on a scarf-blue field.

## Testing and verification

- Typecheck, lint and build pass.
- Worker: unit tests for token signing and expiry, auth guard, login rate limit and lookup parsing.
- Browser check of every page at 1440 and 390 widths; deep-link reload on GitHub Pages.

## Build order

1. Prototype the homepage and credits page (done: home/J, credits/B).
2. Build the chosen design across all pages, with the seed credits.
3. Worker and admin.
4. Verify on desktop and phone, then deploy.

## Prerequisites from the user

- Free Cloudflare account, `wrangler login`, then `wrangler secret put` for the three secrets.
