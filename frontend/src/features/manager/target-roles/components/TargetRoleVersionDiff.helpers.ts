
export function compareRoleVersions(vA: string = '1.0', vB: string = '1.0'): number {
  const partsA = vA.split('.').map((p) => parseInt(p, 10) || 0)
  const partsB = vB.split('.').map((p) => parseInt(p, 10) || 0)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const a = partsA[i] || 0
    const b = partsB[i] || 0
    if (a !== b) return a - b
  }
  return 0
}

