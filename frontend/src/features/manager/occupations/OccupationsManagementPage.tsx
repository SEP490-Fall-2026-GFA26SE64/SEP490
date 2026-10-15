import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Edit3,
  Flame,
  Plus,
  Power,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
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
import { ELIGIBLE_EXPERTS } from '../data/ldManagerMockData'

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
  title: string
  email?: string
}

export interface OccupationRecord {
  id: string
  code: string // O*NET-SOC code, e.g. 15-1252.00
  name: string
  jobZone: number
  description: string
  status: 'active' | 'inactive'
  assignedExperts: AssignedExpert[]
  targetRoleCount: number
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
    description: 'Research, design, and develop computer and network software or specialized utility programs.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-wei',
        name: 'Chen Wei',
        email: 'chen.wei@adaptlearn.internal',
        title: 'Senior Knowledge Engineer',
      },
    ],
    targetRoleCount: 10,
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
    description: 'Design strategies for enterprise data models, knowledge graphs, multidimensional analytics, and security governance.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-chen',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@adaptlearn.internal',
        title: 'Lead Cognitive Scientist',
      },
      {
        id: 'expert-patel',
        name: 'Siddharth Patel',
        email: 'siddharth@internal',
        title: 'Graph Database Architect',
      },
    ],
    targetRoleCount: 10,
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
    description: 'Develop and execute automated test plans, regression suites, and verification pipelines to identify software issues.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-chen',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@adaptlearn.internal',
        title: 'Lead Cognitive Scientist',
      },
    ],
    targetRoleCount: 10,
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
    description: 'Design and conduct hardware or software engineering, systems specifications, cloud infrastructure, and distributed services.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-wei',
        name: 'Chen Wei',
        email: 'chen.wei@adaptlearn.internal',
        title: 'Senior Knowledge Engineer',
      },
    ],
    targetRoleCount: 10,
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
    description: 'Plan, implement, upgrade, or monitor security measures for the protection of computer networks and enterprise information assets.',
    status: 'active',
    assignedExperts: [],
    targetRoleCount: 8,
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
    id: 'preset-onet-core',
    name: 'O*NET 31.0 Technology Occupations Baseline',
    description: 'Includes Software Developers, Database Architects, and Information Security Analysts with calibrated RIASEC interest vectors.',
    badge: 'O*NET 31.0',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { code: '15-1252.00', name: 'Software Developers', jobZone: 4, targetRoleCount: 10, moduleCount: 24 },
        { code: '15-1243.00', name: 'Database Architects', jobZone: 4, targetRoleCount: 10, moduleCount: 18 },
        { code: '15-1212.00', name: 'Information Security Analysts', jobZone: 4, targetRoleCount: 8, moduleCount: 12 },
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
        description: 'Research, design, and develop computer and network software.',
        status: 'active' as const,
        assignedExperts: [],
        targetRoleCount: 10,
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
        description: 'Design enterprise data architectures and multidimensional graph schemas.',
        status: 'active' as const,
        assignedExperts: [],
        targetRoleCount: 10,
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
        description: 'Protect computer networks and information security assets.',
        status: 'active' as const,
        assignedExperts: [],
        targetRoleCount: 8,
        microSkillCount: 12,
        moduleCount: 12,
        interests: { realistic: 0.427, investigative: 0.733, artistic: 0.057, social: 0.185, enterprising: 0.308, conventional: 0.847 },
        createdAt: new Date().toISOString().split('T')[0],
      },
    ],
  },
]

const PAGE_SIZE = 8

export function OccupationsManagementPage() {
  const { toast } = useToast()

  const [occupations, setOccupations] = React.useState<OccupationRecord[]>(INITIAL_OCCUPATIONS)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  // Create / Edit Occupation Modal
  const [isOccupationModalOpen, setIsOccupationModalOpen] = React.useState(false)
  const [editingOccupation, setEditingOccupation] = React.useState<OccupationRecord | null>(null)
  const [occName, setOccName] = React.useState('')
  const [occCode, setOccCode] = React.useState('')
  const [occJobZone, setOccJobZone] = React.useState(4)
  const [occDescription, setOccDescription] = React.useState('')

  // Deactivate Confirmation Modal
  const [occupationToDeactivate, setOccupationToDeactivate] = React.useState<OccupationRecord | null>(null)

  // Assign Expert Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)
  const [selectedOccupationForAssign, setSelectedOccupationForAssign] = React.useState<OccupationRecord | null>(null)
  const [newlyAssignedIds, setNewlyAssignedIds] = React.useState<Set<string>>(new Set())

  // Delete Confirmation Modal
  const [occupationToDelete, setOccupationToDelete] = React.useState<OccupationRecord | null>(null)

  // Filter occupations
  const filteredOccupations = React.useMemo(() => {
    return occupations.filter((o) => {
      const matchesSearch =
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [occupations, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOccupations.length / PAGE_SIZE))
  const paginatedOccupations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredOccupations.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredOccupations, currentPage])

  // KPI Calculations
  const totalCount = occupations.length
  const activeCount = occupations.filter((o) => o.status === 'active').length
  const totalAssignedExperts = Array.from(
    new Set(occupations.flatMap((o) => o.assignedExperts.map((e) => e.id)))
  ).length
  const totalRoles = occupations.reduce((sum, o) => sum + o.targetRoleCount, 0)

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOccupation(null)
    setOccName('')
    setOccCode(`15-${(1250 + occupations.length + 1).toString().padStart(4, '0')}.00`)
    setOccJobZone(4)
    setOccDescription('')
    setIsOccupationModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (occ: OccupationRecord) => {
    setEditingOccupation(occ)
    setOccName(occ.name)
    setOccCode(occ.code)
    setOccJobZone(occ.jobZone)
    setOccDescription(occ.description)
    setIsOccupationModalOpen(true)
  }

  // Save Occupation
  const handleSaveOccupation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!occName.trim() || !occCode.trim()) return

    if (editingOccupation) {
      setOccupations((prev) =>
        prev.map((o) =>
          o.id === editingOccupation.id
            ? { ...o, name: occName, code: occCode, jobZone: occJobZone, description: occDescription }
            : o
        )
      )
      toast({
        title: 'Occupation Updated',
        description: `Successfully updated ${occName} (${occCode}).`,
      })
    } else {
      const newOcc: OccupationRecord = {
        id: `occ-${Date.now()}`,
        code: occCode,
        name: occName,
        jobZone: occJobZone,
        description: occDescription,
        status: 'active',
        assignedExperts: [],
        targetRoleCount: 0,
        microSkillCount: 0,
        moduleCount: 0,
        interests: { realistic: 0.4, investigative: 0.7, artistic: 0.2, social: 0.2, enterprising: 0.25, conventional: 0.75 },
        createdAt: new Date().toISOString().split('T')[0],
      }
      setOccupations((prev) => [newOcc, ...prev])
      toast({
        title: 'Occupation Created',
        description: `Created new occupation ${occName} (${occCode}).`,
      })
    }
    setIsOccupationModalOpen(false)
  }

  // Toggle Occupation Active Status
  const handleToggleStatus = (occ: OccupationRecord) => {
    const nextStatus = occ.status === 'active' ? 'inactive' : 'active'
    setOccupations((prev) =>
      prev.map((o) => (o.id === occ.id ? { ...o, status: nextStatus } : o))
    )
    toast({
      title: nextStatus === 'active' ? 'Occupation Activated' : 'Occupation Deactivated',
      description: `${occ.name} is now ${nextStatus.toUpperCase()}.`,
    })
  }

  // Open Assign Expert Modal
  const handleOpenAssignExpert = (occ: OccupationRecord) => {
    setSelectedOccupationForAssign(occ)
    setNewlyAssignedIds(new Set(occ.assignedExperts.map((e) => e.id)))
    setIsAssignModalOpen(true)
  }

  // Save Assigned Experts
  const handleSaveAssignedExperts = () => {
    if (!selectedOccupationForAssign) return
    const updatedExperts: AssignedExpert[] = ELIGIBLE_EXPERTS
      .filter((e) => newlyAssignedIds.has(e.id))
      .map((e) => ({
        id: e.id,
        name: e.name,
        title: e.title,
        email: `${e.id}@adaptlearn.internal`,
      }))

    setOccupations((prev) =>
      prev.map((o) =>
        o.id === selectedOccupationForAssign.id
          ? { ...o, assignedExperts: updatedExperts }
          : o
      )
    )
    toast({
      title: 'Expert Assignments Updated',
      description: `Assigned ${updatedExperts.length} expert(s) to ${selectedOccupationForAssign.name}.`,
    })
    setIsAssignModalOpen(false)
  }

  // Active occupation instance for assign modal
  const activeOccupationInModal = React.useMemo(() => {
    if (!selectedOccupationForAssign) return null
    return occupations.find((o) => o.id === selectedOccupationForAssign.id) || null
  }, [selectedOccupationForAssign, occupations])

  // Delete Occupation
  const handleDeleteOccupation = () => {
    if (!occupationToDelete) return
    setOccupations((prev) => prev.filter((o) => o.id !== occupationToDelete.id))
    toast({
      title: 'Occupation Removed',
      description: `Deleted ${occupationToDelete.name} from catalog.`,
    })
    setOccupationToDelete(null)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Page Header */}
        <PageHeader
          title="Occupations & Domain Governance"
          description="Manage O*NET-SOC occupation standards, RIASEC interest profiles, and assign Subject Matter Experts to lead competency taxonomies."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(true)}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Import Presets
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenCreate}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Occupation
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Occupations"
            value={totalCount}
            description="O*NET 31.0 career groups"
            icon={<Briefcase className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Active Catalog"
            value={activeCount}
            description="Currently published"
            icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          />
          <StatCard
            title="Assigned Experts"
            value={totalAssignedExperts}
            description="Subject matter leads"
            icon={<Users className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Governed Target Roles"
            value={totalRoles}
            description="Reported job titles linked"
            icon={<Flame className="h-5 w-5 text-primary" />}
          />
        </div>

        {/* Main Content Card */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Governed Occupations Directory
              </CardTitle>
              <CardDescription>
                Browse O*NET-SOC occupations, RIASEC interest vectors, and configure Expert ownership.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter occupations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')
                    setCurrentPage(1)
                  }}
                  aria-label="Filter by Status"
                  className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="ALL">All Statuses ({occupations.length})</option>
                  <option value="active">Active ({activeCount})</option>
                  <option value="inactive">Inactive ({totalCount - activeCount})</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">O*NET-SOC</th>
                    <th className="py-3 px-4">Occupation Name &amp; Scope</th>
                    <th className="py-3 px-4">RIASEC Profile</th>
                    <th className="py-3 px-4">Assigned Experts</th>
                    <th className="py-3 px-4 text-center">Coverage</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedOccupations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                          <p className="text-xs">No occupations match your criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOccupations.map((occ) => (
                      <tr key={occ.id} className="hover:bg-muted/20 transition-colors">
                        {/* Code & Job Zone */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-foreground text-xs">{occ.code}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Job Zone {occ.jobZone}
                          </div>
                        </td>

                        {/* Name & Scope */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div className="font-semibold text-foreground text-xs">{occ.name}</div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {occ.description}
                          </p>
                        </td>

                        {/* RIASEC Profile */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1 flex-wrap text-[10.5px]">
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono font-medium border border-border" title={`Realistic: ${(occ.interests.realistic * 100).toFixed(0)}%`}>
                              R: {(occ.interests.realistic * 100).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold border border-primary/20" title={`Investigative: ${(occ.interests.investigative * 100).toFixed(0)}%`}>
                              I: {(occ.interests.investigative * 100).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono font-medium border border-border" title={`Artistic: ${(occ.interests.artistic * 100).toFixed(0)}%`}>
                              A: {(occ.interests.artistic * 100).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono font-medium border border-border" title={`Social: ${(occ.interests.social * 100).toFixed(0)}%`}>
                              S: {(occ.interests.social * 100).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono font-medium border border-border" title={`Enterprising: ${(occ.interests.enterprising * 100).toFixed(0)}%`}>
                              E: {(occ.interests.enterprising * 100).toFixed(0)}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-secondary text-primary font-mono font-bold border border-primary/30" title={`Conventional: ${(occ.interests.conventional * 100).toFixed(0)}%`}>
                              C: {(occ.interests.conventional * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        {/* Assigned Experts */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            {occ.assignedExperts.length === 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAssignExpert(occ)}
                                className="h-6 text-[10.5px] px-2 py-0 border-dashed text-muted-foreground hover:text-foreground"
                                leftIcon={<UserPlus className="h-3 w-3" />}
                              >
                                Assign Expert
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {occ.assignedExperts.map((exp) => (
                                  <div
                                    key={exp.id}
                                    className="flex items-center gap-1.5 text-[11px] text-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/60"
                                  >
                                    <div className="h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                                      {exp.name.charAt(0)}
                                    </div>
                                    <span className="truncate max-w-[130px]" title={`${exp.name} (${exp.title})`}>
                                      {exp.name}
                                    </span>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignExpert(occ)}
                                  className="text-[10.5px] text-primary hover:underline font-medium text-left mt-0.5 flex items-center gap-1"
                                >
                                  <UserPlus className="h-3 w-3" />
                                  Manage ({occ.assignedExperts.length})
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Coverage Counts (Roles & Modules) */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="font-semibold text-foreground text-xs">
                            {occ.targetRoleCount} Roles
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {occ.microSkillCount} Skills • {occ.moduleCount} Modules
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <Badge
                            variant={occ.status === 'active' ? 'success' : 'outline'}
                            className="text-[10px] font-semibold uppercase tracking-wider"
                          >
                            {occ.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(occ)}
                              className="h-7 w-7 p-0"
                              title="Edit Occupation"
                              aria-label="Edit Occupation"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (occ.status === 'active') {
                                  setOccupationToDeactivate(occ)
                                } else {
                                  handleToggleStatus(occ)
                                }
                              }}
                              className="h-7 w-7 p-0"
                              title={occ.status === 'active' ? 'Deactivate Occupation' : 'Activate Occupation'}
                              aria-label={occ.status === 'active' ? 'Deactivate Occupation' : 'Activate Occupation'}
                            >
                              <Power
                                className={`h-3.5 w-3.5 ${
                                  occ.status === 'active'
                                    ? 'text-muted-foreground hover:text-destructive'
                                    : 'text-muted-foreground hover:text-success'
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOccupationToDelete(occ)}
                              className="h-7 w-7 p-0"
                              title="Delete Occupation"
                              aria-label="Delete Occupation"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredOccupations.length > 0 && (
              <div className="p-4 border-t border-border">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredOccupations.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal 1: Create / Edit Occupation */}
        <Dialog open={isOccupationModalOpen} onOpenChange={setIsOccupationModalOpen}>
          <form onSubmit={handleSaveOccupation} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                {editingOccupation ? 'Edit O*NET Occupation' : 'Add New O*NET Occupation'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingOccupation
                  ? 'Update occupation classification code, scope, and Job Zone.'
                  : 'Define a new occupation entity following O*NET-SOC standard taxonomies.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="occ-name" className="font-semibold text-foreground">
                    Occupation Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="occ-name"
                    placeholder="e.g. Software Developers"
                    value={occName}
                    onChange={(e) => setOccName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="occ-code" className="font-semibold text-foreground">
                    O*NET-SOC Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="occ-code"
                    placeholder="e.g. 15-1252.00"
                    value={occCode}
                    onChange={(e) => setOccCode(e.target.value)}
                    required
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="occ-jobzone" className="font-semibold text-foreground">
                    Job Zone (1–5)
                  </label>
                  <Input
                    id="occ-jobzone"
                    type="number"
                    min={1}
                    max={5}
                    value={occJobZone}
                    onChange={(e) => setOccJobZone(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2 text-[11px] text-muted-foreground flex items-center pt-5">
                  Job Zone 4 represents High Preparation (Bachelor's degree, considerable work experience).
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="occ-description" className="font-semibold text-foreground">
                  Scope &amp; Occupational Summary
                </label>
                <textarea
                  id="occ-description"
                  rows={3}
                  placeholder="Detail the technical responsibilities and domain coverage..."
                  value={occDescription}
                  onChange={(e) => setOccDescription(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
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

        {/* Modal 2: Assign Experts Modal */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          {activeOccupationInModal && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Assign Experts to {activeOccupationInModal.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Assigned Subject Matter Experts can author micro-skills, define Level requirements, and submit learning modules for governance.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {ELIGIBLE_EXPERTS.map((expert) => {
                  const isAssigned = newlyAssignedIds.has(expert.id)
                  return (
                    <div
                      key={expert.id}
                      onClick={() => {
                        const next = new Set(newlyAssignedIds)
                        if (isAssigned) {
                          next.delete(expert.id)
                        } else {
                          next.add(expert.id)
                        }
                        setNewlyAssignedIds(next)
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isAssigned
                          ? 'border-primary/40 bg-secondary/30 text-foreground'
                          : 'border-border bg-background hover:bg-muted/30 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAssigned
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {expert.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            {expert.name}
                            {isAssigned && (
                              <Badge variant="primary" className="text-[9px] px-1.5 py-0">
                                Assigned
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{expert.title}</div>
                          <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                            {expert.id}@adaptlearn.internal
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAssigned ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <UserCheck className="h-4 w-4" />
                            Assigned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" />
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveAssignedExperts}>
                  Save Assignments ({newlyAssignedIds.size})
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* Modal 3: Deactivate Confirmation Modal */}
        <Dialog open={!!occupationToDeactivate} onOpenChange={() => setOccupationToDeactivate(null)}>
          {occupationToDeactivate && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Deactivate Occupation: {occupationToDeactivate.name}?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  This action changes the catalog status to INACTIVE.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                  <div className="font-semibold text-foreground">
                    {occupationToDeactivate.name} ({occupationToDeactivate.code})
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{occupationToDeactivate.targetRoleCount} Target Roles</span>
                    <span>•</span>
                    <span>{occupationToDeactivate.moduleCount} Modules</span>
                    <span>•</span>
                    <span>{occupationToDeactivate.assignedExperts.length} Assigned Experts</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <div className="text-[11.5px] leading-relaxed text-foreground">
                    <strong className="text-destructive font-semibold">Curricular Impact:</strong> Deactivating this occupation will suspend new module, target role, and pathway associations. Existing Subject Matter Expert assignments and historical learning data will be preserved.
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOccupationToDeactivate(null)}
                >
                  Keep Active
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleToggleStatus(occupationToDeactivate)
                    setOccupationToDeactivate(null)
                  }}
                  leftIcon={<Power className="h-3.5 w-3.5" />}
                >
                  Confirm Deactivation
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* Modal 4: Delete Confirmation Modal */}
        <Dialog open={!!occupationToDelete} onOpenChange={() => setOccupationToDelete(null)}>
          {occupationToDelete && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Delete Occupation: {occupationToDelete.name}?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Are you sure you want to permanently delete this occupation record? This cannot be undone if target roles or skills are linked.
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-xs">
                <p className="font-mono text-xs font-semibold text-foreground">
                  {occupationToDelete.code} • {occupationToDelete.name}
                </p>
                <p className="text-muted-foreground mt-1 text-[11.5px]">
                  Governing {occupationToDelete.targetRoleCount} target roles and {occupationToDelete.moduleCount} modules.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setOccupationToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteOccupation}>
                  Permanently Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* Quick Config Import Modal */}
        <QuickConfigImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          title="Import O*NET 31.0 Occupations"
          entityName="Occupations"
          description="Load standard occupational profiles with calibrated RIASEC interest vectors into your enterprise catalog."
          presets={OCCUPATION_PRESETS}
          onImport={(importedItems: any) => {
            setOccupations((prev) => {
              const existingCodes = new Set(prev.map((o) => o.code))
              const newItems = (importedItems || []).filter((item: OccupationRecord) => !existingCodes.has(item.code))
              return [...newItems, ...prev]
            })
            toast({
              title: 'Occupations Imported',
              description: `Successfully imported ${importedItems?.length || 0} O*NET occupations.`,
            })
          }}
        />
      </div>
    </WorkspaceLayout>
  )
}
