export interface DemoResetResult {
  organizationsRemoved: number
  accountsRemoved: number
  registrationsRemoved: number
  relatedRowsRemoved: number
  graphNodesRemoved: number
  filesRemoved: number
  organizationsRetained: number
  warnings: string[]
  checkpoint?: string | null
  continueUrl?: string | null
}

export async function resetDemoData(commandKey: string): Promise<DemoResetResult> {
  const response = await fetch('/api/v1/demo/reset', { method: 'POST', headers: { 'Idempotency-Key': commandKey }, credentials: 'omit', cache: 'no-store' })
  if (!response.ok) throw new Error(`Reset failed (HTTP ${response.status})`)
  return response.json() as Promise<DemoResetResult>
}
