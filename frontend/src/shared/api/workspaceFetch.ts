interface WorkspaceCsrf {
  headerName: string
  token: string
}
let pendingCsrf: Promise<WorkspaceCsrf> | null = null
/** Share only concurrent token requests; never cache across a completed request or login change. */
function workspaceCsrf(): Promise<WorkspaceCsrf> {
  if (pendingCsrf) return pendingCsrf
  pendingCsrf = (async () => {
    const response = await fetch('/api/v1/workspace-auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
    if (!response.ok)
      throw new Error(
        'Unable to obtain workspace request protection. Sign in again.',
      )
    const data: unknown = await response.json()
    if (
      typeof data !== 'object' ||
      data === null ||
      !('headerName' in data) ||
      !('token' in data) ||
      typeof data.headerName !== 'string' ||
      typeof data.token !== 'string'
    )
      throw new Error('Invalid CSRF response.')
    return { headerName: data.headerName, token: data.token }
  })().finally(() => {
    pendingCsrf = null
  })
  return pendingCsrf
}

export async function workspaceFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.delete('X-User-Role')
  headers.delete('X-User-Id')
  const method = (init.method ?? 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const data = await workspaceCsrf()
    headers.set(data.headerName, data.token)
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
}
