import * as React from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FolderTree,
  Plus,
  Power,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
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
import { getOrganizationExperts, normalizeExpertId, type EligibleExpert } from '../data/ldManagerMockData'
import { getMembers } from '../../subscription/subscriptionApi'
import {
  createOccupation,
  updateOccupation,
  fetchOccupations,
} from '../../../shared/api/occupationApi'

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

export interface OccupationRecord {
  id: string
  code: string // O*NET-SOC code, e.g. 15-1252.00
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

const INITIAL_OCCUPATIONS: OccupationRecord[] = [
  {
    id: 'occ-15125200',
    code: '15-1252.00',
    name: 'Software Developers',
    jobZone: 4,
    description: 'Research, design, and develop computer and network software, clean hexagonal microservices, and distributed systems.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-chen',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@adaptlearn.internal',
        title: 'Senior AI & Knowledge Architect',
      },
    ],
    microSkillCount: 24,
    moduleCount: 24,
    interests: {
      realistic: 0.435,
      investigative: 0.842,
      artistic: 0.228,
      social: 0.135,
      enterprising: 0.145,
      conventional: 0.77,
    },
    createdAt: '2026-08-15',
  },
  {
    id: 'occ-15124300',
    code: '15-1243.00',
    name: 'Database Architects',
    jobZone: 4,
    description: 'Design enterprise data models, transactional knowledge graphs, graph neural networks, and semantic ontologies.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-vance',
        name: 'Marcus Vance',
        email: 'marcus.vance@adaptlearn.internal',
        title: 'Principal Graph Database Architect',
      },
    ],
    microSkillCount: 18,
    moduleCount: 18,
    interests: {
      realistic: 0.272,
      investigative: 0.772,
      artistic: 0.193,
      social: 0.152,
      enterprising: 0.28,
      conventional: 0.853,
    },
    createdAt: '2026-08-20',
  },
  {
    id: 'occ-15125300',
    code: '15-1253.00',
    name: 'Software Quality Assurance Analysts and Testers',
    jobZone: 4,
    description: 'Develop and execute automated test suites, regression pipelines, and test-driven verification workflows across applications.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-chen',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@adaptlearn.internal',
        title: 'Senior AI & Knowledge Architect',
      },
      {
        id: 'expert-rivera',
        name: 'Alex Rivera',
        email: 'alex.rivera@adaptlearn.internal',
        title: 'Staff Cloud Infrastructure Engineer',
      },
    ],
    microSkillCount: 15,
    moduleCount: 15,
    interests: {
      realistic: 0.467,
      investigative: 0.793,
      artistic: 0.115,
      social: 0.088,
      enterprising: 0.095,
      conventional: 0.778,
    },
    createdAt: '2026-09-01',
  },
  {
    id: 'occ-15129908',
    code: '15-1299.08',
    name: 'Computer Systems Engineers/Architects',
    jobZone: 4,
    description: 'Design systems architecture, distributed multi-cloud orchestration, reliable message queuing architectures, and hardware-software interfaces.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-rivera',
        name: 'Alex Rivera',
        email: 'alex.rivera@adaptlearn.internal',
        title: 'Staff Cloud Infrastructure Engineer',
      },
    ],
    microSkillCount: 16,
    moduleCount: 16,
    interests: {
      realistic: 0.517,
      investigative: 0.743,
      artistic: 0.147,
      social: 0.183,
      enterprising: 0.338,
      conventional: 0.793,
    },
    createdAt: '2026-09-05',
  },
  {
    id: 'occ-15121200',
    code: '15-1212.00',
    name: 'Information Security Analysts',
    jobZone: 4,
    description: 'Zero-trust architecture, cryptographic identity models, network boundary security, and enterprise AI compliance frameworks.',
    status: 'active',
    assignedExperts: [],
    microSkillCount: 12,
    moduleCount: 12,
    interests: {
      realistic: 0.427,
      investigative: 0.733,
      artistic: 0.057,
      social: 0.185,
      enterprising: 0.308,
      conventional: 0.847,
    },
    createdAt: '2026-09-10',
  },
]

const OCCUPATION_PRESETS: ImportPreset[] = [
  {
    id: 'preset-onet-tech',
    name: 'Standard O*NET Technology Occupations',
    description: 'Includes Software Developers, Database Architects, and Security Analysts.',
    badge: 'Technology',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { code: '15-1252.00', name: 'Software Developers', microSkillCount: 24, moduleCount: 24 },
        { code: '15-1243.00', name: 'Database Architects', microSkillCount: 18, moduleCount: 18 },
        { code: '15-1212.00', name: 'Information Security Analysts', microSkillCount: 12, moduleCount: 12 },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `occ-imp-${Date.now()}-1`,
        code: '15-1252.00',
        name: 'Software Developers',
        jobZone: 4,
        description: 'Scalable backend systems, clean hexagonal microservices, and high-concurrency event loops.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 24,
        moduleCount: 24,
        interests: { realistic: 0.435, investigative: 0.842, artistic: 0.228, social: 0.135, enterprising: 0.145, conventional: 0.77 },
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `occ-imp-${Date.now()}-2`,
        code: '15-1243.00',
        name: 'Database Architects',
        jobZone: 4,
        description: 'Design enterprise data models, knowledge graphs, and multidimensional analytics.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 18,
        moduleCount: 18,
        interests: { realistic: 0.272, investigative: 0.772, artistic: 0.193, social: 0.152, enterprising: 0.28, conventional: 0.853 },
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `occ-imp-${Date.now()}-3`,
        code: '15-1212.00',
        name: 'Information Security Analysts',
        jobZone: 4,
        description: 'Zero-trust architecture, cryptographic identity models, and enterprise AI compliance frameworks.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 12,
        moduleCount: 12,
        interests: { realistic: 0.427, investigative: 0.733, artistic: 0.057, social: 0.185, enterprising: 0.308, conventional: 0.847 },
        createdAt: new Date().toISOString().split('T')[0],
      },
    ],
  },
]

const PAGE_SIZE = 8
const OCCUPATIONS_STORAGE_PREFIX = 'adaptlearn_occupations_v2_'

const getStoredOccupations = (organizationId: string): OccupationRecord[] | null => {
  try {
    const raw = localStorage.getItem(`${OCCUPATIONS_STORAGE_PREFIX}${organizationId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const setStoredOccupations = (organizationId: string, data: OccupationRecord[]) => {
  try {
    localStorage.setItem(`${OCCUPATIONS_STORAGE_PREFIX}${organizationId}`, JSON.stringify(data))
  } catch {}
}

export function OccupationsManagementPage() {
  const { toast } = useToast()
  const session = React.useContext(WorkspaceSessionContext)
  const activeCompany = getActiveCompany()
  const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)

  const isTechnova = orgId === 'e0000000-0000-0000-0000-000000000001' || orgId === 'comp-technova' || orgId === 'default-org'

  const [occupations, setOccupations] = React.useState<OccupationRecord[]>(() => {
    const stored = getStoredOccupations(orgId)
    if (stored) return stored
    return isTechnova ? INITIAL_OCCUPATIONS : []
  })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Synchronized state and persistent storage updater
  const setAndSaveOccupations = React.useCallback(
    (updater: OccupationRecord[] | ((prev: OccupationRecord[]) => OccupationRecord[])) => {
      setOccupations((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        setStoredOccupations(orgId, next)
        return next
      })
    },
    [orgId]
  )

  // Live database fetching from Neo4j merged with local state
  const fetchLiveOccupations = React.useCallback(async () => {
    try {
      const data = await fetchOccupations(orgId)
      if (Array.isArray(data)) {
        if (data.length === 0) {
          const currentStored = getStoredOccupations(orgId)
          if (currentStored && currentStored.length > 0) {
            setOccupations(currentStored)
          } else {
            setOccupations(isTechnova ? INITIAL_OCCUPATIONS : [])
          }
          return
        }

        const currentStored = getStoredOccupations(orgId) || (isTechnova ? INITIAL_OCCUPATIONS : [])
        const storedByCode = new Map(currentStored.map((o) => [o.code, o]))

          const mapped: OccupationRecord[] = data.map((item: {
            id?: string
            code?: string
            name?: string
            title?: string
            jobZone?: number
            description?: string
            status?: string
            assignedExperts?: Array<{ id: string; name?: string; email?: string; title?: string }>
            microSkillCount?: number
            moduleCount?: number
            roles?: Array<{ skillCount?: number }>
            interests?: RiasecProfile
            createdAt?: string
          }) => {
            const code = item.code || item.id || ''
            const localMatch = storedByCode.get(code)
            const initialMatch = isTechnova ? INITIAL_OCCUPATIONS.find((o) => o.code === code) : undefined

            // Preserve assigned experts: local user edits > initial assignments > backend
            const effectiveExperts =
              localMatch && localMatch.assignedExperts && localMatch.assignedExperts.length > 0
                ? localMatch.assignedExperts
                : initialMatch && initialMatch.assignedExperts && initialMatch.assignedExperts.length > 0
                ? initialMatch.assignedExperts
                : (item.assignedExperts || []).map((e) => ({
                    id: e.id,
                    name: e.name || e.id,
                    email: e.email || `${e.id}@technova.internal`,
                    title: e.title || 'Domain Specialist',
                  }))

            return {
              id: item.id || item.code || '',
              code,
              name: item.name || item.title || '',
              jobZone: item.jobZone || 4,
              description: item.description || localMatch?.description || initialMatch?.description || '',
              status: localMatch?.status || (String(item.status || 'ACTIVE').toLowerCase() === 'inactive' ? 'inactive' : 'active'),
              assignedExperts: effectiveExperts,
              microSkillCount: item.microSkillCount || (item.roles ? item.roles.reduce((acc: number, r) => acc + (r.skillCount || 0), 0) : 0),
              moduleCount: item.moduleCount || (item.roles ? item.roles.length * 3 : 0),
              interests: item.interests || localMatch?.interests || initialMatch?.interests || {
                realistic: 0.4,
                investigative: 0.8,
                artistic: 0.2,
                social: 0.2,
                enterprising: 0.3,
                conventional: 0.7,
              },
              createdAt: item.createdAt || localMatch?.createdAt || new Date().toISOString().split('T')[0],
            }
          })

          // Also keep any custom occupations created by the user that are not in the backend
          const backendCodes = new Set(mapped.map((m) => m.code))
          const customCreated = currentStored.filter((s) => !backendCodes.has(s.code))
          const merged = [...customCreated, ...mapped]

        setOccupations(merged)
        setStoredOccupations(orgId, merged)
        return
      }
    } catch (e) {
      console.warn('Failed to fetch live occupations:', e)
    }
  }, [orgId, isTechnova])

  React.useEffect(() => {
    fetchLiveOccupations()
  }, [fetchLiveOccupations])

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      fetchLiveOccupations()
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [fetchLiveOccupations])

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  // Create / Edit Occupation Modal
  const [isOccupationModalOpen, setIsOccupationModalOpen] = React.useState(false)
  const [editingOccupation, setEditingOccupation] = React.useState<OccupationRecord | null>(null)
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
  const [viewingDetailsOccupation, setViewingDetailsOccupation] = React.useState<OccupationRecord | null>(null)

  // Deactivate Confirmation Modal
  const [occupationToDeactivate, setOccupationToDeactivate] = React.useState<OccupationRecord | null>(null)

  // Assign Expert Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)
  const [selectedOccupationForAssign, setSelectedOccupationForAssign] = React.useState<OccupationRecord | null>(null)
  const [newlyAssignedIds, setNewlyAssignedIds] = React.useState<Set<string>>(new Set())
  const [assignedFilter, setAssignedFilter] = React.useState<'ALL' | 'NEW'>('ALL')
  const [selectedAvailableIds, setSelectedAvailableIds] = React.useState<Set<string>>(new Set())
  const [availableExpertSearch, setAvailableExpertSearch] = React.useState('')

  // Filtered List
  const filteredOccupations = React.useMemo(() => {
    return occupations
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
  }, [occupations, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOccupations.length / PAGE_SIZE))
  const paginatedOccupations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredOccupations.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredOccupations, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOccupation(null)
    setOccName('')
    setOccCode(`15-${(1250 + occupations.length + 1).toString().padStart(4, '0')}.00`)
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
    setIsOccupationModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (occ: OccupationRecord) => {
    setEditingOccupation(occ)
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
    setIsOccupationModalOpen(true)
  }

  // Save Occupation
  const handleSaveOccupation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!occName.trim() || !occCode.trim()) return

    const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)

    if (editingOccupation) {
      try {
        await updateOccupation(orgId, editingOccupation.id, {
          name: occName.trim(),
          code: occCode.trim().toUpperCase(),
          jobZone: occJobZone,
          interestRealistic: occInterests.realistic,
          interestInvestigative: occInterests.investigative,
          interestArtistic: occInterests.artistic,
          interestSocial: occInterests.social,
          interestEnterprising: occInterests.enterprising,
          interestConventional: occInterests.conventional,
        })
        setAndSaveOccupations((prev) =>
          prev.map((o) =>
            o.id === editingOccupation.id
              ? {
                  ...o,
                  name: occName.trim(),
                  code: occCode.trim().toUpperCase(),
                  jobZone: occJobZone,
                  description: occDescription.trim(),
                  interests: occInterests,
                }
              : o
          )
        )
        toast({
          title: 'Occupation Updated',
          description: `Successfully modified ${occName}.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        toast({
          title: 'Update Failed',
          description: err instanceof Error ? err.message : 'Failed to update occupation on server.',
          variant: 'destructive',
        })
        return
      }
    } else {
      const codeUpper = occCode.trim().toUpperCase()
      const newOcc: OccupationRecord = {
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
        await createOccupation(orgId, {
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
        setAndSaveOccupations((prev) => [newOcc, ...prev])
        toast({
          title: 'Occupation Created',
          description: `Added ${newOcc.name} (${newOcc.code}) to the occupation catalog.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        toast({
          title: 'Creation Failed',
          description: err instanceof Error ? err.message : 'Failed to save occupation.',
          variant: 'destructive',
        })
        return
      }
    }
    setIsOccupationModalOpen(false)
  }

  // Toggle Occupation Active Status
  const handleToggleStatus = async (occ: OccupationRecord) => {
    const nextStatus = occ.status === 'active' ? 'inactive' : 'active'
    const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)
    try {
      await updateOccupation(orgId, occ.id, {
        code: occ.code,
        name: occ.name,
        status: nextStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
      })
      setAndSaveOccupations((prev) =>
        prev.map((o) => (o.id === occ.id ? { ...o, status: nextStatus } : o))
      )
      toast({
        title: nextStatus === 'active' ? 'Occupation Activated' : 'Occupation Deactivated',
        description: `${occ.name} status updated to ${nextStatus}.`,
        variant: 'info',
      })
    } catch (err: unknown) {
      toast({
        title: 'Status Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update occupation status.',
        variant: 'destructive',
      })
    }
  }

  // Open Assign Expert Modal
  const handleOpenAssignExpert = (occ: OccupationRecord) => {
    setSelectedOccupationForAssign(occ)
    setNewlyAssignedIds(new Set())
    setSelectedAvailableIds(new Set())
    setAvailableExpertSearch('')
    setAssignedFilter('ALL')
    setIsAssignModalOpen(true)
  }

  // Active occupation instance in assign modal
  const activeOccupationInModal = React.useMemo(() => {
    if (!selectedOccupationForAssign) return null
    return occupations.find((o) => o.id === selectedOccupationForAssign.id) || selectedOccupationForAssign
  }, [occupations, selectedOccupationForAssign])

  const assignedExpertsInModal = activeOccupationInModal?.assignedExperts || []

  // Filter assigned experts in modal
  const displayedAssignedExperts = React.useMemo(() => {
    if (assignedFilter === 'NEW') {
      return assignedExpertsInModal.filter((e) => newlyAssignedIds.has(e.id))
    }
    return assignedExpertsInModal
  }, [assignedExpertsInModal, assignedFilter, newlyAssignedIds])

  // Available experts for this organization (synced with real workspace members)
  const [orgExperts, setOrgExperts] = React.useState<EligibleExpert[]>(() => getOrganizationExperts(orgId))

  React.useEffect(() => {
    let isMounted = true
    const loadOrgMembers = async () => {
      try {
        const members = await getMembers(orgId).catch(() => [])
        const expertMembers = (members || []).filter(
          (m) => m.active && (m.roles.includes("DOMAIN_EXPERT") || m.roles.includes("EXPERT"))
        )
        if (expertMembers.length > 0) {
          const mapped: EligibleExpert[] = expertMembers.map((m) => ({
            id: m.accountId,
            name: m.fullName || m.email,
            title: m.occupationName || m.departmentName || "Domain Expert",
            email: m.email,
          }))
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("adaptlearn_org_experts_" + orgId, JSON.stringify(mapped))
          }
          if (isMounted) {
            setOrgExperts(mapped)
          }
        } else {
          const fallback = getOrganizationExperts(orgId)
          if (isMounted) setOrgExperts(fallback)
        }
      } catch {
        const fallback = getOrganizationExperts(orgId)
        if (isMounted) setOrgExperts(fallback)
      }
    }
    loadOrgMembers()
    return () => { isMounted = false }
  }, [orgId])

  // Available experts not yet assigned to this occupation
  const availableExperts = React.useMemo(() => {
    const assignedIds = new Set(assignedExpertsInModal.map((ae) => normalizeExpertId(ae.id)))
    return orgExperts.filter((exp) => !assignedIds.has(normalizeExpertId(exp.id))).filter((exp) => {
      if (!availableExpertSearch.trim()) return true
      const q = availableExpertSearch.toLowerCase()
      return exp.name.toLowerCase().includes(q) || exp.title.toLowerCase().includes(q)
    })
  }, [orgExperts, assignedExpertsInModal, availableExpertSearch])

  // Toggle select all available
  const handleToggleSelectAllAvailable = () => {
    if (availableExperts.length === 0) return
    const allSelected = availableExperts.every((exp) => selectedAvailableIds.has(exp.id))
    if (allSelected) {
      setSelectedAvailableIds(new Set())
    } else {
      setSelectedAvailableIds(new Set(availableExperts.map((exp) => exp.id)))
    }
  }

  // Toggle individual available expert selection
  const handleToggleSelectAvailable = (id: string) => {
    setSelectedAvailableIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Add single expert
  const handleAddSingleExpert = (expert: EligibleExpert) => {
    if (!selectedOccupationForAssign) return
    setAndSaveOccupations((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOccupationForAssign.id) return o
        if (o.assignedExperts.some((ae) => normalizeExpertId(ae.id) === normalizeExpertId(expert.id))) return o
        return {
          ...o,
          assignedExperts: [
            ...o.assignedExperts,
            {
              id: expert.id,
              name: expert.name,
              email: expert.email || `${expert.id}@adaptlearn.internal`,
              title: expert.title,
            },
          ],
        }
      })
    )
    setNewlyAssignedIds((prev) => new Set([...prev, expert.id]))
    setSelectedAvailableIds((prev) => {
      const next = new Set(prev)
      next.delete(expert.id)
      return next
    })
    toast({
      title: 'Expert Assigned',
      description: `${expert.name} assigned to ${selectedOccupationForAssign.name}.`,
      variant: 'success',
    })
  }

  // Add selected experts
  const handleAddSelectedAvailable = () => {
    if (!selectedOccupationForAssign || selectedAvailableIds.size === 0) return
    const expertsToAdd = availableExperts.filter((exp) => selectedAvailableIds.has(exp.id))
    const newlyAdded = expertsToAdd.map((exp) => ({
      id: exp.id,
      name: exp.name,
      email: exp.email || `${exp.id}@adaptlearn.internal`,
      title: exp.title,
    }))

    setAndSaveOccupations((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOccupationForAssign.id) return o
        return {
          ...o,
          assignedExperts: [...o.assignedExperts, ...newlyAdded],
        }
      })
    )
    setNewlyAssignedIds((prev) => new Set([...prev, ...expertsToAdd.map((e) => e.id)]))
    setSelectedAvailableIds(new Set())
    toast({
      title: 'Selected Experts Assigned',
      description: `Added ${newlyAdded.length} expert(s) to ${selectedOccupationForAssign.name}.`,
      variant: 'success',
    })
  }

  // Remove Expert from Occupation
  const handleRemoveExpert = (occId: string, expertId: string, expertName: string) => {
    setAndSaveOccupations((prev) =>
      prev.map((o) => {
        if (o.id !== occId) return o
        return {
          ...o,
          assignedExperts: o.assignedExperts.filter((ae) => normalizeExpertId(ae.id) !== normalizeExpertId(expertId)),
        }
      })
    )
    setNewlyAssignedIds((prev) => {
      const next = new Set(prev)
      next.delete(expertId)
      return next
    })
    toast({
      title: 'Expert Removed',
      description: `Removed ${expertName} from occupation.`,
      variant: 'info',
    })
  }

  // Import handler
  const handleImportOccupations = (importedData: unknown, _source: 'preset' | 'custom') => {
    const rawList: unknown[] = Array.isArray(importedData)
      ? importedData
      : (typeof importedData === 'object' && importedData !== null && 'occupations' in importedData && Array.isArray((importedData as Record<string, unknown>).occupations))
      ? ((importedData as Record<string, unknown>).occupations as unknown[])
      : [importedData]

    const validOccupations: OccupationRecord[] = []
    for (const rawItem of rawList) {
      if (typeof rawItem !== 'object' || rawItem === null) continue
      const item = rawItem as Record<string, unknown>
      if (!item.name) continue
      validOccupations.push({
        id: String(item.id || `occ-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        code: String(item.code || `15-${(1250 + occupations.length + validOccupations.length + 1).toString().padStart(4, '0')}.00`),
        name: String(item.name).trim(),
        jobZone: Number(item.jobZone) || 4,
        description: String(item.description || 'Imported curricular occupation domain.'),
        status: item.status === 'inactive' ? 'inactive' : 'active',
        assignedExperts: Array.isArray(item.assignedExperts) ? (item.assignedExperts as OccupationRecord['assignedExperts']) : [],
        microSkillCount: Number(item.microSkillCount) || 0,
        moduleCount: Number(item.moduleCount) || 0,
        interests: (item.interests as OccupationRecord['interests']) || {
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

    if (validOccupations.length === 0) {
      toast({
        title: 'Import Failed',
        description: 'No valid occupation records found in the imported file.',
        variant: 'destructive',
      })
      return
    }

    setAndSaveOccupations((prev) => [...validOccupations, ...prev])
    toast({
      title: 'Occupations Imported',
      description: `Successfully imported ${validOccupations.length} occupation(s) into catalog.`,
      variant: 'success',
    })
    setIsImportModalOpen(false)
  }

  // Aggregate Metrics
  const totalOccupations = occupations.length
  const totalAssignedExperts = new Set(occupations.flatMap((o) => o.assignedExperts.map((ae) => ae.id))).size
  const totalMicroSkills = occupations.reduce((acc, o) => acc + o.microSkillCount, 0)
  const unassignedCount = occupations.filter((o) => o.assignedExperts.length === 0).length

  const activeCount = occupations.filter((o) => o.status === 'active').length
  const inactiveCount = occupations.filter((o) => o.status === 'inactive').length

  const newlyAssignedCount = assignedExpertsInModal.filter((e) => newlyAssignedIds.has(e.id)).length

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
            title="Occupations"
            value={`${totalOccupations} Occupations`}
            valueClassName="text-primary"
            description="Active industry classifications"
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-success" />}
            title="Active SMEs Assigned"
            value={`${totalAssignedExperts} Experts`}
            valueClassName="text-success"
            description="Guiding domain competencies"
          />

          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-warning" />}
            title="Micro-Skills Covered"
            value={`${totalMicroSkills} Skills`}
            valueClassName="text-warning"
            description="Across all occupations"
          />

          <StatCard
            variant="gradient"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            title="Unassigned Occupations"
            value={`${unassignedCount} Occupations`}
            valueClassName="text-destructive"
            description="Awaiting expert assignment"
          />
        </div>

        {/* OCCUPATIONS CATALOG TABLE CARD */}
        <Card className="border border-border shadow-xs overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Occupations Directory
                </CardTitle>
                <CardDescription>
                  Browse and govern knowledge domains, track SME coverage, and assign domain leads.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search occupations..."
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
                    <option value="ALL">All ({totalOccupations})</option>
                    <option value="active">Active ({activeCount})</option>
                    <option value="inactive">Inactive ({inactiveCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {occupations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <FolderTree className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No occupations created yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Import occupations from the O*NET catalog or create custom occupations to start structuring competency requirements.
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={() => setIsImportModalOpen(true)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Import from O*NET
                  </Button>
                </div>
              </div>
            ) : filteredOccupations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <FolderTree className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No occupations match your search criteria</p>
                <p className="text-xs text-muted-foreground/80">Try adjusting your keyword filter or status dropdown.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">CODE</th>
                      <th className="py-2.5 px-3">OCCUPATION &amp; SCOPE</th>
                      <th className="py-2.5 px-3 text-center">MICRO-SKILLS</th>
                      <th className="py-2.5 px-3 text-center">MODULES</th>
                      <th className="py-2.5 px-3">ASSIGNED EXPERTS</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedOccupations.map((occ) => (
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
                          {occ.assignedExperts.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {occ.assignedExperts[0].name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                  {occ.assignedExperts[0].name}
                                </span>
                              </div>

                              {occ.assignedExperts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignExpert(occ)}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-pointer hover:bg-secondary-hover transition-colors"
                                  title={`+${occ.assignedExperts.length - 1} more: ${occ.assignedExperts
                                    .slice(1)
                                    .map((e) => e.name)
                                    .join(', ')}`}
                                >
                                  +{occ.assignedExperts.length - 1}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                          )}
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
                              onClick={() => setViewingDetailsOccupation(occ)}
                              title="View Details & RIASEC"
                              aria-label="View Details & RIASEC"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>

                            {/* Assign Experts */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenAssignExpert(occ)}
                              title="Assign Experts"
                              aria-label="Assign Experts"
                            >
                              <UserPlus className="h-4 w-4 text-foreground" />
                            </Button>

                            {/* Edit Occupation */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(occ)}
                              title="Edit Occupation"
                              aria-label="Edit Occupation"
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
                                  setOccupationToDeactivate(occ)
                                } else {
                                  handleToggleStatus(occ)
                                }
                              }}
                              title={occ.status === 'active' ? 'Deactivate Occupation' : 'Activate Occupation'}
                              aria-label={occ.status === 'active' ? 'Deactivate Occupation' : 'Activate Occupation'}
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
        title="Import Occupations"
        entityName="Occupations"
        description="Select a curated occupation domain catalog or paste a JSON array of custom occupations."
        presets={OCCUPATION_PRESETS}
        onImport={handleImportOccupations}
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
      <Dialog open={!!viewingDetailsOccupation} onOpenChange={() => setViewingDetailsOccupation(null)} className="max-w-xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        {viewingDetailsOccupation && (
          <>
            <DialogHeader className="shrink-0 mb-3">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  {viewingDetailsOccupation.name}
                </DialogTitle>
                <Badge variant={viewingDetailsOccupation.status === 'active' ? 'success' : 'outline'}>
                  {viewingDetailsOccupation.status.toUpperCase()}
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
                  {viewingDetailsOccupation.description}
                </p>
              </div>

              {/* Coverage Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Micro-Skills</span>
                  <strong className="text-foreground text-sm font-semibold">{viewingDetailsOccupation.microSkillCount} Skills</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Instructional Modules</span>
                  <strong className="text-foreground text-sm font-semibold">{viewingDetailsOccupation.moduleCount} Modules</strong>
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
                        {((viewingDetailsOccupation.interests?.realistic || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.realistic || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Investigative */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Investigative (I) — Analytical / Problem-Solving</span>
                      <span className="font-mono font-bold text-primary">
                        {((viewingDetailsOccupation.interests?.investigative || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.investigative || 0) * 100} variant="primary" className="h-1.5" />
                  </div>

                  {/* Artistic */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Artistic (A) — Design / Expression</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsOccupation.interests?.artistic || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.artistic || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Social */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Social (S) — Support / Helping</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsOccupation.interests?.social || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.social || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Enterprising */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Enterprising (E) — Leadership / Persuasion</span>
                      <span className="font-mono font-bold text-foreground">
                        {((viewingDetailsOccupation.interests?.enterprising || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.enterprising || 0) * 100} className="h-1.5" />
                  </div>

                  {/* Conventional */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground font-medium">Conventional (C) — Structured Data / Rules</span>
                      <span className="font-mono font-bold text-primary">
                        {((viewingDetailsOccupation.interests?.conventional || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(viewingDetailsOccupation.interests?.conventional || 0) * 100} variant="primary" className="h-1.5" />
                  </div>
                </div>
              </div>

              {/* Assigned Experts List */}
              <div>
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Assigned Subject Matter Experts ({viewingDetailsOccupation.assignedExperts.length})
                </span>
                {viewingDetailsOccupation.assignedExperts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No experts assigned yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {viewingDetailsOccupation.assignedExperts.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-2 rounded-lg border border-border bg-background flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                            {exp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs">{exp.name}</div>
                            <div className="text-[11px] text-muted-foreground">{exp.title}</div>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{exp.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
              <Button
                variant={viewingDetailsOccupation.status === 'active' ? 'destructive' : 'outline'}
                size="sm"
                leftIcon={
                  viewingDetailsOccupation.status === 'active' ? (
                    <Power className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  )
                }
                onClick={() => {
                  const occ = viewingDetailsOccupation
                  setViewingDetailsOccupation(null)
                  if (occ.status === 'active') {
                    setOccupationToDeactivate(occ)
                  } else {
                    handleToggleStatus(occ)
                  }
                }}
              >
                {viewingDetailsOccupation.status === 'active' ? 'Deactivate Occupation' : 'Activate Occupation'}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingDetailsOccupation(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const occ = viewingDetailsOccupation
                    setViewingDetailsOccupation(null)
                    handleOpenEdit(occ)
                  }}
                >
                  Edit Occupation
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* CREATE / EDIT OCCUPATION MODAL (WITH RIASEC EDITING) */}
      <Dialog open={isOccupationModalOpen} onOpenChange={setIsOccupationModalOpen} className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 mb-3">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary shrink-0" />
              <span>{editingOccupation ? (occName || editingOccupation.name) : 'Create New Occupation'}</span>
            </DialogTitle>
            {editingOccupation ? (
              <Badge variant={editingOccupation.status === 'active' ? 'success' : 'outline'} className="font-bold text-xs">
                {editingOccupation.status.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
                NEW OCCUPATION
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {editingOccupation
              ? 'Update occupation details, career interest weights, and preparation requirements.'
              : 'Define an industry occupation to organize job roles, competencies, and skill pathways.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveOccupation} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 py-1 text-xs min-h-0">
            {/* Card 1: Taxonomy & Identification */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Industry Classification &amp; Identity
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Standard Occupation Code <span className="text-destructive">*</span>
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
                    Occupation Title <span className="text-destructive">*</span>
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

            {/* Card 2: Occupation Scope & Summary */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Occupation Scope &amp; Summary
              </span>
              <textarea
                className="w-full text-xs rounded-md border border-border bg-background p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[75px] shadow-2xs leading-relaxed"
                placeholder="Provide a comprehensive summary of this occupation and typical workplace duties..."
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
              onClick={() => setIsOccupationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingOccupation ? 'Save Changes' : 'Create Occupation'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      <Dialog open={!!occupationToDeactivate} onOpenChange={() => setOccupationToDeactivate(null)}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Occupation?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to suspend <strong className="text-foreground">{occupationToDeactivate?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        {occupationToDeactivate && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="font-semibold text-foreground">
                {occupationToDeactivate.name}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>{occupationToDeactivate.microSkillCount} Skills</span>
                <span>•</span>
                <span>{occupationToDeactivate.moduleCount} Modules</span>
                <span>•</span>
                <span>{occupationToDeactivate.assignedExperts.length} Assigned Experts</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-foreground">
                <strong className="text-destructive font-semibold">Operational Impact:</strong> Deactivating this occupation will suspend new module and pathway associations. Existing Subject Matter Expert assignments and historical learning data will be preserved.
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOccupationToDeactivate(null)}>
            Keep Active
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (occupationToDeactivate) {
                handleToggleStatus(occupationToDeactivate)
                setOccupationToDeactivate(null)
              }
            }}
            leftIcon={<Power className="h-3.5 w-3.5" />}
          >
            Deactivate Occupation
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ASSIGN EXPERTS MODAL (DUAL TABLE DESIGN WITH SELECTION, ADD ALL, AND NEW BADGE/FILTER) */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {activeOccupationInModal?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign and manage domain experts responsible for reviewing skills within this occupation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-3 max-h-[70vh] overflow-y-auto pr-1">
          {/* Table 1: Currently Assigned Experts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Currently Assigned Experts ({assignedExpertsInModal.length})
                </h3>
                {newlyAssignedCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/25 hover:bg-primary hover:text-white transition-colors"
                  >
                    +{newlyAssignedCount} Added This Session
                  </Badge>
                )}
              </div>

              {/* Filter: All vs New Only */}
              <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2 py-0.5 text-xs">
                <span className="text-[11px] text-muted-foreground font-medium">Filter:</span>
                <select
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value as 'ALL' | 'NEW')}
                  className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="ALL">All ({assignedExpertsInModal.length})</option>
                  <option value="NEW">New ({newlyAssignedCount})</option>
                </select>
              </div>
            </div>

            {displayedAssignedExperts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                {assignedFilter === 'NEW'
                  ? 'No newly added experts in this session. Add experts from the table below.'
                  : 'No experts currently assigned to this occupation. Use the table below to add experts.'}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2 px-3">Expert</th>
                      <th className="py-2 px-3">Professional Title</th>
                      <th className="py-2 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedAssignedExperts.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                              {exp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{exp.name}</span>
                                  {newlyAssignedIds.has(exp.id) && (
                                    <Badge
                                      variant="primary"
                                      className="bg-primary/10 text-primary text-[10px] font-bold py-0 px-1.5 border border-primary/25"
                                    >
                                      NEW
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">{exp.email}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {exp.title}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveExpert(activeOccupationInModal!.id, exp.id, exp.name)}
                            title={`Remove ${exp.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table 2: Available Experts to Add */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Available Experts to Add ({availableExperts.length})
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-44">
                  <Search className="absolute left-2.5 top-2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter available..."
                    value={availableExpertSearch}
                    onChange={(e) => setAvailableExpertSearch(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Add Selected Option */}
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                  onClick={handleAddSelectedAvailable}
                  disabled={selectedAvailableIds.size === 0}
                  className="text-xs h-7 font-semibold shadow-2xs"
                >
                  Add Selected{selectedAvailableIds.size > 0 ? ` (${selectedAvailableIds.size})` : ''}
                </Button>
              </div>
            </div>

            {availableExperts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                {orgExperts.length === assignedExpertsInModal.length
                  ? 'All eligible experts in the organization are already assigned to this occupation.'
                  : 'No available experts matching filter.'}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                    <tr className="border-b border-border text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={availableExperts.length > 0 && availableExperts.every((e) => selectedAvailableIds.has(e.id))}
                          onChange={handleToggleSelectAllAvailable}
                          className="rounded border-border accent-primary cursor-pointer h-3.5 w-3.5 mt-0.5"
                          title="Select / Unselect all available experts"
                        />
                      </th>
                      <th className="py-2 px-3">Expert</th>
                      <th className="py-2 px-3">Professional Title</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {availableExperts.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={selectedAvailableIds.has(exp.id)}
                            onChange={() => handleToggleSelectAvailable(exp.id)}
                            className="rounded border-border accent-primary cursor-pointer h-3.5 w-3.5 mt-0.5"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                              {exp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{exp.name}</div>
                              <div className="text-[11px] text-muted-foreground">{exp.email || `${exp.id}@adaptlearn.internal`}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {exp.title}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => handleAddSingleExpert(exp)}
                            className="text-xs h-7 px-2.5 font-semibold text-primary"
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="primary" size="sm" onClick={() => setIsAssignModalOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}
