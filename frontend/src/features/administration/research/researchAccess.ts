/** Uses the existing portal login context; the local API bridge is not production identity. */
export function researchIdentity() {
  const userId = localStorage.getItem('auth_user')?.trim()
  return userId && localStorage.getItem('active_actor') === 'admin' ? { userId } : null
}
