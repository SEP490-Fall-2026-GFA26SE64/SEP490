import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { ArrowLeft, BookOpen, Check, CircleHelp, Clock3, Lightbulb, TriangleAlert } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { OverviewSkillDetails } from './OverviewSkillDetails'
import { profileStateLabels, skillProfileState, type ProfileSkill, type ProfileState, overviewSkillFilter, type OverviewFilter } from './overviewProfile'

const stateIcons = { recognized: Check, waiting: Clock3, failed: TriangleAlert, unassessed: CircleHelp, unknown: CircleHelp }
const states = Object.keys(profileStateLabels) as ProfileState[]

export function OverviewProfileGraph({ skills, targetKnown, notice, filter, roleTitle }: {
  skills: ProfileSkill[]; targetKnown: boolean; notice?: ReactNode; filter: OverviewFilter; roleTitle: string
}) {
  const { t, language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const reduceMotion = useReducedMotion(), controls = useAnimationControls()
  const [requested, setRequested] = useState<{ filter: OverviewFilter; skillKey: string | null }>({ filter, skillKey: null })
  const desiredSkill = requested.filter === filter ? requested.skillKey : null
  const [view, setView] = useState({ filter, skillKey: null as string | null })
  const changing = view.filter !== filter || view.skillKey !== desiredSkill
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [levelKey, setLevelKey] = useState<string | null>(null)
  const returnFocus = useRef<string | null>(null)
  const stage = useRef<HTMLDivElement>(null), nodeRefs = useRef(new Map<string, HTMLButtonElement>())
  const [size, setSize] = useState({ width: 800, height: 440 })
  const [nodeHeight, setNodeHeight] = useState(82)
  const expandedView = useRef('')
  const focusedSkill = skills.find(skill => skill.key === view.skillKey && (view.filter === 'all' || overviewSkillFilter(skill, skills) === view.filter))
  const filtered = skills.filter(skill => view.filter === 'all' || overviewSkillFilter(skill, skills) === view.filter)
  const nodes = focusedSkill ? focusedSkill.levels.map(level => ({
    key: level.key, name: t('knowledgeLevel.' + level.knowledgeLevel), state: level.state, skill: focusedSkill, level,
  })) : filtered.map(skill => ({ key: skill.key, name: skill.name, state: skillProfileState(skill), skill, level: undefined }))
  const viewKey = JSON.stringify([view.filter, focusedSkill?.key ?? null])
  const nodesKey = JSON.stringify(nodes.map(node => node.key))
  useEffect(() => {
    let cancelled = false
    async function transition() {
      if (!changing) return
      await controls.start('gathered')
      if (cancelled) return
      setHighlighted(null); setLevelKey(null); setNodeHeight(82)
      setView({ filter, skillKey: desiredSkill })
    }
    void transition()
    return () => { cancelled = true }
  }, [changing, filter, desiredSkill, controls])
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect
      setSize({ width: rect.width, height: rect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    const measure = () => setNodeHeight(previous => Math.max(previous, 82, ...[...nodeRefs.current.values()].map(el => el.offsetHeight)))
    const observer = new ResizeObserver(measure)
    nodeRefs.current.forEach(el => observer.observe(el))
    measure()
    return () => observer.disconnect()
  }, [nodesKey, language])
  // Maximize readable node size, then distribute the rows across ALL available space.
  const slotWidth = 204, slotHeight = nodeHeight + 24
  let columns = 1, scale = 0
  for (let count = 1; count <= Math.max(1, nodes.length); count++) {
    const rows = Math.max(1, Math.ceil(nodes.length / count))
    const candidate = Math.min(size.width / (count * slotWidth + 24), Math.max(1, size.height - 110) / (rows * slotHeight + 12), 1.5)
    if (candidate > scale) { scale = candidate; columns = count }
  }
  scale = Math.max(.001, scale)
  const width = size.width / scale, height = size.height / scale
  const root = { x: width / 2, y: 52 / scale }
  const rows = Math.max(1, Math.ceil(nodes.length / columns))
  const points = nodes.map((_, index) => {
    const row = Math.floor(index / columns), rowCount = Math.min(columns, nodes.length - row * columns)
    return { x: width * (index % columns + .5) / rowCount,
      y: 110 / scale + (height - 110 / scale) * (row + .5) / rows }
  })
  useEffect(() => {
    if (changing) return
    if (expandedView.current !== viewKey) controls.set('gathered')
    expandedView.current = viewKey
    void controls.start('spread')
  }, [controls, changing, viewKey, nodesKey, width, height, nodeHeight])
  const back = () => {
    if (focusedSkill) returnFocus.current = focusedSkill.key
    setRequested({ filter, skillKey: null })
  }
  const closeDialog = () => {
    setLevelKey(null)
  }
  return <section className="overview-profile-card" aria-labelledby="overview-graph-title" aria-busy={changing}>
    <div className="overview-graph-toolbar">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {focusedSkill && <Button size="sm" variant="outline" onClick={back}><ArrowLeft size={14} />{copy('Skills', 'Kỹ năng')}</Button>}
          <Heading id="overview-graph-title" level={2} size="card">{focusedSkill ? copy('Knowledge levels', 'Các mức kiến thức') : copy('Competency by skill', 'Năng lực theo từng skill')}</Heading>
        </div>
        <Text variant="caption" role="status">{changing ? copy('Updating graph…', 'Đang chuyển bản đồ…') : nodes.length + ' ' + (focusedSkill ? copy('levels', 'mức kiến thức') : copy('skills', 'kỹ năng'))} · Auto {Math.round(scale * 100)}%</Text>
      </div>
      {notice}
    </div>
    <div className="overview-graph-body">
      <div ref={stage} className="overview-profile-stage" onKeyDown={event => { if (event.key === 'Escape' && focusedSkill && !levelKey) { event.stopPropagation(); back() } }}>
        <div className="overview-zoom-canvas" style={{ width: size.width, height: size.height }}>
          <motion.div className="overview-slide-world" style={{ width, height, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }} initial="gathered" animate={controls}
            variants={{ gathered: { transition: { when: 'afterChildren' } }, spread: { transition: { staggerChildren: reduceMotion ? 0 : .018 } } }}
            onAnimationComplete={definition => {
              setNodeHeight(previous => Math.max(previous, ...[...nodeRefs.current.values()].map(el => el.offsetHeight)))
              if (definition === 'spread' && !focusedSkill && returnFocus.current) {
                nodeRefs.current.get(returnFocus.current)?.focus(); returnFocus.current = null
              }
            }}>
            <svg className="overview-profile-edges" width="100%" height="100%" aria-hidden="true">{nodes.map((node, index) => {
              const gathered = 'M ' + root.x + ' ' + root.y + ' L ' + root.x + ' ' + root.y
              const spread = 'M ' + root.x + ' ' + root.y + ' L ' + points[index].x + ' ' + points[index].y
              return <motion.path key={node.key} variants={{ gathered: { d: gathered, opacity: 0 }, spread: { d: spread, opacity: 1 } }}
                transition={{ duration: reduceMotion ? 0 : .25 }} data-state={node.state} data-muted={Boolean(highlighted && highlighted !== node.key)} data-highlight={highlighted === node.key} d={spread} />
            })}</svg>
            {nodes.map((node, index) => {
              const Icon = node.level ? stateIcons[node.state] : Lightbulb
              const status = profileStateLabels[node.state][vi ? 1 : 0]
              return <motion.button key={node.key} type="button" ref={el => { if (el) nodeRefs.current.set(node.key, el); else nodeRefs.current.delete(node.key) }}
                variants={{ gathered: { left: root.x, top: root.y, opacity: 0, scale: .15 }, spread: { left: points[index].x, top: points[index].y, opacity: 1, scale: 1 } }}
                transition={{ duration: reduceMotion ? 0 : .32, ease: [0.22, 1, 0.36, 1] }}
                className="overview-profile-node overview-simple-node" data-state={node.state}
                aria-label={node.name + ' · ' + status + ' · ' + (node.level ? copy('Open level details', 'Mở chi tiết mức kiến thức') : copy('Explore skill', 'Khám phá kỹ năng'))}
                title={node.name + ' · ' + status} aria-haspopup={node.level ? 'dialog' : undefined}
                onMouseEnter={() => setHighlighted(node.key)} onMouseLeave={() => setHighlighted(null)} onFocus={() => setHighlighted(node.key)} onBlur={() => setHighlighted(null)}
                onClick={() => { if (changing) return; if (node.level) setLevelKey(node.level.key); else { returnFocus.current = node.skill.key; setRequested({ filter, skillKey: node.skill.key }) } }}
                style={{ x: '-50%', y: '-50%' }}>
                <span className="overview-simple-kind"><Icon size={18} aria-hidden="true" />{node.level ? copy('Knowledge', 'Kiến thức') : 'Skill'}</span>
                <strong className="overview-node-name">{node.name}</strong>
                {node.level && <span className="text-caption overview-state-label" data-state={node.state}>{status}</span>}
              </motion.button>
            })}
            {!nodes.length && <Text variant="body-sm" className="overview-graph-empty" role="status">{copy('No skills match this filter.', 'Không có kỹ năng phù hợp bộ lọc.')}</Text>}
          </motion.div>
        </div>
        <div className="overview-profile-root" style={{ left: size.width / 2, top: 52 }} title={focusedSkill?.name ?? roleTitle}>
          {focusedSkill && <BookOpen size={16} className="mx-auto text-primary" aria-hidden="true" />}
          <strong>{focusedSkill?.name ?? roleTitle}</strong>
        </div>
      </div>
    </div>
    <div className="overview-graph-legend" aria-label={copy('Status legend', 'Chú giải trạng thái')}>{states.map(state => {
      const Icon = stateIcons[state]
      return <span key={state} className="overview-state-label text-caption" data-state={state}><Icon size={13} aria-hidden="true" />{profileStateLabels[state][vi ? 1 : 0]}</span>
    })}</div>
    {focusedSkill && levelKey && <OverviewSkillDetails skill={focusedSkill} targetKnown={targetKnown} levelKey={levelKey} onClose={closeDialog} />}
  </section>
}
