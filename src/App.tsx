import { Suspense, lazy, useEffect } from 'react'
import { MotionConfig } from 'motion/react'
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
import NotFound from './pages/NotFound'

// The admin (and its MP3 encoder) loads only when someone opens /admin.
const Admin = lazy(() => import('./pages/Admin'))

function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const home = pathname === '/'
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[200] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-base"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
      {!home && <Footer />}
      <div className="grain" aria-hidden />
    </>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
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
        <Route path="admin" element={<Suspense fallback={<div className="min-h-svh bg-scarf-deep" />}><Admin /></Suspense>} />
      </Routes>
    </MotionConfig>
  )
}
