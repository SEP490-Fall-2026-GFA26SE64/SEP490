import * as React from 'react'
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FolderTree,
  Plus,
  Power,
  Search,
  Upload,
  UserCheck,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import {
  QuickConfigImportModal,
  type ImportPreset,
} from '../../../shared/components/import/QuickConfigImportModal'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany, resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { getMembers, getReferences } from '../../subscription/subscriptionApi'
import { fetchDepartments, updateDepartmentApi, createDepartmentApi, linkJobPositionToDepartment } from '../../../shared/api/departmentApi'
import { loadDepartments, saveDepartments, updateDepartment } from '../../../shared/stores/departmentStore'
import {
  createJobPosition,
  updateJobPosition,
  fetchJobPositions,
} from '../../../shared/api/jobPositionApi'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { resolveJobPositionForRole } from '../data/ldManagerMockData'

export interface RiasecProfile {
  realistic: number
  investigative: number
  artistic: number
  social: number
  enterprising: number
  conventional: number
}

export interface AssignedExpert {
  id: string
  name: string
  email: string
  title: string
}

export interface JobPositionRecord {
  id: string
  code: string // Job position code, e.g. 15-1252.00
  name: string
  jobZone: number
  description: string
  status: 'active' | 'inactive'
  assignedExperts: AssignedExpert[]
  microSkillCount: number
  moduleCount: number
  interests: RiasecProfile
  createdAt: string
}

const JOB_POSITION_PRESETS: ImportPreset[] = []

const PAGE_SIZE = 8
const JOB_POSITIONS_STORAGE_PREFIX = 'adaptlearn_jobPositions_v2_'
const JOB_POSITIONS_STORAGE_PREFIX_SNAKE = 'adaptlearn_job_positions_v2_'

const getStoredJobPositions = (organizationId: string): JobPositionRecord[] | null => {
  try {
    const raw =
      localStorage.getItem(`${JOB_POSITIONS_STORAGE_PREFIX}${organizationId}`) ||
      localStorage.getItem(`${JOB_POSITIONS_STORAGE_PREFIX_SNAKE}${organizationId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const setStoredJobPositions = (organizationId: string, data: JobPositionRecord[]) => {
  try {
    const serialized = JSON.stringify(data)
    const effectiveOrg = organizationId || 'e0000000-0000-0000-0000-000000000001'
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX}${organizationId}`, serialized)
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX_SNAKE}${organizationId}`, serialized)
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX}${effectiveOrg}`, serialized)
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX_SNAKE}${effectiveOrg}`, serialized)
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX}e0000000-0000-0000-0000-000000000001`, serialized)
    localStorage.setItem(`${JOB_POSITIONS_STORAGE_PREFIX_SNAKE}e0000000-0000-0000-0000-000000000001`, serialized)
    localStorage.setItem('adaptlearn_jobPositions_v2_', serialized)
    localStorage.setItem('adaptlearn_job_positions_v2_', serialized)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('adaptlearn_job_positions_updated', {
          detail: { organizationId: effectiveOrg },
        })
      )
    }
  } catch {}
}

export function JobPositionsManagementPage() {
  const { toast } = useToast()
  const session = React.useContext(WorkspaceSessionContext)
  const activeCompany = getActiveCompany()
  const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)

  const isAdministrator = Boolean(
    session?.identity?.roles?.includes('ORGANIZATION_ADMINISTRATOR') ||
    session?.identity?.roles?.includes('PLATFORM_ADMINISTRATOR')
  )
  const isLdManager = !isAdministrator && Boolean(
    session?.identity?.roles?.includes('LD_MANAGER') ||
    (typeof window !== 'undefined' && (window.location.pathname.includes('/manager/') || window.location.pathname.includes('/ld-manager/')))
  )

  const [managerDepartment, setManagerDepartment] = React.useState<{
    id: string
    code?: string
    name: string
    jobPositionCodes: string[]
  } | null>(() => {
    try {
      const localDepts = loadDepartments(orgId)
      const activeEmail = session?.identity?.email
      if (activeEmail) {
        const assignmentRaw =
          typeof window !== 'undefined'
            ? localStorage.getItem(`alg_employee_assignment_${activeEmail.toLowerCase().trim()}`)
            : null
        if (assignmentRaw) {
          const assignment = JSON.parse(assignmentRaw)
          const matched = localDepts.find(
            (d) =>
              (assignment.departmentId &&
                (d.id === assignment.departmentId || d.code === assignment.departmentId)) ||
              (assignment.departmentName &&
                d.name?.trim().toLowerCase() === assignment.departmentName.trim().toLowerCase())
          )
          if (matched) {
            return {
              id: matched.id,
              code: matched.code,
              name: matched.name,
              jobPositionCodes: matched.linkedJobPositions || [],
            }
          }
        }
        const matchedHead = localDepts.find(
          (d) => d.headEmail?.toLowerCase() === activeEmail.toLowerCase()
        )
        if (matchedHead) {
          return {
            id: matchedHead.id,
            code: matchedHead.code,
            name: matchedHead.name,
            jobPositionCodes: matchedHead.linkedJobPositions || [],
          }
        }
      }
    } catch {}
    return null
  })

  React.useEffect(() => {
    let isMounted = true
    const loadManagerDept = async () => {
      try {
        const [members, depts, refs] = await Promise.all([
          getMembers(orgId).catch(() => []),
          fetchDepartments(orgId).catch(() => []),
          getReferences(orgId).catch(() => []),
        ])
        const currentMember = (members || []).find(
          (m) =>
            (session?.identity?.accountId && m.accountId === session?.identity?.accountId) ||
            (session?.identity?.email && m.email?.toLowerCase() === session?.identity?.email?.toLowerCase())
        )
        const localDepts = loadDepartments(orgId)

        // Merge departments from Neo4j, Postgres references, and localStorage
        const deptMap = new Map<string, any>()
        for (const ld of localDepts) {
          const key = (ld.name || ld.code || ld.id).toLowerCase().trim()
          deptMap.set(key, { ...ld, jobPositionCodes: ld.linkedJobPositions || [] })
        }
        for (const ref of refs || []) {
          if (ref.departmentId || ref.departmentName) {
            const key = (ref.departmentName || ref.departmentId).toLowerCase().trim()
            if (!deptMap.has(key)) {
              deptMap.set(key, {
                id: ref.departmentId,
                code: ref.departmentName,
                name: ref.departmentName,
                jobPositionCodes: [],
                linkedJobPositions: [],
              })
            }
          }
        }
        for (const d of depts || []) {
          const key = (d.name || d.code || d.id).toLowerCase().trim()
          const existing = deptMap.get(key)
          const serverCodes = d.jobPositionCodes || (d as any).linkedJobPositions || []
          deptMap.set(key, {
            ...existing,
            ...d,
            jobPositionCodes: serverCodes,
            linkedJobPositions: serverCodes,
          })
        }
        const effectiveDepts = Array.from(deptMap.values())

        let matched: any = null

        let localAssignmentObj: any = null
        if (session?.identity?.email) {
          try {
            const raw = localStorage.getItem(`alg_employee_assignment_${session.identity.email.toLowerCase().trim()}`)
            if (raw) localAssignmentObj = JSON.parse(raw)
          } catch {}
        }

        const targetDeptId = localAssignmentObj?.departmentId || currentMember?.departmentId
        const targetDeptName = localAssignmentObj?.departmentName || currentMember?.departmentName

        if (targetDeptId || targetDeptName) {
          matched = effectiveDepts.find((d) => {
            if (targetDeptId) {
              if (d.id === targetDeptId || d.code === targetDeptId) return true
              if ((d as any).uuid === targetDeptId || (d as any).uuidCode === targetDeptId) return true
            }
            if (targetDeptName && d.name) {
              if (d.name.trim().toLowerCase() === targetDeptName.trim().toLowerCase()) return true
            }
            return false
          })

          if (!matched && targetDeptName) {
            matched = {
              id: targetDeptId || `dept-${targetDeptName.toLowerCase().replace(/\s+/g, '-')}`,
              code: targetDeptName || 'DPT',
              name: targetDeptName,
              jobPositionCodes: [],
              linkedJobPositions: [],
            }
            if (!localAssignmentObj) {
              createDepartmentApi(orgId, {
                id: matched.id,
                code: matched.code,
                name: matched.name,
                headEmail: session?.identity?.email || '',
                headOfDepartment: session?.identity?.fullName || session?.identity?.email || '',
                status: 'ACTIVE',
              }).catch(() => {})
            }
          }
        }

        // Secondary fallback: Match headEmail ONLY if user has no assigned department anywhere
        if (!matched && session?.identity?.email) {
          matched = effectiveDepts.find(
            (d) => (d as any).headEmail?.toLowerCase() === session?.identity?.email?.toLowerCase()
          )
        }

        if (matched && isMounted) {
          const serverCodes = (matched as any).jobPositionCodes ?? (matched as any).linkedJobPositions
          let effectiveCodes: string[] = []
          if (Array.isArray(serverCodes) && (matched as any).createdAt !== undefined) {
            effectiveCodes = serverCodes
          } else {
            const localDeptMatch = localDepts.find(
              (ld) =>
                ld.id === matched.id ||
                ld.code === matched.code ||
                ld.name?.toLowerCase() === matched.name?.toLowerCase()
            )
            effectiveCodes = (serverCodes && serverCodes.length > 0) ? serverCodes : (localDeptMatch?.linkedJobPositions || [])
          }
          setManagerDepartment({
            id: matched.id,
            code: matched.code,
            name: matched.name,
            jobPositionCodes: effectiveCodes,
          })
        } else if (!matched && isMounted) {
          setManagerDepartment(null)
        }
      } catch {
        // Leave current or null
      }
    }
    loadManagerDept()
    window.addEventListener('departments_updated', loadManagerDept)
    window.addEventListener('adaptlearn_job_positions_updated', loadManagerDept)
    return () => {
      isMounted = false
      window.removeEventListener('departments_updated', loadManagerDept)
      window.removeEventListener('adaptlearn_job_positions_updated', loadManagerDept)
    }
  }, [orgId, session?.identity?.accountId, session?.identity?.email, isLdManager])

  const [jobPositions, setJobPositions] = React.useState<JobPositionRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Synchronized state and persistent storage updater
  const setAndSaveJobPositions = React.useCallback(
    (updater: JobPositionRecord[] | ((prev: JobPositionRecord[]) => JobPositionRecord[])) => {
      setJobPositions((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        const seen = new Set<string>()
        const deduplicated = next.filter((item) => {
          const key = (item.code || item.id || '').toUpperCase().trim()
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
        setStoredJobPositions(orgId, deduplicated)
        return deduplicated
      })
    },
    [orgId]
  )

  // Live database fetching from Neo4j merged with local state
  const fetchLiveJobPositions = React.useCallback(async () => {
    try {
      const [data, members] = await Promise.all([
        fetchJobPositions(orgId).catch(() => []),
        getMembers(orgId).catch(() => []),
      ])

      if (Array.isArray(data)) {
        if (data.length === 0) {
          const currentStored = getStoredJobPositions(orgId) || []
          setJobPositions(currentStored)
          return
        }

        const currentStored = getStoredJobPositions(orgId) || []
        const storedByCode = new Map(currentStored.map((o) => [o.code, o]))

        // Dynamic expert lookup from live organization members
        const expertsByPositionCode = new Map<string, AssignedExpert[]>()
        for (const member of members || []) {
          const isExpert = (member.roles || []).some((r: string) =>
            r.toUpperCase().includes('EXPERT')
          )
          const posRef = member.jobPositionReferenceId || member.jobPositionName
          if (posRef) {
            const list = expertsByPositionCode.get(posRef) || []
            list.push({
              id: member.membershipId || member.accountId || member.email,
              name: member.fullName || member.email,
              email: member.email,
              title: isExpert ? 'Subject Matter Expert' : 'Domain Specialist',
            })
            expertsByPositionCode.set(posRef, list)
          }
        }

        const mapped: JobPositionRecord[] = data.map((item: any) => {
          const code = item.code || item.id || ''
          const localMatch = storedByCode.get(code)
          const dynamicExperts =
            expertsByPositionCode.get(code) ||
            (item.name ? expertsByPositionCode.get(item.name) : []) ||
            []

          const effectiveExperts =
            localMatch && localMatch.assignedExperts && localMatch.assignedExperts.length > 0
              ? localMatch.assignedExperts
              : dynamicExperts

          return {
            id: item.id || item.code || '',
            code,
            name: item.name || item.title || '',
            jobZone: item.jobZone || 4,
            description: item.description || localMatch?.description || '',
            status: localMatch?.status || (String(item.status || 'ACTIVE').toLowerCase() === 'inactive' ? 'inactive' : 'active'),
            assignedExperts: effectiveExperts,
            microSkillCount: item.microSkillCount || (item.roles ? item.roles.reduce((acc: number, r: any) => acc + (r.skillCount || 0), 0) : 0),
            moduleCount: item.roleCount || item.moduleCount || (item.roles ? item.roles.length * 3 : 0),
            interests: item.interests || localMatch?.interests || {
              realistic: item.interestRealistic ?? 0.4,
              investigative: item.interestInvestigative ?? 0.8,
              artistic: item.interestArtistic ?? 0.2,
              social: item.interestSocial ?? 0.2,
              enterprising: item.interestEnterprising ?? 0.3,
              conventional: item.interestConventional ?? 0.7,
            },
            createdAt: item.createdAt || localMatch?.createdAt || new Date().toISOString().split('T')[0],
          }
        })

        // Also keep any custom jobPositions created by the user that are not in the backend
        const backendCodes = new Set(mapped.map((m) => m.code))
        const customCreated = currentStored.filter((s) => !backendCodes.has(s.code))
        const merged = [...customCreated, ...mapped]

        setJobPositions(merged)
        setStoredJobPositions(orgId, merged)
        return
      }
    } catch (e) {
      console.warn('Failed to fetch live jobPositions:', e)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    fetchLiveJobPositions()
  }, [fetchLiveJobPositions])

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      fetchLiveJobPositions()
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [fetchLiveJobPositions])

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  // Create / Edit Job Position Modal
  const [isJobPositionModalOpen, setIsJobPositionModalOpen] = React.useState(false)
  const [editingJobPosition, setEditingJobPosition] = React.useState<JobPositionRecord | null>(null)
  const [occName, setOccName] = React.useState('')
  const [occCode, setOccCode] = React.useState('')
  const [occJobZone, setOccJobZone] = React.useState(4)
  const [occDescription, setOccDescription] = React.useState('')
  const [occInterests, setOccInterests] = React.useState<RiasecProfile>({
    realistic: 0.4,
    investigative: 0.75,
    artistic: 0.2,
    social: 0.15,
    enterprising: 0.25,
    conventional: 0.8,
  })

  // View Details Modal (Includes RIASEC profile view)
  const [viewingDetailsJobPosition, setViewingDetailsJobPosition] = React.useState<JobPositionRecord | null>(null)

  // Deactivate Confirmation Modal
  const [jobPositionToDeactivate, setJobPositionToDeactivate] = React.useState<JobPositionRecord | null>(null)

  // Department-scoped list for L&D Managers; full catalog for administrators or unassigned L&D managers
  const scopedJobPositions = React.useMemo(() => {
    if (!isLdManager) {
      return jobPositions
    }
    if (!managerDepartment) {
      return []
    }
    const allowedCodes = new Set(
      (managerDepartment.jobPositionCodes || []).map((c) => c.toLowerCase().trim())
    )
    if (allowedCodes.size === 0) {
      return []
    }
    return jobPositions.filter((o) => {
      const code = (o.code || '').toLowerCase().trim()
      const id = (o.id || '').toLowerCase().trim()
      const baseCode = code.replace(/\.00$/, '')
      const allowedBaseMatches = Array.from(allowedCodes).some((c) => c.replace(/\.00$/, '') === baseCode)
      return allowedCodes.has(code) || allowedCodes.has(id) || allowedBaseMatches
    })
  }, [jobPositions, isLdManager, managerDepartment])

  // Filtered List
  const filteredJobPositions = React.useMemo(() => {
    return scopedJobPositions
      .filter((o) => {
        const matchesSearch =
          o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return (b.id || '').localeCompare(a.id || '')
      })
  }, [scopedJobPositions, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredJobPositions.length / PAGE_SIZE))
  const paginatedJobPositions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredJobPositions.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredJobPositions, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingJobPosition(null)
    setOccName('')

    // Generate unique code that doesn't collide with ANY existing job position
    const existingCodes = new Set(
      jobPositions.map((p) => p.code.toLowerCase().trim())
    )
    let nextNum = 1251
    while (
      existingCodes.has(`15-${nextNum.toString().padStart(4, '0')}.00`) ||
      existingCodes.has(`15-${nextNum}.00`)
    ) {
      nextNum++
    }
    setOccCode(`15-${nextNum.toString().padStart(4, '0')}.00`)
    setOccJobZone(4)
    setOccDescription('')
    setOccInterests({
      realistic: 0.4,
      investigative: 0.75,
      artistic: 0.2,
      social: 0.15,
      enterprising: 0.25,
      conventional: 0.8,
    })
    setIsJobPositionModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (occ: JobPositionRecord) => {
    setEditingJobPosition(occ)
    setOccName(occ.name)
    setOccCode(occ.code)
    setOccJobZone(occ.jobZone)
    setOccDescription(occ.description)
    setOccInterests(occ.interests || {
      realistic: 0.4,
      investigative: 0.75,
      artistic: 0.2,
      social: 0.15,
      enterprising: 0.25,
      conventional: 0.8,
    })
    setIsJobPositionModalOpen(true)
  }

  // Save Job Position
  const handleSaveJobPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!occName.trim() || !occCode.trim()) return

    const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)
    const codeUpper = occCode.trim().toUpperCase()

    // Guard against duplicate codes
    if (!editingJobPosition) {
      const duplicate = jobPositions.find(
        (p) => p.code.toLowerCase().trim() === codeUpper.toLowerCase().trim()
      )
      if (duplicate) {
        toast({
          title: 'Duplicate Job Position Code',
          description: `A job position with code ${codeUpper} already exists ("${duplicate.name}"). Each job position must have a unique code.`,
          variant: 'destructive',
        })
        return
      }
    } else if (editingJobPosition.code.toUpperCase() !== codeUpper) {
      const duplicate = jobPositions.find(
        (p) =>
          p.id !== editingJobPosition.id &&
          p.code.toLowerCase().trim() === codeUpper.toLowerCase().trim()
      )
      if (duplicate) {
        toast({
          title: 'Duplicate Job Position Code',
          description: `A job position with code ${codeUpper} already exists ("${duplicate.name}"). Please use a different code.`,
          variant: 'destructive',
        })
        return
      }
    }
    // Close modal immediately and capture editing state
    setIsJobPositionModalOpen(false)
    const currentEditing = editingJobPosition
    setEditingJobPosition(null)

    if (currentEditing) {
      try {
        await updateJobPosition(orgId, currentEditing.id, {
          name: occName.trim(),
          code: codeUpper,
          jobZone: occJobZone,
          interestRealistic: occInterests.realistic,
          interestInvestigative: occInterests.investigative,
          interestArtistic: occInterests.artistic,
          interestSocial: occInterests.social,
          interestEnterprising: occInterests.enterprising,
          interestConventional: occInterests.conventional,
        })
        setAndSaveJobPositions((prev) =>
          prev.map((o) =>
            o.id === currentEditing.id
              ? {
                  ...o,
                  name: occName.trim(),
                  code: codeUpper,
                  jobZone: occJobZone,
                  description: occDescription.trim(),
                  interests: occInterests,
                }
              : o
          )
        )
        toast({
          title: 'Job Position Updated',
          description: `Successfully modified ${occName}.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        toast({
          title: 'Update Failed',
          description: err instanceof Error ? err.message : 'Failed to update job position on server.',
          variant: 'destructive',
        })
        return
      }
    } else {
      const newOcc: JobPositionRecord = {
        id: codeUpper,
        code: codeUpper,
        name: occName.trim(),
        jobZone: occJobZone,
        description: occDescription.trim(),
        status: 'active',
        assignedExperts: [],
        microSkillCount: 0,
        moduleCount: 0,
        interests: occInterests,
        createdAt: new Date().toISOString(),
      }
      try {
        await createJobPosition(orgId, {
          id: newOcc.id,
          code: newOcc.code,
          name: newOcc.name,
          jobZone: newOcc.jobZone,
          interestRealistic: occInterests.realistic,
          interestInvestigative: occInterests.investigative,
          interestArtistic: occInterests.artistic,
          interestSocial: occInterests.social,
          interestEnterprising: occInterests.enterprising,
          interestConventional: occInterests.conventional,
          status: 'ACTIVE',
        })
        setAndSaveJobPositions((prev) => [newOcc, ...prev])

        // Automatically assign created job position to the manager's department
        if (managerDepartment) {
          const nextCodes = Array.from(
            new Set([
              ...(managerDepartment.jobPositionCodes || []),
              newOcc.code,
              newOcc.code.toLowerCase(),
              newOcc.code.replace(/\.00$/, ''),
              newOcc.code.replace(/\.00$/, '').toLowerCase(),
            ])
          )
          setManagerDepartment((prev) => (prev ? { ...prev, jobPositionCodes: nextCodes } : prev))

          try {
            const depts = loadDepartments(orgId)
            const targetDept = depts.find(
              (d) =>
                d.id === managerDepartment.id ||
                d.code === managerDepartment.id ||
                (managerDepartment as any).code === d.code ||
                d.name.toLowerCase() === managerDepartment.name.toLowerCase()
            )
            if (targetDept) {
              const currentLinked = targetDept.linkedJobPositions || []
              if (!currentLinked.includes(newOcc.code)) {
                const nextLinked = [...currentLinked, newOcc.code]
                updateDepartment(targetDept.id, { linkedJobPositions: nextLinked }, orgId)
                await linkJobPositionToDepartment(orgId, targetDept.id, newOcc.code).catch(() => {})
                await linkJobPositionToDepartment(orgId, targetDept.code, newOcc.code).catch(() => {})
                await updateDepartmentApi(orgId, targetDept.id, {
                  code: targetDept.code,
                  name: targetDept.name,
                  linkedJobPositions: nextLinked,
                }).catch(() => {})
                window.dispatchEvent(new Event('departments_updated'))
              }
            } else {
              const createdDeptRecord = {
                id: managerDepartment.id,
                code: (managerDepartment as any).code || managerDepartment.name.toUpperCase().slice(0, 8),
                name: managerDepartment.name,
                description: '',
                headOfDepartment: '',
                headEmail: session?.identity?.email || '',
                status: 'active' as const,
                linkedJobPositions: [newOcc.code],
                organizationId: orgId,
                createdAt: new Date().toISOString(),
              }
              const currentDepts = loadDepartments(orgId)
              saveDepartments([createdDeptRecord, ...currentDepts], orgId)
              await linkJobPositionToDepartment(orgId, managerDepartment.id, newOcc.code).catch(() => {})
              window.dispatchEvent(new Event('departments_updated'))
            }
          } catch (e) {
            console.warn('Failed to update department linked job positions:', e)
          }
        }
        window.dispatchEvent(new Event('adaptlearn_job_positions_updated'))

        toast({
          title: 'Job Position Created',
          description: `Added ${newOcc.name} (${newOcc.code}) to ${managerDepartment ? managerDepartment.name : 'the catalog'}.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        toast({
          title: 'Creation Failed',
          description: err instanceof Error ? err.message : 'Failed to save job position.',
          variant: 'destructive',
        })
        return
      }
    }
  }

  // Check whether a job position has any non-unpublished target roles assigned to it
  const getActiveTargetRolesForJobPosition = React.useCallback(
    async (occ: JobPositionRecord): Promise<string[]> => {
      const normalizeOccCode = (c?: string) =>
        (c || '').trim().toLowerCase().replace(/\.00$/, '')
      const targetOccCode = normalizeOccCode(occ.code)
      if (!targetOccCode) return []

      let metaMap: Record<
        string,
        {
          jobPositionCode?: string
          jobPositionTitle?: string
          status?: string
        }
      > = {}
      try {
        const rawMeta = localStorage.getItem('adaptlearn_target_role_meta_' + orgId)
        if (rawMeta) {
          metaMap = JSON.parse(rawMeta)
        }
      } catch {}

      const currentActiveComp = getActiveCompany()
      const storeRoles = currentActiveComp?.targetRoles || []

      let backendRoles: Record<string, unknown>[] = []
      try {
        const res = await workspaceFetch(`/api/v1/organizations/${orgId}/target-roles`, {
          headers: {
            'X-User-Role': 'LD_MANAGER',
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            backendRoles = data as Record<string, unknown>[]
          }
        }
      } catch {}

      const activeRoleTitles: string[] = []
      const seenLineageCodes = new Set<string>()

      for (const r of backendRoles) {
        const rawStatus = String(r.status || '').toLowerCase()
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

        const explicitJobPositionCode =
          typeof r.jobPositionCode === 'string' && r.jobPositionCode
            ? r.jobPositionCode
            : meta?.jobPositionCode || storeRole?.jobPositionCode

        const resolvedOcc = resolveJobPositionForRole(
          {
            code: rCode,
            title: rTitle,
            familyCode: String(r.familyCode || ''),
            jobPositionCode: explicitJobPositionCode,
          },
          orgId,
        )
        const effectiveOccCode = normalizeOccCode(explicitJobPositionCode || resolvedOcc.code)

        if (effectiveOccCode === targetOccCode) {
          seenLineageCodes.add(`${rCode}::${rVersion}`)
          const isUnpublished = rawStatus === 'unpublished'
          if (!isUnpublished) {
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

        const meta = metaMap[srCode] || metaMap[sr.id]
        const explicitJobPositionCode = sr.jobPositionCode || meta?.jobPositionCode
        const resolvedOcc = resolveJobPositionForRole(
          {
            code: srCode,
            title: sr.title,
            familyCode: sr.familyCode,
            jobPositionCode: explicitJobPositionCode,
          },
          orgId,
        )
        const effectiveOccCode = normalizeOccCode(explicitJobPositionCode || resolvedOcc.code)

        if (effectiveOccCode === targetOccCode) {
          const isUnpublished =
            meta?.status === 'unpublished' || sr.status === 'unpublished'
          if (!isUnpublished) {
            activeRoleTitles.push(`${sr.title} (${srCode})`)
          }
        }
      }

      return activeRoleTitles
    },
    [orgId],
  )

  const handleRequestDeactivate = async (occ: JobPositionRecord) => {
    const activeRoles = await getActiveTargetRolesForJobPosition(occ)
    if (activeRoles.length > 0) {
      toast({
        title: 'Cannot Deactivate Job Position',
        description: `${occ.name} (${occ.code}) still has active target role(s) assigned to it. Please unpublish all associated target roles before deactivating.`,
        variant: 'destructive',
      })
      return
    }
    setJobPositionToDeactivate(occ)
  }

  // Toggle Job Position Active Status
  const handleToggleStatus = async (occ: JobPositionRecord) => {
    const nextStatus = occ.status === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'inactive') {
      const activeRoles = await getActiveTargetRolesForJobPosition(occ)
      if (activeRoles.length > 0) {
        toast({
          title: 'Cannot Deactivate Job Position',
          description: `${occ.name} (${occ.code}) still has active target role(s) assigned to it. Please unpublish all associated target roles before deactivating.`,
          variant: 'destructive',
        })
        return
      }
    }
    const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)
    try {
      await updateJobPosition(orgId, occ.id, {
        code: occ.code,
        name: occ.name,
        status: nextStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
      })
      setAndSaveJobPositions((prev) =>
        prev.map((o) => (o.id === occ.id ? { ...o, status: nextStatus } : o))
      )
      toast({
        title: nextStatus === 'active' ? 'Job Position Activated' : 'Job Position Deactivated',
        description: `${occ.name} status updated to ${nextStatus}.`,
        variant: 'info',
      })
    } catch (err: unknown) {
      toast({
        title: 'Status Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update job position status.',
        variant: 'destructive',
      })
    }
  }

  // Import handler
  const handleImportJobPositions = (importedData: unknown, _source: 'preset' | 'custom') => {
    const rawList: unknown[] = Array.isArray(importedData)
      ? importedData
      : (typeof importedData === 'object' && importedData !== null && 'jobPositions' in importedData && Array.isArray((importedData as Record<string, unknown>).jobPositions))
      ? ((importedData as Record<string, unknown>).jobPositions as unknown[])
      : [importedData]

    const validJobPositions: JobPositionRecord[] = []
    for (const rawItem of rawList) {
      if (typeof rawItem !== 'object' || rawItem === null) continue
      const item = rawItem as Record<string, unknown>
      if (!item.name) continue
      validJobPositions.push({
        id: String(item.id || `occ-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        code: String(item.code || `15-${(1250 + jobPositions.length + validJobPositions.length + 1).toString().padStart(4, '0')}.00`),
        name: String(item.name).trim(),
        jobZone: Number(item.jobZone) || 4,
        description: String(item.description || 'Imported curricular jobPosition domain.'),
        status: item.status === 'inactive' ? 'inactive' : 'active',
        assignedExperts: Array.isArray(item.assignedExperts) ? (item.assignedExperts as JobPositionRecord['assignedExperts']) : [],
        microSkillCount: Number(item.microSkillCount) || 0,
        moduleCount: Number(item.moduleCount) || 0,
        interests: (item.interests as JobPositionRecord['interests']) || {
          realistic: 0.4,
          investigative: 0.75,
          artistic: 0.2,
          social: 0.15,
          enterprising: 0.25,
          conventional: 0.8,
        },
        createdAt: String(item.createdAt || new Date().toISOString().split('T')[0]),
      })
    }

    if (validJobPositions.length === 0) {
      toast({
        title: 'Import Failed',
        description: 'No valid jobPosition records found in the imported file.',
        variant: 'destructive',
      })
      return
    }

    setAndSaveJobPositions((prev) => [...validJobPositions, ...prev])

    if (managerDepartment && validJobPositions.length > 0) {
      const importedCodes = validJobPositions.map((p) => p.code)
      const nextCodes = Array.from(new Set([...(managerDepartment.jobPositionCodes || []), ...importedCodes]))
      setManagerDepartment((prev) => (prev ? { ...prev, jobPositionCodes: nextCodes } : prev))

      try {
        const depts = loadDepartments(orgId)
        const targetDept = depts.find(
          (d) =>
            d.id === managerDepartment.id ||
            d.code === managerDepartment.id ||
            d.name.toLowerCase() === managerDepartment.name.toLowerCase()
        )
        if (targetDept) {
          const currentLinked = targetDept.linkedJobPositions || []
          const nextLinked = Array.from(new Set([...currentLinked, ...importedCodes]))
          updateDepartment(targetDept.id, { linkedJobPositions: nextLinked }, orgId)
          for (const code of importedCodes) {
            linkJobPositionToDepartment(orgId, targetDept.id, code).catch(() => {})
          }
          window.dispatchEvent(new Event('departments_updated'))
        }
      } catch (e) {
        console.warn('Failed to link imported positions to manager department:', e)
      }
    }

    toast({
      title: 'JobPositions Imported',
      description: `Successfully imported ${validJobPositions.length} jobPosition(s) into catalog.`,
      variant: 'success',
    })
    setIsImportModalOpen(false)
  }

  // Aggregate Metrics (scoped to manager's department if LD_MANAGER)
  const totalJobPositions = scopedJobPositions.length
  const totalMicroSkills = scopedJobPositions.reduce((acc, o) => acc + o.microSkillCount, 0)
  const activeCount = scopedJobPositions.filter((o) => o.status === 'active').length
  const inactiveCount = scopedJobPositions.filter((o) => o.status === 'inactive').length

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar (Styled identical to Target Roles / Discipline page) */}
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setIsImportModalOpen(true)}
                className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs"
              >
                Import
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
                className="font-semibold shadow-2xs"
              >
                Create
              </Button>
            </div>
          }
        />

        {/* Aggregate KPI StatCards (Variant gradient identical to Target Roles) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<FolderTree className="h-4 w-4 text-primary" />}
            title="Job Positions"
            value={isLoading ? '—' : `${totalJobPositions} Job Positions`}
            valueClassName="text-primary"
            description="Industry classifications"
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-success" />}
            title="Active Positions"
            value={isLoading ? '—' : `${activeCount} Active`}
            valueClassName="text-success"
            description="Governed in organization"
          />

          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-warning" />}
            title="Micro-Skills Covered"
            value={isLoading ? '—' : `${totalMicroSkills} Skills`}
            valueClassName="text-warning"
            description="Across all job positions"
          />

          <StatCard
            variant="gradient"
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            title="Inactive Positions"
            value={isLoading ? '—' : `${inactiveCount} Inactive`}
            valueClassName="text-muted-foreground"
            description="Suspended classifications"
          />
        </div>

        {/* JOB_POSITIONS CATALOG TABLE CARD */}
        <Card className="border border-border shadow-xs overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Job Positions Directory
                </CardTitle>
                <CardDescription>
                  {isLdManager && managerDepartment
                    ? `Browse and govern job position classifications and skill footprints for ${managerDepartment.name}.`
                    : 'Browse and govern job position classifications, skill footprints, and competency scopes across departments.'}
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search job positions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')}
                    aria-label="Filter by Status"
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="ALL">All ({totalJobPositions})</option>
                    <option value="active">Active ({activeCount})</option>
                    <option value="inactive">Inactive ({inactiveCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
                <p className="text-sm font-medium">Loading job positions from database...</p>
              </div>
            ) : scopedJobPositions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <FolderTree className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No job positions found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {isLdManager && managerDepartment
                    ? `No job positions are currently associated with ${managerDepartment.name}.`
                    : 'Import job positions from the catalog or create custom job positions to start structuring competency requirements.'}
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => setIsImportModalOpen(true)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Import Job Positions
                  </Button>
                </div>
              </div>
            ) : filteredJobPositions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <FolderTree className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No job positions match your search criteria</p>
                <p className="text-xs text-muted-foreground/80">Try adjusting your keyword filter or status dropdown.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">CODE</th>
                      <th className="py-2.5 px-3">JOB POSITION &amp; SCOPE</th>
                      <th className="py-2.5 px-3 text-center">MICRO-SKILLS</th>
                      <th className="py-2.5 px-3 text-center">MODULES</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedJobPositions.map((occ) => (
                      <tr key={occ.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                          {occ.code}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-semibold text-foreground text-sm leading-snug">{occ.name}</div>
                          <div className="text-muted-foreground text-xs line-clamp-1 max-w-md mt-0.5" title={occ.description}>
                            {occ.description}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          <span className="font-semibold text-foreground">{occ.microSkillCount}</span> skills
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          <span className="font-semibold text-foreground">{occ.moduleCount}</span> modules
                        </td>
                        <td className="py-3 px-3">
                          {occ.status === 'active' ? (
                            <Badge variant="success">ACTIVE</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">INACTIVE</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details (Includes RIASEC profile) */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setViewingDetailsJobPosition(occ)}
                              title="View Details & RIASEC"
                              aria-label="View Details & RIASEC"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>

                            {/* Edit Job Position */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(occ)}
                              title="Edit Job Position"
                              aria-label="Edit Job Position"
                            >
                              <Edit3 className="h-4 w-4 text-foreground" />
                            </Button>

                            {/* Toggle Active/Inactive */}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 w-8 p-0 ${
                                occ.status === 'active'
                                  ? 'text-destructive hover:bg-destructive/10'
                                  : 'text-success hover:bg-success/10'
                              }`}
                              onClick={() => {
                                if (occ.status === 'active') {
                                  handleRequestDeactivate(occ)
                                } else {
                                  handleToggleStatus(occ)
                                }
                              }}
                              title={occ.status === 'active' ? 'Deactivate Job Position' : 'Activate Job Position'}
                              aria-label={occ.status === 'active' ? 'Deactivate Job Position' : 'Activate Job Position'}
                            >
                              {occ.status === 'active' ? (
                                <Power className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination if multiple pages */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QUICK CONFIG IMPORT MODAL */}
      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Job Positions"
        entityName="Job Positions"
        description="Select a curated job position domain catalog or paste a JSON array of custom job positions."
        presets={JOB_POSITION_PRESETS}
        onImport={handleImportJobPositions}
        sampleJsonPlaceholder={`[
  {
    "code": "15-1252.00",
    "name": "Software Developers",
    "description": "Continuous delivery, microservices architecture, and cloud infrastructure.",
    "status": "active"
  }
]`}
      />

      {/* VIEW DETAILS MODAL (WITH RIASEC INTEREST PROFILE) */}
      <Dialog open={!!viewingDetailsJobPosition} onOpenChange={() => setViewingDetailsJobPosition(null)} className="max-w-xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        {viewingDetailsJobPosition && (
          <>
            <DialogHeader className="shrink-0 mb-3">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  {viewingDetailsJobPosition.name}
                </DialogTitle>
                <Badge variant={viewingDetailsJobPosition.status === 'active' ? 'success' : 'outline'}>
                  {viewingDetailsJobPosition.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                View Details &amp; RIASEC profile
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 py-1 text-xs min-h-0">
              {/* Description Box */}
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                  Scope &amp; Domain Description
                </span>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  {viewingDetailsJobPosition.description}
                </p>
              </div>

              {/* Coverage Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Micro-Skills</span>
                  <strong className="text-foreground text-sm font-semibold">{viewingDetailsJobPosition.microSkillCount} Skills</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Instructional Modules</span>
                  <strong className="text-foreground text-sm font-semibold">{viewingDetailsJobPosition.moduleCount} Modules</strong>
                </div>
              </div>

              {/* RIASEC Profile Visualizer */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-secondary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    RIASEC Profile
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Realistic */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Realistic (R) — Hands-on / Technical</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsJobPosition.interests?.realistic || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.realistic || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Investigative */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Investigative (I) — Analytical / Problem-Solving</span>
                      <span className="font-mono font-bold text-primary">
                        {((viewingDetailsJobPosition.interests?.investigative || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.investigative || 0) * 100} variant="primary" className="h-1.5" />
                  </div>

                  {/* Artistic */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Artistic (A) — Design / Expression</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsJobPosition.interests?.artistic || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.artistic || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Social */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Social (S) — Support / Helping</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsJobPosition.interests?.social || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.social || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Enterprising */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Enterprising (E) — Leadership / Persuasion</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsJobPosition.interests?.enterprising || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.enterprising || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Conventional */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Conventional (C) — Structured Data / Rules</span>
                      <span className="font-mono font-bold text-primary">
                        {((viewingDetailsJobPosition.interests?.conventional || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsJobPosition.interests?.conventional || 0) * 100} variant="primary" className="h-1.5" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
              <Button
                variant={viewingDetailsJobPosition.status === 'active' ? 'destructive' : 'outline'}
                size="sm"
                leftIcon={
                  viewingDetailsJobPosition.status === 'active' ? (
                    <Power className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  )
                }
                onClick={() => {
                  const occ = viewingDetailsJobPosition
                  setViewingDetailsJobPosition(null)
                  if (occ.status === 'active') {
                    handleRequestDeactivate(occ)
                  } else {
                    handleToggleStatus(occ)
                  }
                }}
              >
                {viewingDetailsJobPosition.status === 'active' ? 'Deactivate Job Position' : 'Activate Job Position'}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingDetailsJobPosition(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const occ = viewingDetailsJobPosition
                    setViewingDetailsJobPosition(null)
                    handleOpenEdit(occ)
                  }}
                >
                  Edit Job Position
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* CREATE / EDIT JOB_POSITION MODAL (WITH RIASEC EDITING) */}
      <Dialog open={isJobPositionModalOpen} onOpenChange={setIsJobPositionModalOpen} className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 mb-3">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary shrink-0" />
              <span>{editingJobPosition ? (occName || editingJobPosition.name) : 'Create New Job Position'}</span>
            </DialogTitle>
            {editingJobPosition ? (
              <Badge variant={editingJobPosition.status === 'active' ? 'success' : 'outline'} className="font-bold text-xs">
                {editingJobPosition.status.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
                NEW JOB POSITION
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {editingJobPosition
              ? 'Update job position details, career interest weights, and preparation requirements.'
              : 'Define an industry job position to organize job roles, competencies, and skill pathways.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveJobPosition} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 py-1 text-xs min-h-0">
            {managerDepartment && (
              <div className="p-2.5 rounded-lg border border-primary/20 bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Assigned Department
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {managerDepartment.name}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px] font-bold">
                  AUTO-LINKED
                </Badge>
              </div>
            )}

            {/* Card 1: Taxonomy & Identification */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Industry Classification &amp; Identity
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Standard Position Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. 15-1252.00"
                    value={occCode}
                    onChange={(e) => setOccCode(e.target.value)}
                    required
                    className="font-mono text-xs shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Job Position Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Software Developers"
                    value={occName}
                    onChange={(e) => setOccName(e.target.value)}
                    required
                    className="text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-foreground block">
                    Job Zone (1–5)
                  </label>
                  <span className="text-[10.5px] text-muted-foreground">
                    {occJobZone <= 2
                      ? 'Zone 1-2: Moderate Preparation'
                      : occJobZone === 3
                      ? 'Zone 3: Medium Preparation'
                      : occJobZone === 4
                      ? 'Zone 4: Considerable Preparation (BSc / 2–4 yrs)'
                      : 'Zone 5: Extensive Preparation (MSc / PhD)'}
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={occJobZone}
                  onChange={(e) => setOccJobZone(Number(e.target.value))}
                  className="font-mono text-xs w-28 shadow-2xs"
                />
              </div>
            </div>

            {/* Card 2: Job Position Scope & Summary */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Job Position Scope &amp; Summary
              </span>
              <textarea
                className="w-full text-xs rounded-md border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[75px] shadow-2xs leading-relaxed"
                placeholder="Provide a comprehensive summary of this job position and typical workplace duties..."
                value={occDescription}
                onChange={(e) => setOccDescription(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground block">
                Provides foundational context for skill requirements and personalized learning recommendations.
              </span>
            </div>

            {/* Card 3: RIASEC Profile Calibration with Live Visual Feedback */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-secondary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Career Interest Alignment (Holland RIASEC)
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    Fine-tune interest compatibility scores to personalize role recommendations for learners.
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-card/60 shrink-0">
                  0% – 100%
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {[
                  { key: 'realistic' as const, code: 'Realistic (R)', desc: 'Hands-on / Technical' },
                  { key: 'investigative' as const, code: 'Investigative (I)', desc: 'Analytical / Problem-Solving' },
                  { key: 'artistic' as const, code: 'Artistic (A)', desc: 'Design / Expression' },
                  { key: 'social' as const, code: 'Social (S)', desc: 'Support / Helping' },
                  { key: 'enterprising' as const, code: 'Enterprising (E)', desc: 'Leadership / Persuasion' },
                  { key: 'conventional' as const, code: 'Conventional (C)', desc: 'Structured Data / Rules' },
                ].map((dim) => {
                  const rawVal = occInterests[dim.key] ?? 0
                  const percentVal = Math.round(rawVal * 100)

                  return (
                    <div
                      key={dim.key}
                      className="p-2.5 rounded-lg border border-border/80 bg-card shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">
                            {dim.code}
                          </span>
                          <span className="text-[10.5px] text-muted-foreground block truncate">
                            {dim.desc}
                          </span>
                        </div>

                        {/* Direct manual percent input */}
                        <div className="flex items-center gap-1 shrink-0 bg-muted/40 px-1.5 py-0.5 rounded border border-border">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={percentVal}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value)
                              const clamped = Math.min(100, Math.max(0, isNaN(val) ? 0 : val))
                              setOccInterests((prev) => ({
                                ...prev,
                                [dim.key]: Number((clamped / 100).toFixed(3)),
                              }))
                            }}
                            className="w-8 text-right text-xs font-mono font-bold bg-transparent text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label={`${dim.code} percentage`}
                          />
                          <span className="text-xs font-bold text-muted-foreground">%</span>
                        </div>
                      </div>

                      {/* Live visual progress meter matching View Details */}
                      <Progress value={percentVal} variant="primary" className="h-1.5" />

                      {/* Volume-Style Slider (Drag Left & Right) */}
                      <div className="pt-0.5">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={percentVal}
                          onChange={(e) => {
                            const num = Number(e.target.value) || 0
                            setOccInterests((prev) => ({
                              ...prev,
                              [dim.key]: Number((num / 100).toFixed(3)),
                            }))
                          }}
                          style={{
                            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentVal}%, #FFFFFF ${percentVal}%, #FFFFFF 100%)`,
                          }}
                          className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-primary border border-border shadow-xs"
                          aria-label={`${dim.code} slider`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsJobPositionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingJobPosition ? 'Save Changes' : 'Create Job Position'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      <Dialog open={!!jobPositionToDeactivate} onOpenChange={() => setJobPositionToDeactivate(null)}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Job Position?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to suspend <strong className="text-foreground">{jobPositionToDeactivate?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        {jobPositionToDeactivate && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground">
                {jobPositionToDeactivate.name}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>{jobPositionToDeactivate.microSkillCount} Skills</span>
                <span>•</span>
                <span>{jobPositionToDeactivate.moduleCount} Modules</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-foreground">
                <strong className="text-destructive font-semibold">Operational Impact:</strong> Deactivating this job position will suspend new module and pathway associations. Historical learning data will be preserved.
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setJobPositionToDeactivate(null)}>
            Keep Active
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (jobPositionToDeactivate) {
                handleToggleStatus(jobPositionToDeactivate)
                setJobPositionToDeactivate(null)
              }
            }}
            leftIcon={<Power className="h-3.5 w-3.5" />}
          >
            Deactivate Job Position
          </Button>
        </DialogFooter>
      </Dialog>

    </WorkspaceLayout>
  )
}
