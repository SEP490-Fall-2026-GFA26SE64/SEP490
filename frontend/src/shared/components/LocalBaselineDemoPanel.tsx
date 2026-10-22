import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Text } from './typography/Text'
import { useTranslation } from '../i18n/LanguageContext'

const personas = ['ld', 'employee-a', 'employee-b', 'employee-c', 'admin'] as const
export function LocalBaselineDemoPanel() {
  const { language } = useTranslation(), vi = language === 'vi'
  const [selected, setSelected] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(false)
  useEffect(() => {
    if (import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true') return
    const abort = new AbortController()
    void fetch('/api/v1/local-baseline-demo/session', { signal: abort.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error('Unavailable')
      const data: { persona?: unknown } = await response.json()
      if (typeof data.persona !== 'string' || !personas.some(value => value === data.persona)) throw Error('Invalid session')
      setSelected(data.persona)
    }).catch(() => { if (!abort.signal.aborted) setError(true) })
    return () => abort.abort()
  }, [])
  if (import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED !== 'true') return null
  async function choose(persona: string) {
    setBusy(true); setError(false)
    try {
      const response = await fetch('/api/v1/local-baseline-demo/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona }) })
      if (!response.ok) throw Error('Unavailable')
      window.location.assign(persona.startsWith('employee') ? '/employee/baseline-assessment' : '/ld-manager/baseline-assessments')
    } catch { setError(true); setBusy(false) }
  }
  return <aside aria-label="Baseline demo" className="mb-4 space-y-2 rounded-lg border border-warning bg-card p-4">
    <Text variant="body-sm">{vi ? 'Demo local: d?ng c?u h?i ch?a duy?t v? tham s? SYNTHETIC. K?t qu? ch? ph?c v? th? lu?ng.' : 'Local demo: unreviewed questions and SYNTHETIC parameters. Results are for flow evaluation only.'}</Text>
    <div className="flex flex-wrap gap-2">{personas.map(persona => <Button key={persona} size="sm" variant={persona === selected ? 'primary' : 'outline'} aria-pressed={persona === selected} disabled={busy || !selected} onClick={() => void choose(persona)}>
      {persona === 'ld' ? 'L&D' : persona === 'admin' ? 'Admin' : `${vi ? 'Nh?n vi?n' : 'Employee'} ${persona.slice(-1).toUpperCase()}`}
    </Button>)}</div>
    {error && <Text role="alert" variant="body-sm">{vi ? 'Ch?a k?t n?i ???c phi?n demo. H?y t?i l?i trang sau khi API s?n s?ng.' : 'The demo session is unavailable. Reload once the API is ready.'}</Text>}
  </aside>
}
