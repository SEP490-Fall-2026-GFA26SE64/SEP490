"""Validate the source-backed 0.7.0 catalog without contacting Neo4j."""
import json,math
from collections import Counter,defaultdict
from pathlib import Path
LABELS={'Occupations':'Occupation','TargetRoles':'TargetRole','Levels':'Level','Competencies':'Competency','MicroSkills':'MicroSkill','Courses':'Course','LearningModules':'LearningModule'}
COUNTS={'Occupations':5,'TargetRoles':48,'Levels':144,'Competencies':472,'MicroSkills':79,'Courses':42,'LearningModules':85}
TYPES={'HAS_ROLE':{('Occupation','TargetRole')},'HAS_LEVEL':{('TargetRole','Level')},'HAS_COMPETENCY':{('Level','Competency')},'HAS_SKILL':{('Competency','MicroSkill')},'REQUIRES_SKILL':{('Level','MicroSkill')},'HAS_COURSE':{('Level','Course')},'HAS_MODULE':{('Course','LearningModule')},'TEACHES':{('LearningModule','MicroSkill')},'HAS_SKILL_PREREQUISITE':{('MicroSkill','MicroSkill')},'HAS_COURSE_PREREQUISITE':{('Course','Course')}}
EDGE_COUNTS={'REQUIRES_SKILL':1891,'HAS_SKILL':1891,'HAS_COURSE':632,'HAS_COMPETENCY':472,'TEACHES':181,'HAS_LEVEL':144,'HAS_MODULE':133,'HAS_ROLE':48,'HAS_SKILL_PREREQUISITE':11,'HAS_COURSE_PREREQUISITE':28}

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
    require({s:len(data[s]) for s in LABELS}==COUNTS,'Node counts differ from release')
    for sec,label in LABELS.items():
        for r in data[sec]:
            require(r['id'] not in nodes,'Duplicate node ID');nodes[r['id']]=r;labels[r['id']]=label
    edges=data['relationships'];require(Counter(e['type'] for e in edges)==Counter(EDGE_COUNTS),'Relationship counts differ from release')
    require(len({e['id'] for e in edges})==len(edges),'Duplicate edge ID')
    require(len({(e['type'],e['fromId'],e['toId']) for e in edges})==len(edges),'Duplicate edge pair')
    for r in list(nodes.values())+edges:
        require(r['version']=='0.7.0' and r['status']=='ACTIVE' and r['reviewStatus']=='NEEDS_EXPERT_REVIEW','Unexpected release/review state')
        require(r['reviewedBy'] is None and r['reviewedAt'] is None,'Unsubstantiated approval')
        require(not {'sourceConceptUri','sourceLocator','sourceVerification'} & r.keys(),'Source fields leaked into graph')
    for e in edges:
        t,a,b=e['type'],e['fromId'],e['toId'];require(a in nodes and b in nodes,'Missing endpoint')
        require((labels[a],labels[b]) in TYPES[t],'Wrong endpoint labels')
        sets[(t,a)].add(b);incoming[(t,b)].add(a)
        if t=='REQUIRES_SKILL':
            require(type(e['requiredScore']) in (int,float) and math.isfinite(e['requiredScore']) and 0<=e['requiredScore']<=1,'Invalid threshold')
            require(type(e['isMandatory']) is bool,'Invalid mandatory flag')
            require((e['rubricId'],e['rubricVersion'])==('RUB-SKILL-01','1.2'),'Unknown rubric')
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
        require(sets['REQUIRES_SKILL',l['id']] and sets['HAS_COURSE',l['id']] and sets['HAS_COMPETENCY',l['id']],'Incomplete Level')
        union=set().union(*(sets['HAS_SKILL',x] for x in sets['HAS_COMPETENCY',l['id']]))
        require(union==sets['REQUIRES_SKILL',l['id']],'Competency/Level skill mismatch')
        require(any(e['type']=='REQUIRES_SKILL' and e['fromId']==l['id'] and e['isMandatory'] for e in edges),'Empty mandatory set')
    for c in data['Competencies']:
        require(incoming['HAS_COMPETENCY',c['id']]=={c['levelId']},'Competency parent mismatch')
        require(len(sets['HAS_SKILL',c['id']])>=2,'Competency must group multiple skills')
        require(c['attainmentRule']=='ALL_MEMBER_SKILLS_AT_OWNING_LEVEL','Wrong derivation rule')
        require(not {'targetRoleId','requiredScore','rubricId','evidenceType'} & c.keys(),'Independent competency assessment field')
    for c in data['Courses']:
        require(incoming['HAS_COURSE',c['id']]==set(c['levelIds']),'Course Level mismatch')
        require(all(nodes[l]['code']==c['id'].split('-')[2] for l in c['levelIds']),'Course tier mismatch')
        ee=[e for e in edges if e['type']=='HAS_MODULE' and e['fromId']==c['id']]
        require(ee and all(type(e['sequence']) is int for e in ee) and sorted(e['sequence'] for e in ee)==list(range(1,len(ee)+1)),'Invalid module sequence')
    for m in data['LearningModules']:
        require(sets['TEACHES',m['id']] and incoming['HAS_MODULE',m['id']],'Orphan module')
        require((base/m['contentUri']).is_file(),'Missing module content: '+m['contentUri'])
    taught=set().union(*(sets['TEACHES',m['id']] for m in data['LearningModules']))
    require(taught=={s['id'] for s in data['MicroSkills']},'Missing teaching coverage')
    for label in ['Course','MicroSkill']:
        g=defaultdict(set)
        for e in edges:
            if e['type'] in ('HAS_SKILL_PREREQUISITE','HAS_COURSE_PREREQUISITE') and labels[e['fromId']]==label:
                require(e['fromId']!=e['toId'],'Self prerequisite');g[e['fromId']].add(e['toId'])
                if label=='Course':require(e.get('requiredCompletionStatus')=='PASSED','Invalid course completion condition')
        dag(g)
    # Module order combined with course dependencies. Skill readiness may also be
    # demonstrated by independent evidence; do not invent AND dependencies on all providers.
    g=defaultdict(set)
    for c in data['Courses']:
        ordered=sorted([e for e in edges if e['type']=='HAS_MODULE' and e['fromId']==c['id']],key=lambda e:e['sequence'])
        for a,b in zip(ordered,ordered[1:]):g[(c['id'],b['toId'])].add((c['id'],a['toId']))
    for e in edges:
        if e['type']=='HAS_COURSE_PREREQUISITE':
            for a in sets['HAS_MODULE',e['fromId']]:g[(e['fromId'],a)].update((e['toId'],b) for b in sets['HAS_MODULE',e['toId']])
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
    from decimal import Decimal
    rubric_groups=defaultdict(list)
    for r in data['rubricDefinitions']:
        rubric_groups[(r['rubricId'],r['rubricVersion'])].append(r)
        require(r['isRequired'] is True,'All authored criteria are required')
        require(r['minimumPassingRating'] is None or (type(r['minimumPassingRating']) is int and 0<=r['minimumPassingRating']<=4),'Invalid rating gate')
        require(r['status']=='DRAFT' and r['reviewStatus']=='NEEDS_EXPERT_REVIEW','Unexpected rubric approval')
    require(set(rubric_groups)=={('RUB-SKILL-01','1.2'),('RUB-READINESS-01','1.0')},'Unexpected rubric versions')
    require(len(data['rubricDefinitions'])==7,'Wrong criterion count')
    for key,rows in rubric_groups.items():
        require(len({r['criterionId'] for r in rows})==len(rows),'Duplicate criterion')
        require(all(Decimal(str(r['weight']))>0 for r in rows) and sum(Decimal(str(r['weight'])) for r in rows)==1,'Weights must sum to one per rubric')
    policies=data['assessmentPolicies']
    require(len(policies)==2 and {(r['rubricId'],r['rubricVersion']) for r in policies}==set(rubric_groups),'Missing/duplicate policy')
    for policy in policies:
        require(policy['ratingMaximum']==4 and policy['actualScoreFormula']=='SUM(weight * rating / 4)' and policy['roundBeforeComparison'] is False,'Incorrect score policy')
        require(policy['missingRequiredEvidenceStatus']=='NOT_ASSESSED' and policy['missingActualScore'] is None,'Missing evidence policy mismatch')
        require(policy['criticalCheckIds']==[] and policy['criticalCheckPolicy']=='NONE_IN_THIS_VERSION','Implicit critical gates prohibited')
    tasks={(r['assessmentId'],r['assessmentVersion']):r for r in data['readinessAssessments']}
    require(len(tasks)==len(data['readinessAssessments'])==11,'Invalid readiness task inventory')
    used=set()
    for edge in edges:
        if edge['type']=='HAS_SKILL_PREREQUISITE':
            key=(edge['readinessAssessmentId'],edge['readinessAssessmentVersion']);require(key in tasks,'Unknown readiness task');used.add(key);task=tasks[key]
            require(task['forSkillId']==edge['toId'] and task['dependentSkillId']==edge['fromId'],'Readiness task endpoint mismatch')
            require((edge['rubricId'],edge['rubricVersion'])==('RUB-READINESS-01','1.0')==(task['rubricId'],task['rubricVersion']),'Readiness rubric mismatch')
            require(type(edge['requiredScore']) in (float,int) and math.isfinite(edge['requiredScore']) and 0<=edge['requiredScore']<=1,'Invalid readiness threshold')
            require(task['outcome']==edge['readinessOutcome'] and len(task['evidenceRequirements'])==3,'Readiness evidence mismatch')
            require(task['criticalCheckIds']==[],'Unknown readiness critical policy')
        if edge['type']=='HAS_COURSE_PREREQUISITE':
            require(not {'rubricId','requiredScore','readinessOutcome'} & edge.keys(),'Skill fields on course prerequisite')
    require(used==set(tasks),'Orphan readiness task')
    profile_keys={r['canonicalProfileKey'] for r in data['TargetRoles']}
    require(len(profile_keys)==20 and all(k.startswith('PROFILE-') for k in profile_keys),'Canonical profile inventory mismatch')
    # Ensure each presentation group has one skill/threshold vector at every tier.
    signatures=defaultdict(set)
    for role in data['TargetRoles']:
        lv=sorted([l for l in data['Levels'] if l['targetRoleId']==role['id']],key=lambda l:l['rank'])
        vector=[(l['code'],sorted((e['toId'],e['requiredScore'],e['isMandatory']) for e in edges if e['type']=='REQUIRES_SKILL' and e['fromId']==l['id'])) for l in lv]
        signatures[role['canonicalProfileKey']].add(json.dumps(vector))
    require(all(len(v)==1 for v in signatures.values()),'Canonical group has incompatible skill vectors; review/split group')
    return data,{'nodeCounts':COUNTS,'relationshipCounts':EDGE_COUNTS,'totalNodes':len(nodes),'totalRelationships':len(edges),'riasecSourceRows':30,'coursePrerequisites':28,'skillPrerequisites':11,'reviewStatus':'NEEDS_EXPERT_REVIEW'}

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--file',type=Path,default=Path(__file__).resolve().parent/'ontology_seed.json');a=p.parse_args()
    _,report=validate(a.file);print(json.dumps(report,indent=2))
