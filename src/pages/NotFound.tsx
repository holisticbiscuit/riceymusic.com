import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="Not here">
      <div className="text-center">
        <Pill to="/">Back home</Pill>
      </div>
    </PageShell>
  )
}
