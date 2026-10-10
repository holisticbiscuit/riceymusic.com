import { Pill } from '../components/Pill'
import { usePageTitle } from '../lib/usePageTitle'

// The homepage is the hero and nothing else: portrait in its own colour on black,
// wordmark low over the scarf. Everything else lives on its own page.
export default function Home() {
  usePageTitle()
  return (
    <section className="relative h-svh min-h-[560px] overflow-hidden bg-black">
      <img
        src="/images/portrait.webp"
        alt="Ricey"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[58%_18%] md:left-1/2 md:aspect-square md:w-auto md:max-w-none md:-translate-x-1/2 md:[mask-image:linear-gradient(to_right,transparent,#000_18%,#000_82%,transparent)]"
      />
      {/* On wide screens the whole square photo shows at full height; its black backdrop
          and faded sides melt into the page instead of the crop zooming in on the face. */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-[12svh] text-center sm:pb-[9svh]">
        <h1 className="font-display text-[clamp(3.5rem,13vw,10rem)] leading-[0.9] tracking-[0.08em] text-ink">RICEY</h1>
        <p className="mt-5 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-white/65 sm:text-[0.72rem] sm:tracking-[0.42em]">
          Artist · Producer · Mixing · Mastering
        </p>
        <Pill to="/contact" className="mt-8">Contact</Pill>
      </div>
    </section>
  )
}
