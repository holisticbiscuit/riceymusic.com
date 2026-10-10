import { PageShell } from '../components/PageShell'
import { CreditGrid } from '../components/CreditTile'
import { useCredits } from '../lib/credits'

export default function Credits() {
  const credits = useCredits()
  return (
    <PageShell eyebrow={`${credits.length} releases`} title="Credits" wide>
      <CreditGrid credits={credits} />
    </PageShell>
  )
}
