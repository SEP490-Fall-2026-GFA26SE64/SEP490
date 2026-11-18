
export function cleanJobPositionTitle(title?: string | null): string {
  if (!title) return ''
  return title.replace(/^[0-9A-Za-z.-]+\s*-\s*/, '').trim()
}

export function extractJobPositionCode(raw?: string | null): string {
  if (!raw) return ''
  const match = raw.match(/^([0-9A-Za-z.-]+)\s*-\s*/)
  return match ? match[1].trim() : ''
}

