import { useRef } from 'react'

const demoPersonas = ['ld', 'employee-a', 'admin', 'expert'] as const
export type LocalDemoPersona = typeof demoPersonas[number]
export function useLocalDemoSession() {
  const enabled = import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED === 'true'
  const switching = useRef(false)
  async function establish(persona: string): Promise<boolean> {
    if (!enabled || switching.current || !demoPersonas.some(value => value === persona)) return false
    switching.current = true
    try {
      if (persona === 'expert') {
        const session = await fetch('/api/v1/local-baseline-demo/session', { credentials: 'same-origin', cache: 'no-store' })
        if (!session.ok) return false
        const value: unknown = await session.json()
        if (!value || typeof value !== 'object' || !('personas' in value) || !Array.isArray(value.personas) || !value.personas.includes('expert')) return false
      }
      const response = await fetch('/api/v1/local-baseline-demo/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona }) })
      if (response.ok) window.dispatchEvent(new Event('initial_pathway_session_changed'))
      return response.ok
    } catch { return false }
    finally { switching.current = false }
  }
  async function choose(persona: string, destination: string): Promise<boolean> {
    if (!await establish(persona)) return false
    window.location.assign(destination)
    return true
  }
  return { enabled, establish, choose }
}
