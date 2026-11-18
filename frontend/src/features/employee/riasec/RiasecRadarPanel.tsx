import type { Recommendation, Scores } from './riasecApi'
import { RiasecScoreRadar } from './RiasecScoreRadar'

export function RiasecRadarPanel({ scores, comparison }: { scores: Scores; comparison?: Recommendation['position'] }) {
  return <section aria-label="RIASEC" className="min-w-0 p-3">
    <RiasecScoreRadar scores={scores} comparison={comparison} />
  </section>
}
