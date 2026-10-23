import { useRef } from 'react'

const demoPersonas = ['ld', 'employee-a', 'employee-b', 'employee-c', 'admin'] as const
export function useLocalDemoSession() {
  const enabled = import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED === 'true'
  const switching = useRef(false)
  async function choose(persona: string, destination: string): Promise<boolean> {
    if (!enabled || switching.current || !demoPersonas.some(value => value === persona)) return false
    switching.current = true
    try {
      const response = await fetch('/api/v1/local-baseline-demo/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona }) })
      if (!response.ok) throw Error('Unavailable')
      window.location.assign(destination)
      return true
    } catch { switching.current = false; return false }
  }
  return { enabled, choose }
}
