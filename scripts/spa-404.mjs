// GitHub Pages serves 404.html for unknown paths; a copy of the app makes deep links work.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
