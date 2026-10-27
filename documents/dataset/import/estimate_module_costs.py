"""Reproducible synthetic study-effort and paid-package estimates for review.

These assumptions are not market quotes, observed completion times, or runtime
pricing rules. OC is deliberately excluded. Source material remains free where
its publisher provides it freely; price estimates refer to the learning package.
"""
import argparse
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SEED = ROOT / 'ontology_seed-v011.json'
MANIFEST = ROOT.parent / 'sources/local_review/module_effort_price_v011.json'

# Foundation study + a focused practice artifact for each catalog skill.
# Order follows the existing skill IDs, not OC or skill importance.
EFFORT = {
    'DE': [120,150,150,120,90,60,90,120,90,120,90,120,150,120,90,120],
    'FS': [90,120,150,150,120,90,150,120,90,90,120,120,150,120,120,90],
    'QA': [120,90,90,60,90,150,150,120,90,120,90,120,90,90,150,120],
    'ARC': [150,180,150,120,90,150],
    'CORE': [120,90,120,150],
    'GOV': [90,120,150],
    'INF': [120,150,180,90,120,180,150,150],
    'SEC': [150,150,150,180,180,180,150,120,90,120],
}
SKILL_MINUTES = {f'MS-{family}{i:02}': minutes
                 for family, values in EFFORT.items()
                 for i, minutes in enumerate(values, 1)}
TIER_FACTOR = {'J':1.0, 'M':1.35, 'S':1.75}
TIER_RATE = {'J':55000, 'M':75000, 'S':100000}
READ_RATE = {'ARC':75000,'CORE':50000,'GOV':55000,'INF':65000,'SEC':75000}
PACKAGE_FEE = {'DE':60000,'FS':45000,'QA':35000,
               'ARC':50000,'CORE':20000,'GOV':25000,'INF':40000,'SEC':50000}

def estimate(data):
    teaching = defaultdict(list)
    for edge in data['relationships']:
        if edge['type'] == 'TEACHES':
            teaching[edge['fromId']].append(edge['toId'])
    result = []
    for module in data['LearningModules']:
        if module['id'].startswith('MOD-FOCUS-'):
            pairs=[e for e in data['relationships'] if e['type']=='TEACHES' and e['fromId']==module['id']]
            primary=next(e for e in pairs if e['teachingFocus']=='PRIMARY')
            family=''.join(c for c in primary['toId'][3:] if c.isalpha())
            tier={'LOW':'J','MEDIUM':'M','HIGH':'S'}[primary['difficultyLevel']]
            effort_minutes={e['toId']:SKILL_MINUTES[e['toId']] * {'PRIMARY':1,'SUPPORTING':0.4,'INCIDENTAL':0}[e['teachingFocus']] for e in pairs}
            factor=TIER_FACTOR[tier];orientation=30;integration=30
            reflection={'J':30,'M':45,'S':60}[tier]
            duration=math.ceil((orientation+sum(effort_minutes.values())*factor+integration+reflection)/15)*15
            rate=TIER_RATE[tier];fee=PACKAGE_FEE[family]
            price=math.ceil((duration/60*rate+fee)/10000)*10000
            result.append({'moduleId':module['id'],'title':module['title'],'skillIds':[e['toId'] for e in pairs],
                           'tier':tier,'skillPracticeMinutes':effort_minutes,'tierEffortFactor':factor,
                           'orientationMinutes':orientation,'integrationMinutes':integration,'reflectionMinutes':reflection,
                           'assumedPackageRateVndPerHour':rate,'exercisePackageFeeVnd':fee,'duration':duration,'price':price,
                           'contentUri':module['contentUri'],'contentSha256':hashlib.sha256((ROOT/module['contentUri']).read_bytes()).hexdigest()})
            continue
        parts = module['id'].split('-')
        reading = module['moduleType'] == 'RESOURCE_GUIDED_PRACTICE'
        skills = teaching[module['id']]
        family = ''.join(c for c in parts[2] if c.isalpha()) if reading else parts[1]
        tier = None if reading else parts[2]
        factor = 1.0 if reading else TIER_FACTOR[tier]
        orientation = 30
        integration = 0 if reading else 30 * (len(skills)-1)
        reflection = 30 if reading else (45 if parts[-1]=='02' else 30)
        effort = sum(SKILL_MINUTES[s] for s in skills)
        duration = math.ceil((orientation + effort*factor + integration + reflection)/15)*15
        rate = READ_RATE[family] if reading else TIER_RATE[tier]
        fee = PACKAGE_FEE[family]
        price = math.ceil((duration/60*rate + fee)/10000)*10000
        result.append({
            'moduleId':module['id'], 'title':module['title'], 'skillIds':skills,
            'tier':tier, 'skillPracticeMinutes':{s:SKILL_MINUTES[s] for s in skills},
            'tierEffortFactor':factor, 'orientationMinutes':orientation,
            'integrationMinutes':integration, 'reflectionMinutes':reflection,
            'assumedPackageRateVndPerHour':rate, 'exercisePackageFeeVnd':fee,
            'duration':duration, 'price':price,
            'contentUri':module['contentUri'],
            'contentSha256':hashlib.sha256((ROOT/module['contentUri']).read_bytes()).hexdigest(),
        })
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write',action='store_true',help='Apply review estimates to v0.11 JSON and manifest only')
    args=parser.parse_args()
    data=json.loads(SEED.read_text())
    rows=estimate(data)
    if args.write:
        by_id={row['moduleId']:row for row in rows}
        for module in data['LearningModules']:
            module.update({key:by_id[module['id']][key] for key in ('duration','price')})
        SEED.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
        manifest={
            'catalogVersion':'0.11.0','estimateRevision':'effort-price-2',
            'reviewStatus':'NEEDS_EXPERT_REVIEW','currency':'VND','durationUnit':'minutes',
            'basis':'Synthetic authoring estimates from mapped skills and existing lesson/practice tasks. Not observed times, vendor quotes, source access fees, or runtime pricing policy.',
            'durationMethod':'ceil15(orientation + sum(skillPracticeMinutes) * tierEffortFactor + integration + reflection)',
            'priceMethod':'ceil10000(duration / 60 * assumedPackageRateVndPerHour + exercisePackageFeeVnd)',
            'scope':'Paid learning package estimate includes lesson/practice support; free linked official references are not being priced. No OC weighting, billing, or runtime selection rule.',
            'rounding':'Duration rounds up to 15 minutes; price rounds up to 10000 VND.',
            'modules':rows,
        }
        MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    for field in ('duration','price'):
        values=[row[field] for row in rows]
        print(f'{field}: {min(values)}..{max(values)}; {len(set(values))} distinct values across {len(values)} modules')
    for row in rows[:3]:print(row['moduleId'],row['duration'],row['price'])

if __name__=='__main__':main()
