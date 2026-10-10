# Ricey site redesign: orthearc structure, Years world

Date: 2026-10-10
Status: approved in brainstorming

## Goal

Rebuild riceymusic.com with the layout and credits treatment of orthearc.com ("The Arc"),
carried out in Ricey's own visual world instead of orthearc's space theme. Add a private
admin panel for adding credits, with cover art pulled automatically.

## Reference: what we take from orthearc

- Full-screen cinematic hero: large wordmark, spaced-caps tagline, one pill Contact button.
- Edge-to-edge, gapless grid of square release covers ("Selected discography").
- "All credits" pill under the grid, then a "Hear the difference" call to action that links
  to a Before / After page.
- Separate pages instead of one long scroll.
- Small-caps nav links, outlined Contact pill top right.
- Covers carry the colour; the chrome stays near-monochrome.

What we do not take: the starfield, planet arc, navy palette and thin sans wordmark.

## Visual world ("Years")

- Background near-black. One accent: the deep red of the Years cover (`public/images/years.jpg`).
- Bodoni Moda for wordmark and headings; Inter for small text and UI.
- Hero background: a slow red glow or texture in place of orthearc's planet arc. The exact
  treatment is chosen in the prototype step.
- Keep the existing motion layer where it fits: Lenis smooth scroll, reveals, loader.

## Pages

| Route | Content |
|---|---|
| `/` | Hero (RICEY, "Artist · Producer · Mixing · Mastering", Contact pill). Selected credits grid. All credits pill. Hear the difference pill. |
| `/credits` | All releases in the grid. Merged versions show "2 versions". |
| `/artist` | Years release, YearsPlayer, Support (Chris Avantgarde clip), On rotation playlist. |
| `/before-after` | Track 1 and Track 2 from `public/audio/`, A/B toggle between Before and After. |
| `/services` | Mastering £50 / track, Stem Mastering £50 + £10 / stem, the labels credits line. |
| `/about` | Carried over from the current site. |
| `/contact` | Email and socials from `src/content.ts`. |
| `/admin` | Credits admin. Not linked anywhere, `noindex`. |

Grid tile: square cover, no gap. On hover (or tap on touch): title, artist, roles, year.
Tile links to the release when a link is known.

## Credits data

Seed: `docs/superpowers/specs/credits-seed.json`, 20 releases transcribed from Muso, in
Muso popularity order. Excluded by request: Apocalypse, CAN'T STOP, Last Dance, PLAY ROUGH,
Feel. Versions are merged into one entry with a `versions` list.

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
- Missing cover: tile shows title and artist on a dark red field.

## Testing and verification

- Typecheck, lint and build pass.
- Worker: unit tests for token signing and expiry, auth guard, login rate limit and lookup parsing.
- Browser check of every page at 1440 and 390 widths; deep-link reload on GitHub Pages.

## Build order

1. Prototype the homepage: Current plus Years-world variants; user picks one.
2. Build the chosen design across all pages, with the seed credits.
3. Worker and admin.
4. Verify on desktop and phone, then deploy.

## Prerequisites from the user

- Free Cloudflare account, `wrangler login`, then `wrangler secret put` for the three secrets.
