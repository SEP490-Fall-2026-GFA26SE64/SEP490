
export const extractCleanRoleCode = (raw?: string | null): string => {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  return trimmed.split('#')[0].trim() || trimmed
}

