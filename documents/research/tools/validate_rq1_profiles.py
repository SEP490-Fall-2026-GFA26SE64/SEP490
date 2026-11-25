"""Independent read-only checks for the draft cohort, not expert label validation."""
from pathlib import Path
import argparse,collections,copy,hashlib,itertools,json
ROOT=Path(__file__).resolve().parents[1]
def read_lines(p):return [json.loads(x) for x in p.read_text().splitlines() if x.strip()]
def key(r):return r['skillId']+'|'+r['knowledgeLevel']
def check_profiles(profiles,requirements,splits):
 errors=[]
 def require(ok,message):
  if not ok:errors.append(message)
 expected={l:{(r['skillId'],k,r['skillVersion']) for r in requirements if r['roleLevel']==l for k in r['requiredKnowledgeLevels']} for l in ['Junior','Middle','Senior']}
 ids=[p['profileId'] for p in profiles];require(len(ids)==500 and len(set(ids))==500,'profile identity/count')
 a=set(splits['development']);b=set(splits['gold50']);pilot=set(splits['pilot10'])
 require(len(a)==450 and len(b)==50 and not a&b and a|b==set(ids),'split separation')
 require(len(pilot)==10 and pilot<=a and not pilot&b,'pilot leakage')
 signatures=set();needsets=collections.defaultdict(list)
 for p in profiles:
  pid=p['profileId'];req=p['targetRequirements'];triples={(r['skillId'],r['knowledgeLevel'],r['skillVersion']) for r in req}
  require(triples==expected.get(p['roleLevel']) and len(req)==len(triples),'target mismatch '+pid)
  valid={key(x):x for x in req};official={key(x):x for x in p['officialEvidence']};base={key(x):x for x in p['baselineObservations']}
  require(len(official)==len(p['officialEvidence']) and len(base)==len(p['baselineObservations']),'duplicate evidence '+pid)
  require(not official.keys()&base.keys() and official.keys()|base.keys()==valid.keys(),'evidence partition '+pid)
  for x in list(official.values())+list(base.values()):
   require(key(x) in valid and x['skillVersion']==valid.get(key(x),{}).get('skillVersion'),'incompatible evidence '+pid)
  require(all(x['compatible'] is True and x['isRealAchievement'] is False and x['recordType']=='SYNTHETIC_OFFICIAL_EVIDENCE' for x in official.values()),'false official evidence '+pid)
  require(all(x['outcome'] in ['PASSED','FAILED'] and x['grantsOfficialAchievement'] is False for x in base.values()),'baseline grants achievement '+pid)
  derived={k for k in valid if k not in official and base.get(k,{}).get('outcome')!='PASSED'}
  actual={key(x) for x in p['learningNeeds']}
  require(actual==derived and len(actual)==len(p['learningNeeds'])==p['gapCount'],'gap derivation '+pid)
  require(all(x==valid.get(key(x)) for x in p['learningNeeds']),'gap snapshot '+pid)
  require(1<=p['gapCount']<=9,'nonpositive or out-of-range gap '+pid)
  bounds={'LOW':(1,2),'MEDIUM':(3,5),'HIGH':(6,9)}.get(p['gapBand'],(0,0));require(bounds[0]<=p['gapCount']<=bounds[1],'gap stratum '+pid)
  statuses={key(x):x['state'] for x in p['requirementStates']}
  expected_states={k:'OFFICIALLY_ACHIEVED' if k in official else 'BASELINE_EXEMPT' if base.get(k,{}).get('outcome')=='PASSED' else 'NEEDS_LEARNING' for k in valid}
  require(statuses==expected_states and len(p['requirementStates'])==len(valid),'state derivation '+pid)
  require(p['split']==('development' if pid in a else 'gold50'),'split field '+pid)
  require(p['recordType']=='SYNTHETIC_RESEARCH_PROFILE' and p['organizationId']=='RESEARCH-AD-ORG' and p['humanValidationStatus']=='PENDING','false human validation '+pid)
  require(p['goldLabelStatus']==('PENDING_EXPERT_ANNOTATION' if pid in b else 'NOT_APPLICABLE'),'false gold status '+pid)
  require(not p['carriedSupplementaryRequirements'],'unexpected history expansion '+pid)
  sig=(p['roleLevel'],tuple(sorted(actual)));require(sig not in signatures,'duplicate learning needs '+pid);signatures.add(sig);needsets[p['roleLevel']].append((pid,actual))
  canonical=json.dumps(sorted(actual),ensure_ascii=False,sort_keys=True,separators=(',',':'))
  require(p['gapSignature']==hashlib.sha256(canonical.encode()).hexdigest(),'gap signature '+pid)
  covered=len(req)-len(actual);fraction={'BASELINE_ONLY':0,'MIXED':.35,'OFFICIAL_RICH':.70}.get(p['evidenceHistoryStratum'],-1)
  require(len(official)==round(covered*fraction),'history stratum '+pid)
 nearest=0.0
 for l,rows in needsets.items():
  for (ida,sa),(idb,sb) in itertools.combinations(rows,2):
   sim=len(sa&sb)/len(sa|sb) if sa|sb else 1;nearest=max(nearest,sim)
   if sim>=.8:errors.append('near duplicate gap sets '+ida+' '+idb)
 return errors,nearest

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--dataset',type=Path,default=ROOT/'data/rq1/profiles-v0.1');ap.add_argument('--output',type=Path);args=ap.parse_args();d=args.dataset
 profiles=read_lines(d/'profiles.jsonl');req=json.loads((d/'catalog-snapshot/requirements.json').read_text());splits=json.loads((d/'splits.json').read_text());manifest=json.loads((d/'manifest.json').read_text())
 errors,maxsim=check_profiles(profiles,req,splits)
 for split,name in [('development','development450.jsonl'),('gold50','gold50-profiles.jsonl')]:
  if read_lines(d/name)!=[p for p in profiles if p['split']==split]:errors.append('split export mismatch '+name)
 for n,h in manifest['files'].items():
  if not (d/n).is_file() or hashlib.sha256((d/n).read_bytes()).hexdigest()!=h:errors.append('hash mismatch '+n)
 mods={m['id']:m for m in json.loads((d/'catalog-snapshot/modules.json').read_text())};gold=set(splits['gold50']);expected_pairs=set(itertools.product(gold,mods))
 for slot in ['A','B']:
  rows=read_lines(d/f'annotation/reviewer-{slot}.template.jsonl');pairs=[(x['profileId'],x['moduleId']) for x in rows]
  if len(pairs)!=3600 or set(pairs)!=expected_pairs:errors.append('annotation coverage '+slot)
  if any(x['judged'] or any(x[k] is not None for k in ['grade','reason','preferredRank','reviewerId','annotatedAt']) for x in rows):errors.append('fabricated annotation '+slot)
  for x in rows:
   m=mods.get(x['moduleId'],{})
   if x['moduleRevision']!=m.get('revision') or x['contentVersion']!=m.get('contentVersion'):errors.append('annotation version mismatch')
  for pid in gold:
   if {x['displayPosition'] for x in rows if x['profileId']==pid}!=set(range(1,73)):errors.append('display order '+pid)
 adj=read_lines(d/'annotation/adjudication.template.jsonl')
 if len(adj)!=50 or {x['profileId'] for x in adj}!=gold or any(any(x[k] is not None for k in ['acceptedModuleIds','preferredTop5','adjudicatorId','adjudicatedAt']) for x in adj):errors.append('fabricated adjudication')
 if manifest['expertJudgmentCount']!=0 or manifest['frozen'] or manifest['goldStatus']!='AWAITING_EXPERT_LABELS':errors.append('manifest status')
 negatives={}
 def negative(name,modify):
  p=copy.deepcopy(profiles);s=copy.deepcopy(splits);modify(p,s);negatives[name]=bool(check_profiles(p,req,s)[0])
 negative('overlapping splits',lambda p,s:s['gold50'].__setitem__(0,s['development'][0]))
 negative('pilot contamination',lambda p,s:s['pilot10'].__setitem__(0,s['gold50'][0]))
 negative('incorrect initial gap',lambda p,s:p[0]['learningNeeds'].pop())
 negative('baseline converted to achievement',lambda p,s:p[0]['baselineObservations'][0].update(grantsOfficialAchievement=True))
 negative('mismatched skill version',lambda p,s:p[0]['targetRequirements'][0].update(skillVersion='WRONG'))
 negative('false gold validation',lambda p,s:next(x for x in p if x['split']=='gold50').update(goldLabelStatus='VERIFIED'))
 if not all(negatives.values()):errors.append('negative fixture escaped')
 report={'date':'2026-11-23','status':'PASSED' if not errors else 'FAILED','errors':errors,'profileCount':len(profiles),'splitCounts':{k:len(v) for k,v in splits.items()},'maximumWithinRoleGapJaccard':maxsim,'negativeFixturesRejected':negatives,'humanLabels':0,'runtimeParity':'NOT_VERIFIED','meaning':'Structural validity only; not expert gold verification or final research results.'}
 if args.output:args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2));return 0 if not errors else 1
if __name__=='__main__':raise SystemExit(main())
