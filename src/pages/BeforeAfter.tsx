import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { AudioPlayer } from '../components/AudioPlayer'

export default function BeforeAfter() {
  return (
    <PageShell eyebrow="Hear the difference" title="Before / After">
      <p className="mb-10 text-center text-[1.05rem] text-white/70">One track, two states. Switch while it plays.</p>
      <AudioPlayer />
      <div className="mt-14 flex flex-wrap justify-center gap-3">
        <Pill to="/services">Mastering rates</Pill>
        <Pill to="/contact" solid>Send a track</Pill>
      </div>
    </PageShell>
  )
}
