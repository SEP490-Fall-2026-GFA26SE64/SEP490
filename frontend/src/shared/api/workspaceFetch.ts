export async function workspaceFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.delete('X-User-Role')
  headers.delete('X-User-Id')
  const method = (init.method ?? 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const response = await fetch('/api/v1/workspace-auth/csrf', { credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) throw new Error('Unable to obtain workspace request protection. Sign in again.')
    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null || !('headerName' in data) || !('token' in data)
      || typeof data.headerName !== 'string' || typeof data.token !== 'string') throw new Error('Invalid CSRF response.')
    headers.set(data.headerName, data.token)
  }
  return fetch(input, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
}
