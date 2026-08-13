import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts: no request to Google, so no visitor IP leaves the site,
// and no render-blocking stylesheet. Bodoni carries its optical-size axis so
// the display wordmark uses the true high-contrast hairline design.
import '@fontsource-variable/bodoni-moda/opsz.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
