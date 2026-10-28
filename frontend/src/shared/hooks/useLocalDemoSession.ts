import { useRef } from 'react'

const demoPersonas = ['ld', 'employee-a', 'employee-b', 'employee-c', 'admin', 'expert-chen', 'expert-vance', 'expert-rivera', 'expert-nguyen'] as const
export function useLocalDemoSession() {
  const enabled = import.meta.env.VITE_LOCAL_BASELINE_DEMO_ENABLED === 'true'
  const switching = useRef(false)
  async function establish(persona: string): Promise<boolean> {
    if (!enabled || switching.current || !demoPersonas.some(value => value === persona)) return false
    switching.current = true
    try {
      const response = await fetch('/api/v1/local-baseline-demo/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona }) })
      return response.ok
    } catch { return false }
    finally { switching.current = false }
  }
  async function choose(persona: string, destination: string): Promise<boolean> {
    if (!await establish(persona)) return false
    window.location.assign(destination)
    return true
  }
  async function signOut(): Promise<boolean> {
    if (!enabled) return true
    try { return (await fetch('/api/v1/local-baseline-demo/session', { method: 'DELETE', credentials: 'same-origin' })).ok }
    catch { return false }
  }
  return { enabled, establish, choose, signOut }
}
