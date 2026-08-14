import { useEffect } from 'react'
import Lenis from 'lenis'
import { tick as audioTick } from './audioBus'

// Buttery momentum scrolling — the backbone of the "flowy" feel.
// Drives the page via real scroll, so motion's useScroll stays in sync.
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    })

    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    // Scroll velocity, smoothed, published as a CSS variable. Lets the page
    // react to how fast you scroll, not only where you are.
    const root = document.documentElement
    let vel = 0
    let lastY = window.scrollY
    let lastT = performance.now()

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)

      const dt = Math.max(1, time - lastT)
      const y = window.scrollY
      // px per ms, normalised against a brisk flick, then eased.
      const raw = Math.min(1, Math.abs(y - lastY) / dt / 3.2)
      vel += (raw - vel) * (raw > vel ? 0.28 : 0.06)
      lastY = y
      lastT = time
      root.style.setProperty('--scroll-v', vel.toFixed(3))

      audioTick()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // Anchor links → smooth Lenis scroll instead of native jump.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!a) return
      const id = a.getAttribute('href')!.slice(1)
      const el = id ? document.getElementById(id) : null
      if (!el) return
      e.preventDefault()
      lenis.scrollTo(el, { offset: -10 })
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('click', onClick)
      lenis.destroy()
      delete (window as unknown as { __lenis?: Lenis }).__lenis
    }
  }, [])
}
