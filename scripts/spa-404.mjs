// GitHub Pages serves 404.html for unknown paths; a copy of the app makes deep links work.
// Each real page also gets its own copy (dist/<page>.html, which Pages serves at /<page>), so
// it loads with a 200
// rather than a 404 and search engines list it. Keep in step with the routes in src/App.tsx.
import { copyFileSync } from 'node:fs'

const PAGES = ['credits', 'artist', 'before-after', 'services', 'about', 'contact', 'admin']

copyFileSync('dist/index.html', 'dist/404.html')
for (const page of PAGES) {
  mkdirSync(`dist/${page}`, { recursive: true })
  copyFileSync('dist/index.html', `dist/${page}/index.html`)
}
