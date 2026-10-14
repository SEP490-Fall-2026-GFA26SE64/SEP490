import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Edit3,
  FolderTree,
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

export interface DisciplineRecord {
  id: string
  code: string
  name: string
  description: string
  status: 'active' | 'inactive'
  assignedExperts: {
    id: string
    name: string
    email: string
    title: string
  }[]
  microSkillCount: number
  moduleCount: number
  createdAt: string
}

const INITIAL_DISCIPLINES: DisciplineRecord[] = [
  {
    id: 'disc-ai',
    code: 'DISC-AI',
    name: 'Cognitive Architecture & Machine Learning',
    description: 'Deep neural networks, cognitive graphs, transformer reasoning, and knowledge representations.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-chen',
        name: 'Dr. Sarah Chen',
        email: 'sarah.chen@adaptlearn.internal',
        title: 'Lead Cognitive Scientist',
      },
    ],
    microSkillCount: 18,
    moduleCount: 6,
    createdAt: '2026-08-15',
  },
  {
    id: 'disc-se',
    code: 'DISC-SE',
    name: 'Software Engineering & Cloud Architecture',
    description: 'Enterprise backend systems, clean hexagonal microservices, outbox patterns, and high-concurrency event loops.',
    status: 'active',
    assignedExperts: [
      {
        id: 'expert-wei',
        name: 'Chen Wei',
        email: 'chen.wei@adaptlearn.internal',
        title: 'Senior Knowledge Engineer',
      },
    ],
    microSkillCount: 24,
    moduleCount: 8,
    createdAt: '2026-08-20',
  },
  {
    id: 'disc-ds',
    code: 'DISC-DS',
    name: 'Data Engineering & Graph Analytics',
    description: 'Neo4j Cypher optimization, transactional knowledge graphs, graph neural networks, and semantic ontologies.',
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
    microSkillCount: 15,
    moduleCount: 5,
    createdAt: '2026-09-01',
  },
  {
    id: 'disc-sec',
    code: 'DISC-SEC',
    name: 'Enterprise Security & Governance',
    description: 'Zero-trust architecture, cryptographic identity models, and enterprise AI compliance frameworks.',
    status: 'active',
    assignedExperts: [],
    microSkillCount: 9,
    moduleCount: 3,
    createdAt: '2026-09-10',
  },
]

const DISCIPLINE_PRESETS: ImportPreset[] = [
  {
    id: 'preset-standard-tech',
    name: 'Standard Technology Disciplines',
    description: 'Includes Cloud Architecture, AI/ML Systems, and Security Engineering domains.',
    badge: 'Technology',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { code: 'DISC-CLOUD', name: 'Cloud Platform & Infrastructure', microSkillCount: 16, moduleCount: 4 },
        { code: 'DISC-AIML', name: 'Applied Machine Learning & Neural Systems', microSkillCount: 22, moduleCount: 6 },
        { code: 'DISC-SECGOV', name: 'Information Security & Compliance', microSkillCount: 12, moduleCount: 3 },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `disc-imp-${Date.now()}-1`,
        code: 'DISC-CLOUD',
        name: 'Cloud Platform & Infrastructure Engineering',
        description: 'Scalable multi-cloud patterns, Kubernetes orchestration, infrastructure-as-code, and resilience.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 16,
        moduleCount: 4,
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `disc-imp-${Date.now()}-2`,
        code: 'DISC-AIML',
        name: 'Applied Machine Learning & Neural Systems',
        description: 'Deep neural networks, LLM orchestration, model training pipelines, and feature stores.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 22,
        moduleCount: 6,
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `disc-imp-${Date.now()}-3`,
        code: 'DISC-SECGOV',
        name: 'Information Security & Compliance Engineering',
        description: 'Zero-trust architecture, regulatory compliance, penetration auditing, and cryptography.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 12,
        moduleCount: 3,
        createdAt: new Date().toISOString().split('T')[0],
      },
    ],
  },
  {
    id: 'preset-data-graph',
    name: 'Data & Knowledge Architecture Disciplines',
    description: 'Includes Data Engineering, Graph Analytics, and Semantic Ontologies.',
    badge: 'Data & Graph',
    itemCount: 2,
    previewSnippet: JSON.stringify(
      [
        { code: 'DISC-DATA', name: 'Modern Data Engineering & Lakehouses', microSkillCount: 18, moduleCount: 5 },
        { code: 'DISC-KGRAPH', name: 'Enterprise Knowledge Graphs & Ontologies', microSkillCount: 14, moduleCount: 4 },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `disc-imp-${Date.now()}-4`,
        code: 'DISC-DATA',
        name: 'Modern Data Engineering & Lakehouses',
        description: 'Batch and real-time streaming pipelines, dbt modeling, and distributed storage engines.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 18,
        moduleCount: 5,
        createdAt: new Date().toISOString().split('T')[0],
      },
      {
        id: `disc-imp-${Date.now()}-5`,
        code: 'DISC-KGRAPH',
        name: 'Enterprise Knowledge Graphs & Semantic Ontologies',
        description: 'Neo4j graph schemas, OWL/RDF ontologies, Cypher query optimization, and vector-graph hybrids.',
        status: 'active' as const,
        assignedExperts: [],
        microSkillCount: 14,
        moduleCount: 4,
        createdAt: new Date().toISOString().split('T')[0],
      },
    ],
  },
]

const PAGE_SIZE = 8

export function DisciplinesManagementPage() {
  const { toast } = useToast()

  const [disciplines, setDisciplines] = React.useState<DisciplineRecord[]>(INITIAL_DISCIPLINES)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  // Create / Edit Discipline Modal
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = React.useState(false)
  const [editingDiscipline, setEditingDiscipline] = React.useState<DisciplineRecord | null>(null)
  const [discName, setDiscName] = React.useState('')
  const [discCode, setDiscCode] = React.useState('')
  const [discDescription, setDiscDescription] = React.useState('')

  // Deactivate Confirmation Modal
  const [disciplineToDeactivate, setDisciplineToDeactivate] = React.useState<DisciplineRecord | null>(null)

  // Assign Expert Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)
  const [selectedDisciplineForAssign, setSelectedDisciplineForAssign] = React.useState<DisciplineRecord | null>(null)
  const [newlyAssignedIds, setNewlyAssignedIds] = React.useState<Set<string>>(new Set())
  const [assignedFilter, setAssignedFilter] = React.useState<'ALL' | 'NEW'>('ALL')
  const [selectedAvailableIds, setSelectedAvailableIds] = React.useState<Set<string>>(new Set())
  const [availableExpertSearch, setAvailableExpertSearch] = React.useState('')

  // Filtered List
  const filteredDisciplines = React.useMemo(() => {
    return disciplines.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [disciplines, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDisciplines.length / PAGE_SIZE))
  const paginatedDisciplines = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredDisciplines.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredDisciplines, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDiscipline(null)
    setDiscName('')
    setDiscCode(`DISC-${(disciplines.length + 1).toString().padStart(2, '0')}`)
    setDiscDescription('')
    setIsDisciplineModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (disc: DisciplineRecord) => {
    setEditingDiscipline(disc)
    setDiscName(disc.name)
    setDiscCode(disc.code)
    setDiscDescription(disc.description)
    setIsDisciplineModalOpen(true)
  }

  // Save Discipline
  const handleSaveDiscipline = (e: React.FormEvent) => {
    e.preventDefault()
    if (!discName.trim() || !discCode.trim()) return

    if (editingDiscipline) {
      setDisciplines((prev) =>
        prev.map((d) =>
          d.id === editingDiscipline.id
            ? { ...d, name: discName.trim(), code: discCode.trim().toUpperCase(), description: discDescription.trim() }
            : d
        )
      )
      toast({
        title: 'Discipline Updated',
        description: `Successfully modified ${discName}.`,
        variant: 'success',
      })
    } else {
      const newDisc: DisciplineRecord = {
        id: `disc-${Date.now()}`,
        code: discCode.trim().toUpperCase(),
        name: discName.trim(),
        description: discDescription.trim(),
        status: 'active',
        assignedExperts: [],
        microSkillCount: 0,
        moduleCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setDisciplines((prev) => [newDisc, ...prev])
      toast({
        title: 'Discipline Created',
        description: `Added ${newDisc.name} (${newDisc.code}) to catalog.`,
        variant: 'success',
      })
    }
    setIsDisciplineModalOpen(false)
  }

  // Toggle Discipline Active Status
  const handleToggleStatus = (disc: DisciplineRecord) => {
    const nextStatus = disc.status === 'active' ? 'inactive' : 'active'
    setDisciplines((prev) =>
      prev.map((d) => (d.id === disc.id ? { ...d, status: nextStatus } : d))
    )
    toast({
      title: nextStatus === 'active' ? 'Discipline Activated' : 'Discipline Deactivated',
      description: `${disc.name} is now ${nextStatus.toUpperCase()}.`,
      variant: 'info',
    })
  }

  // Open Assign Expert Modal
  const handleOpenAssignExpert = (disc: DisciplineRecord) => {
    setSelectedDisciplineForAssign(disc)
    setNewlyAssignedIds(new Set())
    setSelectedAvailableIds(new Set())
    setAvailableExpertSearch('')
    setAssignedFilter('ALL')
    setIsAssignModalOpen(true)
  }

  // Active discipline instance for assign modal
  const activeDisciplineInModal = React.useMemo(() => {
    if (!selectedDisciplineForAssign) return null
    return disciplines.find((d) => d.id === selectedDisciplineForAssign.id) || selectedDisciplineForAssign
  }, [disciplines, selectedDisciplineForAssign])

  // Current assigned experts in active discipline
  const assignedExpertsInModal = React.useMemo(() => {
    return activeDisciplineInModal?.assignedExperts || []
  }, [activeDisciplineInModal])

  // Displayed assigned experts with "NEW" filter support
  const displayedAssignedExperts = React.useMemo(() => {
    if (assignedFilter === 'NEW') {
      return assignedExpertsInModal.filter((exp) => newlyAssignedIds.has(exp.id))
    }
    return assignedExpertsInModal
  }, [assignedExpertsInModal, assignedFilter, newlyAssignedIds])

  // Available experts not yet assigned to this discipline
  const availableExperts = React.useMemo(() => {
    const assignedIds = new Set(assignedExpertsInModal.map((ae) => ae.id))
    return ELIGIBLE_EXPERTS.filter((exp) => !assignedIds.has(exp.id)).filter((exp) => {
      if (!availableExpertSearch.trim()) return true
      const q = availableExpertSearch.toLowerCase()
      return exp.name.toLowerCase().includes(q) || exp.title.toLowerCase().includes(q)
    })
  }, [assignedExpertsInModal, availableExpertSearch])

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
  const handleAddSingleExpert = (expert: (typeof ELIGIBLE_EXPERTS)[number]) => {
    if (!selectedDisciplineForAssign) return
    setDisciplines((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDisciplineForAssign.id) return d
        if (d.assignedExperts.some((ae) => ae.id === expert.id)) return d
        return {
          ...d,
          assignedExperts: [
            ...d.assignedExperts,
            {
              id: expert.id,
              name: expert.name,
              email: `${expert.id}@adaptlearn.internal`,
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
      description: `${expert.name} assigned to ${selectedDisciplineForAssign.name}.`,
      variant: 'success',
    })
  }

  // Add selected experts
  const handleAddSelectedAvailable = () => {
    if (!selectedDisciplineForAssign || selectedAvailableIds.size === 0) return
    const expertsToAdd = availableExperts.filter((exp) => selectedAvailableIds.has(exp.id))
    const newlyAdded = expertsToAdd.map((exp) => ({
      id: exp.id,
      name: exp.name,
      email: `${exp.id}@adaptlearn.internal`,
      title: exp.title,
    }))

    setDisciplines((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDisciplineForAssign.id) return d
        return {
          ...d,
          assignedExperts: [...d.assignedExperts, ...newlyAdded],
        }
      })
    )
    setNewlyAssignedIds((prev) => new Set([...prev, ...expertsToAdd.map((e) => e.id)]))
    setSelectedAvailableIds(new Set())
    toast({
      title: 'Selected Experts Assigned',
      description: `Added ${newlyAdded.length} expert(s) to ${selectedDisciplineForAssign.name}.`,
      variant: 'success',
    })
  }

  // Remove Expert from Discipline
  const handleRemoveExpert = (discId: string, expertId: string, expertName: string) => {
    setDisciplines((prev) =>
      prev.map((d) => {
        if (d.id !== discId) return d
        return {
          ...d,
          assignedExperts: d.assignedExperts.filter((ae) => ae.id !== expertId),
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
      description: `Removed ${expertName} from discipline.`,
      variant: 'info',
    })
  }

  // Import handler
  const handleImportDisciplines = (importedData: any, _source: 'preset' | 'custom') => {
    const rawList = Array.isArray(importedData)
      ? importedData
      : Array.isArray(importedData?.disciplines)
      ? importedData.disciplines
      : [importedData]

    const validDisciplines: DisciplineRecord[] = []
    for (const item of rawList) {
      if (!item || !item.name) continue
      validDisciplines.push({
        id: item.id || `disc-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code: item.code || `DISC-${(disciplines.length + validDisciplines.length + 1).toString().padStart(2, '0')}`,
        name: String(item.name).trim(),
        description: item.description || 'Imported curricular discipline domain.',
        status: item.status === 'inactive' ? 'inactive' : 'active',
        assignedExperts: Array.isArray(item.assignedExperts) ? item.assignedExperts : [],
        microSkillCount: Number(item.microSkillCount) || 0,
        moduleCount: Number(item.moduleCount) || 0,
        createdAt: item.createdAt || new Date().toISOString().split('T')[0],
      })
    }

    if (validDisciplines.length === 0) {
      toast({
        title: 'Import Failed',
        description: 'No valid discipline records found in import payload.',
        variant: 'destructive',
      })
      return
    }

    setDisciplines((prev) => [...validDisciplines, ...prev])
    toast({
      title: 'Disciplines Imported',
      description: `Successfully imported ${validDisciplines.length} discipline(s) into catalog.`,
      variant: 'success',
    })
    setIsImportModalOpen(false)
  }

  // Aggregate Metrics
  const totalDisciplines = disciplines.length
  const totalAssignedExperts = new Set(disciplines.flatMap((d) => d.assignedExperts.map((ae) => ae.id))).size
  const totalMicroSkills = disciplines.reduce((acc, d) => acc + d.microSkillCount, 0)
  const unassignedCount = disciplines.filter((d) => d.assignedExperts.length === 0).length

  const activeCount = disciplines.filter((d) => d.status === 'active').length
  const inactiveCount = disciplines.filter((d) => d.status === 'inactive').length

  const newlyAssignedCount = assignedExpertsInModal.filter((e) => newlyAssignedIds.has(e.id)).length

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar (Styled identical to Target Roles) */}
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
            title="Disciplines"
            value={`${totalDisciplines} Disciplines`}
            valueClassName="text-primary"
            description="Knowledge domains in catalog"
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-success" />}
            title="Active SMEs Assigned"
            value={`${totalAssignedExperts} Experts`}
            valueClassName="text-success"
            description="Maintaining curricular knowledge"
          />

          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-sky-500" />}
            title="Total Micro-skills"
            value={`${totalMicroSkills} Skills`}
            description="Mapped across all disciplines"
          />

          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-secondary-foreground" />}
            title="Unassigned Coverage"
            value={`${unassignedCount} Domains`}
            description={unassignedCount === 0 ? 'All disciplines have active experts' : 'Requires expert assignment'}
          />
        </div>

        {/* Disciplines Table Container */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Discipline Version Catalog
                </CardTitle>
                <CardDescription>
                  Draft and published discipline definitions with mapped competencies and micro-skill thresholds.
                </CardDescription>
              </div>

              {/* Search and Status Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search disciplines or codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses ({disciplines.length})</option>
                    <option value="active">Active ({activeCount})</option>
                    <option value="inactive">Inactive ({inactiveCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredDisciplines.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No disciplines found.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setStatusFilter('ALL') }}>
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Discipline Code</th>
                      <th className="py-2.5 px-3">Name & Description</th>
                      <th className="py-2.5 px-3 text-center">Micro-skills</th>
                      <th className="py-2.5 px-3 text-center">Modules</th>
                      <th className="py-2.5 px-3">Assigned Experts</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedDisciplines.map((disc) => (
                      <tr key={disc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {disc.code}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-foreground text-sm leading-snug">{disc.name}</div>
                          <div className="text-muted-foreground text-xs line-clamp-1 max-w-md mt-0.5" title={disc.description}>
                            {disc.description}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          <span className="font-semibold text-primary">{disc.microSkillCount}</span> skills
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          <span className="font-semibold text-foreground">{disc.moduleCount}</span> modules
                        </td>
                        <td className="py-3 px-3">
                          {disc.assignedExperts.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {disc.assignedExperts[0].name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                  {disc.assignedExperts[0].name}
                                </span>
                              </div>

                              {disc.assignedExperts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignExpert(disc)}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-pointer hover:bg-secondary-hover transition-colors"
                                  title={`+${disc.assignedExperts.length - 1} more: ${disc.assignedExperts
                                    .slice(1)
                                    .map((e) => e.name)
                                    .join(', ')}`}
                                >
                                  +{disc.assignedExperts.length - 1}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {disc.status === 'active' ? (
                            <Badge variant="success">ACTIVE</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">INACTIVE</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Assign Experts */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenAssignExpert(disc)}
                              title="Assign Experts"
                              aria-label="Assign Experts"
                            >
                              <UserPlus className="h-4 w-4 text-primary" />
                            </Button>

                            {/* Edit Discipline */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEdit(disc)}
                              title="Edit Discipline"
                              aria-label="Edit Discipline"
                            >
                              <Edit3 className="h-4 w-4 text-foreground" />
                            </Button>

                            {/* Toggle Active/Inactive */}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-8 w-8 p-0 ${
                                disc.status === 'active'
                                  ? 'text-destructive hover:bg-destructive/10'
                                  : 'text-success hover:bg-success/10'
                              }`}
                              onClick={() => {
                                if (disc.status === 'active') {
                                  setDisciplineToDeactivate(disc)
                                } else {
                                  handleToggleStatus(disc)
                                }
                              }}
                              title={disc.status === 'active' ? 'Deactivate Discipline' : 'Activate Discipline'}
                              aria-label={disc.status === 'active' ? 'Deactivate Discipline' : 'Activate Discipline'}
                            >
                              {disc.status === 'active' ? (
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
        title="Import Disciplines"
        entityName="Disciplines"
        description="Select a curated discipline domain catalog or paste a JSON array of custom disciplines."
        presets={DISCIPLINE_PRESETS}
        onImport={handleImportDisciplines}
        sampleJsonPlaceholder={`[
  {
    "code": "DISC-DEVOPS",
    "name": "Site Reliability & Cloud Operations",
    "description": "Continuous delivery, telemetry observability, and cloud infrastructure.",
    "status": "active"
  }
]`}
      />

      {/* CREATE / EDIT DISCIPLINE MODAL */}
      <Dialog open={isDisciplineModalOpen} onOpenChange={setIsDisciplineModalOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editingDiscipline ? 'Edit Discipline' : 'Create New Discipline'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define the curricular scope to organize micro-skills and assign Experts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveDiscipline} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Discipline Code <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. DISC-AI"
              value={discCode}
              onChange={(e) => setDiscCode(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Discipline Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Cognitive Architecture & Machine Learning"
              value={discName}
              onChange={(e) => setDiscName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Curricular Description
            </label>
            <textarea
              rows={3}
              placeholder="Outline the core topics, methods, and competency objectives..."
              value={discDescription}
              onChange={(e) => setDiscDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDisciplineModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-semibold shadow-2xs">
              {editingDiscipline ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DEACTIVATE DISCIPLINE CONFIRMATION MODAL */}
      <Dialog
        open={Boolean(disciplineToDeactivate)}
        onOpenChange={(open) => !open && setDisciplineToDeactivate(null)}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deactivate Discipline
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Please confirm deactivating this curricular knowledge domain.
          </DialogDescription>
        </DialogHeader>

        {disciplineToDeactivate && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{disciplineToDeactivate.name}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {disciplineToDeactivate.code}
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {disciplineToDeactivate.description}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                <span>{disciplineToDeactivate.microSkillCount} Micro-skills</span>
                <span>•</span>
                <span>{disciplineToDeactivate.moduleCount} Modules</span>
                <span>•</span>
                <span>{disciplineToDeactivate.assignedExperts.length} Assigned Experts</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <div className="text-[11.5px] leading-relaxed text-foreground">
                <strong className="text-destructive font-semibold">Curricular Impact:</strong> Deactivating this discipline will suspend new course and pathway associations. Existing Subject Matter Expert assignments and historical learning data will be preserved.
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setDisciplineToDeactivate(null)}>
            Keep Active
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (disciplineToDeactivate) {
                handleToggleStatus(disciplineToDeactivate)
                setDisciplineToDeactivate(null)
              }
            }}
            leftIcon={<Power className="h-3.5 w-3.5" />}
          >
            Deactivate Discipline
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ASSIGN EXPERTS MODAL (DUAL TABLE DESIGN WITH SELECTION, ADD ALL, AND NEW BADGE/FILTER) */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Experts — {activeDisciplineInModal?.name} ({activeDisciplineInModal?.code})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage subject matter expert assignments for this curricular discipline.
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
                  <Badge variant="primary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
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
                  : 'No experts currently assigned to this discipline. Use the table below to add experts.'}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2 px-3">Expert</th>
                      <th className="py-2 px-3">Specialization / Title</th>
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
                            onClick={() => handleRemoveExpert(activeDisciplineInModal!.id, exp.id, exp.name)}
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

                {/* Add Selected Option (Always Visible) */}
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
                {ELIGIBLE_EXPERTS.length === assignedExpertsInModal.length
                  ? 'All eligible experts in the organization are already assigned to this discipline.'
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
                      <th className="py-2 px-3">Specialization / Title</th>
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
                              <div className="text-[11px] text-muted-foreground">{exp.id}@adaptlearn.internal</div>
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
