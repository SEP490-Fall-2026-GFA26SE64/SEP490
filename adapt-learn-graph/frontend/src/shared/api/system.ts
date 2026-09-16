export interface SystemStatus {
  application: string
  version: string
  stage: string
}

export async function getSystemStatus(signal: AbortSignal): Promise<SystemStatus> {
  const response = await fetch('/api/v1/system/status', { signal, credentials: 'same-origin' })
  if (!response.ok) throw new Error(`Status request failed (${response.status})`)
  const payload: unknown = await response.json()
  if (
    typeof payload !== 'object' || payload === null ||
    !('application' in payload) || typeof payload.application !== 'string' ||
    !('version' in payload) || typeof payload.version !== 'string' ||
    !('stage' in payload) || typeof payload.stage !== 'string'
  ) throw new Error('Invalid status response')
  return { application: payload.application, version: payload.version, stage: payload.stage }
}