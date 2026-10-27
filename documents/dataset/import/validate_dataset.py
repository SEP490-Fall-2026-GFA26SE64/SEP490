"""Validate the source-backed 0.9.0 catalog without contacting Neo4j."""
import json,math
from collections import Counter,defaultdict
from pathlib import Path
LABELS={'Occupations':'Occupation','TargetRoles':'TargetRole','Levels':'Level','Competencies':'Competency','MicroSkills':'MicroSkill','LearningModules':'LearningModule'}
COUNTS={'Occupations':5,'TargetRoles':48,'Levels':144,'Competencies':472,'MicroSkills':79,'LearningModules':85}
TYPES={'HAS_ROLE':{('Occupation','TargetRole')},'HAS_LEVEL':{('TargetRole','Level')},'HAS_COMPETENCY':{('Level','Competency')},'HAS_SKILL':{('Competency','MicroSkill')},'REQUIRES_SKILL':{('Level','MicroSkill')},'TEACHES':{('LearningModule','MicroSkill')},'HAS_SKILL_PREREQUISITE':{('MicroSkill','MicroSkill')}}
EDGE_COUNTS={'REQUIRES_SKILL':1891,'HAS_SKILL':1891,'HAS_COMPETENCY':472,'TEACHES':181,'HAS_LEVEL':144,'HAS_ROLE':48,'HAS_SKILL_PREREQUISITE':11}

def require(ok,message):
    if not ok:raise ValueError(message)

def dag(graph):
    active,done=set(),set()
    def visit(x):
        require(x not in active,'Dependency cycle: '+str(x))
        if x in done:return
        active.add(x)
        for y in graph.get(x,()):visit(y)
        active.remove(x);done.add(x)
    for x in list(graph):visit(x)

def validate(file):
    file=Path(file);base=file.parent;data=json.loads(file.read_text());nodes={};labels={};sets=defaultdict(set);incoming=defaultdict(set)
    require(set(data)==set(LABELS)|{'relationships'},'Unknown or retired seed sections')
    require({s:len(data[s]) for s in LABELS}==COUNTS,'Node counts differ from release')
    for sec,label in LABELS.items():
        for r in data[sec]:
            require(r['id'] not in nodes,'Duplicate node ID');nodes[r['id']]=r;labels[r['id']]=label
    edges=data['relationships'];require(Counter(e['type'] for e in edges)==Counter(EDGE_COUNTS),'Relationship counts differ from release')
    require(len({e['id'] for e in edges})==len(edges),'Duplicate edge ID')
    require(len({(e['type'],e['fromId'],e['toId']) for e in edges})==len(edges),'Duplicate edge pair')
    for r in list(nodes.values())+edges:
        require(r['version']=='0.9.0' and r['status']=='ACTIVE' and r['reviewStatus']=='NEEDS_EXPERT_REVIEW','Unexpected release/review state')
        require(r['reviewedBy'] is None and r['reviewedAt'] is None,'Unsubstantiated approval')
        require(not {'canonicalProfileKey','learningOutcome','expectedOutcome','rubricId','rubricVersion','readinessOutcome','readinessAssessmentId','readinessAssessmentVersion','sourceConceptUri','sourceLocator','sourceVerification'} & r.keys(),'Retired or source fields leaked into graph')
    for e in edges:
        t,a,b=e['type'],e['fromId'],e['toId'];require(a in nodes and b in nodes,'Missing endpoint')
        require((labels[a],labels[b]) in TYPES[t],'Wrong endpoint labels')
        sets[(t,a)].add(b);incoming[(t,b)].add(a)
        if t=='REQUIRES_SKILL':
            require(type(e['requiredScore']) in (int,float) and math.isfinite(e['requiredScore']) and 0<=e['requiredScore']<=1,'Invalid threshold')
            require(type(e['isMandatory']) is bool,'Invalid mandatory flag')

    for o in data['Occupations']:
        for name in ['Realistic','Investigative','Artistic','Social','Enterprising','Conventional']:
            v=o['interest'+name];require(type(v) in (int,float) and math.isfinite(v) and 0<=v<=1,'Invalid RIASEC score')
        require(bool(sets['HAS_ROLE',o['id']]),'Occupation has no roles')
    require(len({o['code'] for o in data['Occupations']})==5,'Duplicate occupation code')
    require(len({r['code'] for r in data['TargetRoles']})==48,'Duplicate role code')
    for r in data['TargetRoles']:
        require(incoming['HAS_ROLE',r['id']]=={r['occupationId']},'Role ownership mismatch')
        lv=[nodes[x] for x in sets['HAS_LEVEL',r['id']]]
        require(len(lv)==3 and {(l['code'],l['rank']) for l in lv}=={('J',1),('M',2),('S',3)},'Wrong local Level inventory')
    for l in data['Levels']:
        require(incoming['HAS_LEVEL',l['id']]=={l['targetRoleId']},'Level parent mismatch')
        require(sets['REQUIRES_SKILL',l['id']] and sets['HAS_COMPETENCY',l['id']],'Incomplete Level')
        union=set().union(*(sets['HAS_SKILL',x] for x in sets['HAS_COMPETENCY',l['id']]))
        require(union==sets['REQUIRES_SKILL',l['id']],'Competency/Level skill mismatch')
        require(any(e['type']=='REQUIRES_SKILL' and e['fromId']==l['id'] and e['isMandatory'] for e in edges),'Empty mandatory set')
    for c in data['Competencies']:
        require(incoming['HAS_COMPETENCY',c['id']]=={c['levelId']},'Competency parent mismatch')
        require(len(sets['HAS_SKILL',c['id']])>=2,'Competency must group multiple skills')
        require(c['attainmentRule']=='ALL_MEMBER_SKILLS_AT_OWNING_LEVEL','Wrong derivation rule')
        require(not {'targetRoleId','requiredScore','rubricId','evidenceType'} & c.keys(),'Independent competency assessment field')
    for m in data['LearningModules']:
        require(len(sets['TEACHES',m['id']])>=1,'Each module must teach at least one skill')
        content=(base/m['contentUri']).resolve()
        require(content.is_relative_to(base.resolve()) and content.is_file(),'Missing or unsafe module content')
    for skill in data['MicroSkills']:
        require(len(incoming['TEACHES',skill['id']])>=1,'Each skill must have at least one module')
    g=defaultdict(set)
    for e in edges:
        if e['type']=='HAS_SKILL_PREREQUISITE':
            require(e['fromId']!=e['toId'],'Self prerequisite')
            require(type(e['requiredScore']) in (float,int) and math.isfinite(e['requiredScore']) and 0<=e['requiredScore']<=1,'Invalid readiness threshold')
            g[e['fromId']].add(e['toId'])
    dag(g)
    evidence=json.loads((base.parent/'sources/onet_five_occupations_2026_10_14/occupation_title_evidence.json').read_text())
    expected={(r['code'],t) for r in evidence for t in r['reportedTitles']}
    actual={(nodes[r['occupationId']]['code'],r['name']) for r in data['TargetRoles']}
    require(actual==expected and len(actual)==48,'Source reported titles mismatch')
    interest=json.loads((base.parent/'sources/onet_interests_31_0_2026_10_14/selected_interests.json').read_text())
    require(len(interest['rows'])==30 and interest['scale']['minimum']==1 and interest['scale']['maximum']==7,'RIASEC evidence invalid')
    for r in interest['rows']:
        o=next(o for o in data['Occupations'] if o['code']==r['onetsoc_code'])
        require(o['interest'+r['element_name']]==round((r['data_value']-1)/6,6),'RIASEC normalization mismatch')
    return data,{'nodeCounts':COUNTS,'relationshipCounts':EDGE_COUNTS,'totalNodes':len(nodes),'totalRelationships':len(edges),'riasecSourceRows':30,'skillPrerequisites':11,'reviewStatus':'NEEDS_EXPERT_REVIEW'}

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--file',type=Path,default=Path(__file__).resolve().parent/'ontology_seed.json');a=p.parse_args()
    _,report=validate(a.file);print(json.dumps(report,indent=2))
