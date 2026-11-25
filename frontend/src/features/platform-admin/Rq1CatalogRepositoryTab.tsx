import { knowledgeLevelVariant } from './rq1Presentation'
import * as React from 'react'
import { BookOpen, GitFork, Layers, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import type { KnowledgeLevel, Rq1CatalogStore } from './rq1BenchmarkEngine'

interface Rq1CatalogRepositoryTabProps {
  catalog: Rq1CatalogStore
  isVi: boolean
}


export function Rq1CatalogRepositoryTab({ catalog, isVi }: Rq1CatalogRepositoryTabProps) {
  const [subView, setSubView] = React.useState<'skills' | 'modules' | 'prerequisites'>('skills')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [levelFilter, setLevelFilter] = React.useState<'ALL' | KnowledgeLevel>('ALL')

  const skillById = React.useMemo(() => new Map(catalog.skills.map((s) => [s.id, s])), [catalog.skills])
  const bindingByModuleId = React.useMemo(
    () => new Map(catalog.bindings.map((b) => [b.moduleId, b])),
    [catalog.bindings]
  )

  const reqsBySkillAndRole = React.useMemo(() => {
    const map = new Map<string, KnowledgeLevel[]>()
    for (const r of catalog.requirements) {
      map.set(`${r.roleLevel}|${r.skillId}`, r.requiredKnowledgeLevels)
    }
    return map
  }, [catalog.requirements])

  const filteredSkills = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return catalog.skills.filter((s) => {
      if (!q) return true
      return (
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.competencyGroup.toLowerCase().includes(q) ||
        s.researchFocus.toLowerCase().includes(q)
      )
    })
  }, [catalog.skills, searchQuery])

  const filteredModules = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return catalog.modules.filter((m) => {
      if (levelFilter !== 'ALL' && m.knowledgeLevel !== levelFilter) return false
      if (!q) return true
      const b = bindingByModuleId.get(m.id)
      const sk = b ? skillById.get(b.skillId) : undefined
      return (
        m.id.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.scenarioFocus.toLowerCase().includes(q) ||
        (b?.skillId.toLowerCase().includes(q) ?? false) ||
        (sk?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [catalog.modules, searchQuery, levelFilter, bindingByModuleId, skillById])

  const filteredPrereqs = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return catalog.prerequisites.filter((p) => {
      if (!q) return true
      const depName = skillById.get(p.dependentSkillId)?.name ?? ''
      const preName = skillById.get(p.prerequisiteSkillId)?.name ?? ''
      return (
        p.id.toLowerCase().includes(q) ||
        p.dependentSkillId.toLowerCase().includes(q) ||
        p.prerequisiteSkillId.toLowerCase().includes(q) ||
        depName.toLowerCase().includes(q) ||
        preName.toLowerCase().includes(q)
      )
    })
  }, [catalog.prerequisites, searchQuery, skillById])

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                {isVi
                  ? `Kho Học Liệu & Kỹ Năng Lưu Trữ Trên Hệ Thống (${catalog.role.name} • ${catalog.role.researchSpecialization})`
                  : `Built-in Competency & Learning Module Catalog (${catalog.role.name} • ${catalog.role.researchSpecialization})`}
              </CardTitle>
              <CardDescription className="mt-1">
                {isVi
                  ? 'Kho dữ liệu cố định gồm 20 kỹ năng, 72 học phần đặc tả, 58 yêu cầu theo cấp độ (Junior / Middle / Senior) và 31 quan hệ tiên quyết dùng để sinh lộ trình học khi nạp hồ sơ.'
                  : 'Stored benchmark repository of 20 micro-skills, 72 learning modules, 58 role-level requirements, and 31 prerequisite relationships used for pathway generation.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={subView === 'skills' ? 'primary' : 'outline'}
                onClick={() => setSubView('skills')}
              >
                <Layers size={14} className="mr-1.5" />
                {isVi ? `20 Kỹ năng & Ma trận Cấp độ` : `20 Skills & Matrix`}
              </Button>
              <Button
                size="sm"
                variant={subView === 'modules' ? 'primary' : 'outline'}
                onClick={() => setSubView('modules')}
              >
                <BookOpen size={14} className="mr-1.5" />
                {isVi ? `72 Học phần (Modules)` : `72 Learning Modules`}
              </Button>
              <Button
                size="sm"
                variant={subView === 'prerequisites' ? 'primary' : 'outline'}
                onClick={() => setSubView('prerequisites')}
              >
                <GitFork size={14} className="mr-1.5" />
                {isVi ? `31 Quan hệ Tiên quyết` : `31 Prerequisites`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isVi
                    ? 'Tìm theo mã Skill (MS-...), mã Module (RQM-...), tên kỹ năng hoặc học phần...'
                    : 'Search by skill code (MS-...), module ID (RQM-...), title, or focus...'
                }
                className="pl-9"
              />
            </div>

            {subView === 'modules' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const).map((lvl) => (
                  <Button
                    key={lvl}
                    size="sm"
                    variant={levelFilter === lvl ? 'primary' : 'outline'}
                    onClick={() => setLevelFilter(lvl)}
                  >
                    {lvl === 'ALL' ? (isVi ? 'Tất cả cấp độ (72)' : 'All Levels (72)') : lvl}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {subView === 'skills' && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Mã Skill' : 'Skill Code'}</th>
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Tên Kỹ năng & Định nghĩa' : 'Skill Name & Definition'}</th>
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Nhóm Năng lực' : 'Competency Group'}</th>
                  <th className="py-3 px-3 font-semibold text-center">Junior (18)</th>
                  <th className="py-3 px-3 font-semibold text-center">Middle (37)</th>
                  <th className="py-3 px-3 font-semibold text-center">Senior (49)</th>
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Chuẩn Đầu Ra (Outcomes F / I / A)' : 'Knowledge Outcomes (F / I / A)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSkills.map((sk) => {
                  const jReqs = reqsBySkillAndRole.get(`Junior|${sk.id}`) ?? []
                  const mReqs = reqsBySkillAndRole.get(`Middle|${sk.id}`) ?? []
                  const sReqs = reqsBySkillAndRole.get(`Senior|${sk.id}`) ?? []

                  return (
                    <tr key={sk.id} className="hover:bg-muted/30 transition-colors align-top">
                      <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                        {sk.id}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-foreground">{sk.name}</div>
                        <Text variant="caption" className="text-muted-foreground mt-0.5 block">
                          {sk.definition}
                        </Text>
                        <Badge variant="outline" className="mt-1.5 text-[11px]">
                          {sk.researchFocus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="secondary">{sk.competencyGroup}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {jReqs.length > 0 ? (
                          <div className="inline-flex gap-1">
                            {jReqs.map((kl) => (
                              <Badge key={kl} variant={knowledgeLevelVariant(kl)}>
                                {kl[0]}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          {mReqs.map((kl) => (
                            <Badge key={kl} variant={knowledgeLevelVariant(kl)}>
                              {kl[0]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          {sReqs.map((kl) => (
                            <Badge key={kl} variant={knowledgeLevelVariant(kl)}>
                              {kl[0]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs space-y-1 max-w-md">
                        {(['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as KnowledgeLevel[]).map((kl) => (
                          <div key={kl} className="leading-snug">
                            <span className="font-semibold text-foreground">{kl[0]}:</span>{' '}
                            <span className="text-muted-foreground">
                              {sk.knowledgeOutcomes[kl].map((o) => o.text).join('; ')}
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {subView === 'modules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredModules.map((mod) => {
            const b = bindingByModuleId.get(mod.id)
            const sk = b ? skillById.get(b.skillId) : undefined
            return (
              <Card key={mod.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">{mod.id}</span>
                        <Badge variant={knowledgeLevelVariant(mod.knowledgeLevel)}>
                          {mod.knowledgeLevel}
                        </Badge>
                        {b && (
                          <Badge variant="outline" className="font-mono text-xs">
                            TEACHES → {b.skillId}
                          </Badge>
                        )}
                      </div>
                      <Heading level={4} className="text-sm font-semibold mt-1 text-foreground">
                        {mod.title}
                      </Heading>
                    </div>
                  </div>
                  {sk && (
                    <div className="text-xs font-medium text-foreground bg-muted/60 px-2.5 py-1.5 rounded border border-border">
                      {isVi ? 'Kỹ năng giảng dạy:' : 'Target Skill:'}{' '}
                      <span className="font-semibold">{sk.name}</span> ({sk.competencyGroup})
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                  <div className="text-xs space-y-1 pt-1 border-t border-border">
                    <div className="font-semibold text-foreground">
                      {isVi ? 'Chuẩn đầu ra học phần (Learning Outcomes):' : 'Learning Outcomes:'}
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {mod.learningOutcomes.map((lo, i) => (
                        <li key={i}>{lo}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {subView === 'prerequisites' && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Mã' : 'Edge ID'}</th>
                  <th className="py-3 px-4 font-semibold">
                    {isVi ? 'Kỹ năng Phụ thuộc (Học sau)' : 'Dependent Skill (Target)'}
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    {isVi ? 'Kỹ năng Tiên quyết (Cần học trước)' : 'Prerequisite Skill (Required Before)'}
                  </th>
                  <th className="py-3 px-4 font-semibold">{isVi ? 'Lý do Chuyên môn' : 'Pedagogical Rationale'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPrereqs.map((edge) => {
                  const depSk = skillById.get(edge.dependentSkillId)
                  const preSk = skillById.get(edge.prerequisiteSkillId)
                  return (
                    <tr key={edge.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold">{edge.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-foreground">{edge.dependentSkillId}</span>
                          <Badge variant={knowledgeLevelVariant(edge.dependentKnowledgeLevel)}>
                            {edge.dependentKnowledgeLevel}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{depSk?.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-foreground">{edge.prerequisiteSkillId}</span>
                          <Badge variant={knowledgeLevelVariant(edge.prerequisiteKnowledgeLevel)}>
                            {edge.prerequisiteKnowledgeLevel}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{preSk?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{edge.rationale}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
