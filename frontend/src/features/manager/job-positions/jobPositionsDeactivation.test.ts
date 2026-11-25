import { describe, it, expect } from 'vitest'

describe('Job Position Deactivation Logic', () => {
  const normalizeOccCode = (c?: string) =>
    (c || '').trim().toLowerCase().replace(/\.00$/, '')

  interface RoleRecord {
    code?: string
    id?: string
    name?: string
    title?: string
    status?: string
    version?: string
    familyCode?: string
    jobPositionCode?: string
  }

  function getActiveTargetRolesForPosition(
    targetOccCodeRaw: string,
    backendRoles: RoleRecord[],
    metaMap: Record<string, { jobPositionCode?: string; status?: string }> = {},
    storeRoles: RoleRecord[] = []
  ): string[] {
    const targetOccCode = normalizeOccCode(targetOccCodeRaw)
    if (!targetOccCode) return []

    const activeRoleTitles: string[] = []
    const seenLineageCodes = new Set<string>()

    for (const r of backendRoles) {
      const rawStatus = String(r.status || '').toLowerCase().trim()
      if (rawStatus === 'superseded') continue

      const rCode = String(r.code || '').trim().toUpperCase()
      const rId = String(r.id || '').trim()
      const rVersion = String(r.version || '1.0').trim()
      const rTitle = String(r.name || r.title || rCode).trim()

      const meta = metaMap[rCode] || metaMap[rId]
      const storeRole = storeRoles.find(
        (tr) =>
          tr.id === rId ||
          (tr.code?.toUpperCase() === rCode && String(tr.version || '1.0') === rVersion),
      )

      const rawFamilyCode =
        typeof r.familyCode === 'string' &&
        r.familyCode &&
        r.familyCode !== 'SOFTWARE_ENGINEERING'
          ? r.familyCode.trim()
          : undefined

      const explicitJobPositionCode =
        typeof r.jobPositionCode === 'string' && r.jobPositionCode
          ? r.jobPositionCode
          : meta?.jobPositionCode || storeRole?.jobPositionCode || rawFamilyCode

      if (!explicitJobPositionCode) {
        continue
      }

      const effectiveOccCode = normalizeOccCode(explicitJobPositionCode)

      if (effectiveOccCode === targetOccCode) {
        seenLineageCodes.add(`${rCode}::${rVersion}`)
        const isPublishedOrActive =
          rawStatus === 'published' ||
          rawStatus === 'active' ||
          meta?.status === 'published' ||
          storeRole?.status === 'published'
        if (isPublishedOrActive) {
          activeRoleTitles.push(`${rTitle} (${rCode})`)
        }
      }
    }

    for (const sr of storeRoles) {
      const srCode = String(sr.code || '').trim().toUpperCase()
      const srVersion = String(sr.version || '1.0').trim()
      if (seenLineageCodes.has(`${srCode}::${srVersion}`)) continue
      if (
        backendRoles.some(
          (br) => String(br.code || '').trim().toUpperCase() === srCode,
        )
      ) {
        continue
      }

      const meta = metaMap[srCode] || metaMap[sr.id || '']
      const explicitJobPositionCode =
        sr.jobPositionCode || meta?.jobPositionCode || sr.familyCode
      if (!explicitJobPositionCode) {
        continue
      }

      const effectiveOccCode = normalizeOccCode(explicitJobPositionCode)

      if (effectiveOccCode === targetOccCode) {
        const isPublishedOrActive =
          sr.status === 'published' ||
          meta?.status === 'published'
        if (isPublishedOrActive) {
          activeRoleTitles.push(`${sr.title} (${srCode})`)
        }
      }
    }

    return activeRoleTitles
  }

  it('allows deactivation when job position has 0 roles assigned', () => {
    const roles: RoleRecord[] = [
      { code: 'FE-01', title: 'Frontend Engineer', status: 'published', familyCode: 'FE-ENG' },
      { code: 'BE-01', title: 'Backend Engineer', status: 'published', familyCode: 'BE-ENG' },
    ]
    const activeRoles = getActiveTargetRolesForPosition('15-1251.00', roles)
    expect(activeRoles).toEqual([])
  })

  it('does not falsely attribute roles with keywords like test or qa if not assigned', () => {
    const roles: RoleRecord[] = [
      { code: 'QA-01', title: 'QA Automation Tester', status: 'published', familyCode: 'DEV' },
      { code: 'TEST-01', title: 'Testing Lead', status: 'published' },
    ]
    const activeRoles = getActiveTargetRolesForPosition('15-1251.00', roles)
    expect(activeRoles).toEqual([])
  })

  it('does not block deactivation if assigned role is draft, staged, or unpublished', () => {
    const roles: RoleRecord[] = [
      { code: 'QA-02', title: 'QA Junior Draft', status: 'draft', familyCode: '15-1251.00' },
      { code: 'QA-03', title: 'QA Staged', status: 'staged', familyCode: '15-1251.00' },
      { code: 'QA-04', title: 'QA Unpublished', status: 'unpublished', familyCode: '15-1251.00' },
    ]
    const activeRoles = getActiveTargetRolesForPosition('15-1251.00', roles)
    expect(activeRoles).toEqual([])
  })

  it('blocks deactivation only when an active published role is explicitly assigned', () => {
    const roles: RoleRecord[] = [
      { code: 'QA-PUB', title: 'Senior QA Engineer', status: 'published', familyCode: '15-1251.00' },
    ]
    const activeRoles = getActiveTargetRolesForPosition('15-1251.00', roles)
    expect(activeRoles).toEqual(['Senior QA Engineer (QA-PUB)'])
  })
})
