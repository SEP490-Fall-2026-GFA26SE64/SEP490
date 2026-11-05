"""Offline validation for the 0.12 single-Skill release; old 0.11 validation remains historical."""
import collections
import hashlib
import json
from pathlib import Path
from validate_dataset import require, dag
LABELS = {'JobPositions':'JobPosition','TargetRoles':'TargetRole','Levels':'Level','Competencies':'Competency','MicroSkills':'MicroSkill','LearningModules':'LearningModule'}
TYPES = {'HAS_ROLE':('JobPosition','TargetRole'),'HAS_LEVEL':('TargetRole','Level'),'HAS_COMPETENCY':('Level','Competency'),'HAS_SKILL':('Competency','MicroSkill'),'REQUIRES_SKILL':('Level','MicroSkill'),'TEACHES':('LearningModule','MicroSkill'),'HAS_SKILL_PREREQUISITE':('MicroSkill','MicroSkill')}
EXPORT_ONLY = {'TargetRole':{'jobPositionId'},'Level':{'targetRoleId'},'Competency':{'levelId'}}
def snapshot(data):
    nodes,edges={},{}
    for section,label in LABELS.items():
        for row in data[section]:
            props={k:v for k,v in row.items() if v is not None and k not in EXPORT_ONLY.get(label,set())}
            nodes[row['id']]={'labels':[label],'properties':props}
    for row in data['relationships']:
        edges[row['id']]={'type':row['type'],'from':row['fromId'],'to':row['toId'],'properties':{k:v for k,v in row.items() if k not in {'type','fromId','toId'} and v is not None}}
    return {'nodes':nodes,'relationships':edges}

def validate(path):
    path=Path(path);data=json.loads(path.read_text());base=path.parent
    require(set(data)==set(LABELS)|{'relationships'},'Unexpected sections')
    flat=[r for section in LABELS for r in data[section]]
    require(len(flat)==994 and len({r['id'] for r in flat})==994,'Node count/identity mismatch')
    nodes={r['id']:LABELS[section] for section in LABELS for r in data[section]}
    edges=data['relationships'];require(len(edges)==4703,'Unexpected relationship count')
    require(len({e['id'] for e in edges})==len(edges),'Duplicate relationship ID')
    require(len({(e['type'],e['fromId'],e['toId']) for e in edges})==len(edges),'Duplicate pair')
    for row in flat+edges:
        require(row['version']=='0.12.0' and row['status']=='ACTIVE' and row['reviewStatus']=='NEEDS_EXPERT_REVIEW','Unexpected metadata')
        require(row['reviewedBy'] is None and row['reviewedAt'] is None,'Invented approval')
        require(not {'teachingFocus','difficultyLevel'} & row.keys(),'Retired teaching metadata')
    mappings=collections.Counter();providers=collections.Counter();graph=collections.defaultdict(set)
    for e in edges:
        require((nodes.get(e['fromId']),nodes.get(e['toId']))==TYPES.get(e['type']),'Invalid endpoint/type')
        if e['type']=='TEACHES': mappings[e['fromId']]+=1;providers[e['toId']]+=1
        if e['type']=='HAS_SKILL_PREREQUISITE':graph[e['fromId']].add(e['toId'])
    dag(graph)
    audit=json.loads((base/'single-skill-v012-audit.json').read_text())
    require(audit['releaseSha256']==hashlib.sha256(path.read_bytes()).hexdigest(),'Release audit pin differs')
    entries={r['moduleId']:r for r in audit['modules']}
    require(set(entries)=={m['id'] for m in data['LearningModules']},'Incomplete mapping audit')
    for m in data['LearningModules']:
        require(mappings[m['id']]==1,'Each Module must TEACH exactly one Skill')
        content=(base/m['contentUri']).resolve()
        require(content.is_relative_to(base.resolve()) and content.is_file(),'Missing/unsafe content')
        chosen=entries[m['id']]
        require(chosen['skillId'] in content.read_text(),'Content omits chosen Skill')
        require(chosen['sourceContentSha256']==hashlib.sha256((base/chosen['sourceContentUri']).read_bytes()).hexdigest(),'Historical source changed')
        require(m['duration']>0 and m['price']>0,'Invalid duration/price')
    uncovered=sorted(s['id'] for s in data['MicroSkills'] if not providers[s['id']])
    require(uncovered==sorted(audit['uncoveredSkills']),'Uncovered Skill report differs')
    return data,{'nodes':len(nodes),'relationships':len(edges),'modules':len(mappings),'coveredSkills':len(providers),'uncoveredSkills':uncovered}
if __name__=='__main__':
    _,report=validate(Path(__file__).with_name('ontology_seed-v012.json'))
    print(json.dumps(report,indent=2))
