"""Read-only structural validation. Not expert approval or RQ1 scoring."""
from pathlib import Path
import argparse, json, hashlib, copy
from collections import Counter, defaultdict
ROOT=Path(__file__).resolve().parents[1]
DEFAULT=ROOT/'data/rq1/application-developer-v0.1'
LEVELS={'FOUNDATION','INTERMEDIATE','ADVANCED'}
def load(p):return {n:json.loads((p/(n+'.json')).read_text()) for n in ['role','skills','modules','teaching-bindings','requirements','prerequisites','sources','manifest','legacy-requirements','change-log']}
def validate(d):
 errors=[]
 def check(ok,msg):
  if not ok:errors.append(msg)
 def unique(rows,key,label):check(len(rows)==len({r[key] for r in rows}),label+' duplicate identities')
 skills={s['id']:s for s in d['skills']};modules={m['id']:m for m in d['modules']}; sources=d['sources'];pairs=set();outcomes={}
 for name in ['skills','modules','requirements','prerequisites']:unique(d[name],'id',name)
 for s in d['skills']:
  check(set(s['knowledgeOutcomes'])==LEVELS,'knowledge groups '+s['id'])
  for l,outs in s['knowledgeOutcomes'].items():
   pairs.add((s['id'],l));outcomes[(s['id'],l)]={x['code']:x['text'] for x in outs}
   check(len(outs)>=2 and len({x['code'] for x in outs})==len(outs),'outcomes '+s['id'])
   check(all(len(x['text'].split())>=6 for x in outs),'underspecified outcomes '+s['id'])
 bindings=defaultdict(list); coverage=Counter()
 for b in d['teaching-bindings']:
  key=(b['skillId'],b['knowledgeLevel']);bindings[b['moduleId']].append(b);coverage[key]+=1
  check(b['moduleId'] in modules and key in pairs,'dangling teaching binding')
  if key in pairs and b['moduleId'] in modules:
   m=modules[b['moduleId']];check(b['skillVersion']==skills[b['skillId']]['version'],'skill version mismatch')
   check(m['knowledgeLevel']==b['knowledgeLevel'],'module knowledge mismatch')
   check(set(b['outcomeCodes'])==set(outcomes[key]),'incomplete or invalid outcome coverage')
   check(m['learningOutcomes']==[outcomes[key][c] for c in b['outcomeCodes'] if c in outcomes[key]],'text and mapping outcomes mismatch')
 check(all(coverage[p]>=1 for p in pairs),'uncovered skill knowledge pair')
 for m in d['modules']:
  check(len(bindings[m['id']])==1,'module teaching cardinality')
  check(all(isinstance(m.get(k),str) and len(m[k].strip())>5 for k in ['title','description','includedScope','excludedScope','scenarioFocus']),'missing module description')
  check(m['organizationId']=='RESEARCH-AD-ORG' and m['benchmarkAvailability']=='CANDIDATE' and m['applicationPublicationState'] is None,'false application release state')
  check(m['durationMinutes'] is None and m['price'] is None,'invented cost or duration')
 check(len({m['description'] for m in modules.values()})==len(modules),'duplicate module descriptions')
 check(len({m['title'] for m in modules.values()})==len(modules),'duplicate module titles')
 reqkeys=[]
 for r in d['requirements']:
  reqkeys.append((r['roleLevel'],r['skillId']))
  check(r['roleId']==d['role']['id'] and r['roleLevel'] in {'Junior','Middle','Senior'},'invalid role requirement')
  check(bool(r['requiredKnowledgeLevels']) and len(set(r['requiredKnowledgeLevels']))==len(r['requiredKnowledgeLevels']),'empty or duplicate requirement groups')
  check(r['skillId'] in skills and r['skillVersion']==skills.get(r['skillId'],{}).get('version'),'requirement skill/version')
  check(all((r['skillId'],l) in pairs and coverage[(r['skillId'],l)] for l in r['requiredKnowledgeLevels']),'required group not covered')
 check(len(reqkeys)==len(set(reqkeys)),'duplicate role requirement')
 graph=defaultdict(list);sg=defaultdict(list);edgekeys=[]
 for e in d['prerequisites']:
  a=(e['dependentSkillId'],e['dependentKnowledgeLevel']);b=(e['prerequisiteSkillId'],e['prerequisiteKnowledgeLevel']);edgekeys.append((a,b))
  check(a in pairs and b in pairs and a!=b,'dangling or self prerequisite')
  check(e['applyToInitialGapExpansion'] is False,'unassessed prerequisite expansion enabled')
  check(len(e['rationale'].split())>=5,'missing prerequisite rationale')
  graph[a].append(b);sg[a[0]].append(b[0])
 check(len(edgekeys)==len(set(edgekeys)),'duplicate prerequisite')
 def acyclic(g):
  visiting=set();done=set()
  def visit(n):
   if n in visiting:return False
   if n in done:return True
   visiting.add(n)
   if not all(visit(x) for x in g.get(n,[])):return False
   visiting.remove(n);done.add(n);return True
  return all(visit(n) for n in list(g))
 check(acyclic(graph),'knowledge-pair prerequisite cycle');check(acyclic(sg),'skill prerequisite cycle')
 for obj in [d['role']]+sum([d[k] for k in ['skills','modules','teaching-bindings','requirements','prerequisites']],[]):
  check(obj.get('reviewStatus')=='NEEDS_EXPERT_REVIEW' and obj.get('reviewedBy') is None and obj.get('reviewedAt') is None,'fabricated review state')
  check(all(x in sources for x in obj.get('sourceIds',[])),'unknown source reference')
 man=d['manifest'];check(not man['frozen'] and man['profileCount']==0 and man['expertLabelCount']==0,'false freeze or generated profile/label claim')
 counts=man['counts'];check(counts['skills']==len(skills) and counts['modules']==len(modules) and counts['skillKnowledgePairs']==len(pairs) and counts['requirementRows']==len(d['requirements']) and counts['prerequisiteEdges']==len(d['prerequisites']),'manifest counts mismatch')
 for l,n in counts['requiredGroupsByRoleLevel'].items():check(n==sum(len(r['requiredKnowledgeLevels']) for r in d['requirements'] if r['roleLevel']==l),'role group counts mismatch')
 return errors

def negative_checks(d):
 cases={}
 def run(name,change):
  c=copy.deepcopy(d);change(c);cases[name]=bool(validate(c))
 run('dangling prerequisite',lambda c:c['prerequisites'][0].update(prerequisiteSkillId='MISSING'))
 run('duplicate module',lambda c:c['modules'].append(copy.deepcopy(c['modules'][0])))
 run('missing teaching coverage',lambda c:c.update({'teaching-bindings':[]}))
 run('fabricated expert approval',lambda c:c['skills'][0].update(reviewStatus='APPROVED',reviewedBy='invented'))
 run('wrong knowledge mapping',lambda c:c['teaching-bindings'][0].update(knowledgeLevel='UNKNOWN'))
 def cycle(c):
  e=copy.deepcopy(c['prerequisites'][0]);e['id']='NEGATIVE-CYCLE';e['dependentSkillId'],e['prerequisiteSkillId']=e['prerequisiteSkillId'],e['dependentSkillId'];e['dependentKnowledgeLevel'],e['prerequisiteKnowledgeLevel']=e['prerequisiteKnowledgeLevel'],e['dependentKnowledgeLevel'];c['prerequisites'].append(e)
 run('cycle',cycle)
 run('initial prerequisite expansion',lambda c:c['prerequisites'][0].update(applyToInitialGapExpansion=True))
 return cases

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--catalog',type=Path,default=DEFAULT);parser.add_argument('--output',type=Path);args=parser.parse_args()
 d=load(args.catalog);errors=validate(d)
 for name,expected in d['manifest']['files'].items():
  p=args.catalog/name
  if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:errors.append('checksum mismatch '+name)
 for src in d['sources'].values():
  if 'path' in src and not (args.catalog/src['path']).exists():errors.append('missing source file '+src['path'])
 negative=negative_checks(d)
 report={'date':'2026-11-23','scope':'Catalog structural checks only','status':'PASSED' if not errors and all(negative.values()) else 'FAILED','errors':errors,'negativeFixturesRejected':negative,'counts':d['manifest']['counts'],'reviewStatus':'NEEDS_EXPERT_REVIEW','profilesGenerated':0,'finalRq1Run':'NOT_RUN'}
 if args.output:args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2));return 0 if report['status']=='PASSED' else 1
if __name__=='__main__':raise SystemExit(main())
