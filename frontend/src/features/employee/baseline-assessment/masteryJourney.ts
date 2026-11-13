import { requirementMet } from '../overview/roleOverviewData'
import type { JourneyRole } from './knowledgeJourneyApi'
import type { KnowledgeNode } from './knowledgeMap'

export interface JourneyBranch extends Omit<JourneyRole, 'skills'> { skills: JourneyCluster[]; skillCount: number }
export interface JourneyCluster { key: string; id: string; name: string; version: string | null; levels: KnowledgeNode[]; required: Set<string> }
export const knowledgeKey = (id: string, version: string | null, level: string) => JSON.stringify([id, version, level])
const sameRole = (a: JourneyBranch, b: JourneyBranch) => Boolean(a.roleId && a.roleId === b.roleId) || Boolean(a.roleCode && b.roleCode && a.roleCode.split('#')[0].toLowerCase() === b.roleCode.split('#')[0].toLowerCase())
const order = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED']
export function buildJourney(assigned: JourneyRole | null, targets: JourneyRole[], records: KnowledgeNode[], activeId: string | null): JourneyBranch[] {
  const byKey = new Map(records.map(n => [n.key, n]))
  const recordGroups = new Map<string, KnowledgeNode[]>()
  for (const node of records) { const key = JSON.stringify([node.skillId,node.skillVersion]); const group = recordGroups.get(key) ?? []; group.push(node); recordGroups.set(key,group) }
  const branches: JourneyBranch[] = [ ...(assigned ? [assigned] : []), ...targets ].map(role => {
    if (role.source === 'ASSIGNED' || role.id !== activeId) return { ...role, skills: [], skillCount: role.source === 'ASSIGNED' ? 0 : role.skills.length }
    const forRole = (node: KnowledgeNode): KnowledgeNode => role.current ? node : {...node,targetStatus:undefined,origin:undefined,baselinePassed:undefined,needsReview:undefined}
    const clusters = new Map<string, JourneyCluster>()
    for (const skill of role.skills) {
      const versions = skill.levels.length ? [...new Set(skill.levels.map(l => l.skillVersion))] : [null]
      for (const version of versions) {
        const key = JSON.stringify([skill.id, version])
        const declared = skill.levels.filter(l => l.skillVersion === version)
        const required = new Set(declared.map(l => l.knowledgeLevel))
        const nodes = new Map<string, KnowledgeNode>()
        for (const l of declared) {
          const key = knowledgeKey(skill.id, version, l.knowledgeLevel)
          nodes.set(l.knowledgeLevel, forRole(byKey.get(key) ?? { key, skillId: skill.id, skillName: skill.name, skillVersion: version, knowledgeLevel: l.knowledgeLevel, entries: [], evidence: [] }))
        }
        // Other levels are visible as history, never silently promoted to Role requirements.
        if (version !== null) for (const node of recordGroups.get(key) ?? []) if (!role.current || nodes.has(node.knowledgeLevel)) nodes.set(node.knowledgeLevel, forRole(node))
        clusters.set(key, { key, id: skill.id, name: skill.name, version, levels: [...nodes.values()].sort((a,b) => order.indexOf(a.knowledgeLevel)-order.indexOf(b.knowledgeLevel)), required })
      }
    }
    return { ...role, skills: [...clusters.values()], skillCount: role.skills.length }
  })
  return branches
}

/** Count explicit required levels with real positive records; never a mastery score or award. */
export function skillProgress(skill: JourneyCluster) {
  const required=skill.levels.filter(level=>skill.required.has(level.knowledgeLevel))
  const known=skill.version!==null&&required.length===skill.required.size&&required.length>0
  return {total:skill.required.size,positive:known?required.filter(level=>level.targetStatus ? requirementMet(level.targetStatus) : level.evidence.length > 0).length:0,known}
}

export function levelTone(node: KnowledgeNode): 'positive'|'failed'|'unknown'|Exclude<NonNullable<KnowledgeNode['targetStatus']>,'achieved'> {
  if (node.targetStatus) return requirementMet(node.targetStatus) ? 'positive' : node.targetStatus
  return node.evidence.length > 0 ? 'positive' : node.latestAssessment?.passed === false ? 'failed' : 'unknown'
}

/** Trim the actual quadratic at each disc boundary, retaining its tangents. */
export function memberEdge(a: GraphPoint,b: GraphPoint,startRadius: number,endRadius: number) {
  const c={x:a.x+(b.x-a.x)*.65,y:a.y}
  const at=(t:number)=>({x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*b.y})
  let low=0,high=1
  for(let i=0;i<24;i++){const mid=(low+high)/2,p=at(mid);if(Math.hypot(p.x-a.x,p.y-a.y)<startRadius)low=mid;else high=mid}
  const from=high;low=from;high=1
  for(let i=0;i<24;i++){const mid=(low+high)/2,p=at(mid);if(Math.hypot(p.x-b.x,p.y-b.y)>endRadius)low=mid;else high=mid}
  const to=low,p=at(from),q=at(to),control={x:p.x+(to-from)*((1-from)*(c.x-a.x)+from*(b.x-c.x)),y:p.y+(to-from)*((1-from)*(c.y-a.y)+from*(b.y-c.y))}
  return `M ${p.x} ${p.y} Q ${control.x} ${control.y} ${q.x} ${q.y}`
}

export interface GraphPoint { x: number; y: number }
export function overviewLayout(branches: JourneyBranch[], width: number, heights: Map<string, number>) {
  const assigned = branches.find(b => b.source === 'ASSIGNED')
  const groups: JourneyBranch[][] = []
  for (const b of branches.filter(b => b.source === 'TARGET').sort((a,b) => (a.revision ?? 0)-(b.revision ?? 0))) {
    const matches=groups.filter(group=>group.some(member=>sameRole(member,b)))
    if(!matches.length)groups.push([b])
    else {
      const first=groups.indexOf(matches[0]),merged=[...matches.flat(),b].sort((a,b)=>(a.revision??0)-(b.revision??0))
      for(let i=groups.length-1;i>=0;i--)if(matches.includes(groups[i]))groups.splice(i,1)
      groups.splice(first,0,merged)
    }
  }
  const columns = Math.max(1, Math.min(3, Math.floor(width/220))), positions = new Map<string, GraphPoint>(), edges: { from: string; to: string; branch: boolean }[] = []
  if (assigned) positions.set(assigned.id, { x: width/2, y: 85 })
  const lanes = [...groups]
  let y = assigned ? 85+(heights.get(assigned.id)??200)+70 : 110
  for (let start = 0; start < lanes.length; start += columns) {
    const batch = lanes.slice(start,start+columns)
    let end = y
    batch.forEach((group,col) => {
      let rowY=y
      group.forEach((node,index) => {
        positions.set(node.id,{ x: width*(col+.5)/batch.length, y:rowY })
        if (index) edges.push({ from: group[index-1].id,to:node.id,branch:false })
        else if (assigned) edges.push({ from:assigned.id,to:node.id,branch:!sameRole(assigned,node) })
        rowY += (heights.get(node.id)??200)+45
      })
      end=Math.max(end,rowY)
    })
    y=end+60
  }
  return { positions, edges, height: Math.max(520,y) }
}
