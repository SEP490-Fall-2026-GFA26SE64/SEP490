"""Explicit guarded main workspace cutover; preserves tenant/Expert metadata and history.

Accepts only the retained 0.11 catalog + exact SE prerequisite supplement, or its
identical 0.12 result. No arbitrary tenant/authored graph reconciliation.
"""
import argparse
import copy
import json
import os
import urllib.parse
from pathlib import Path
from uuid import UUID
from upgrade_neo4j_v011 import LocalGraph, digest, write_private
from upgrade_neo4j_v012 import plan_upgrade
from validate_single_skill_catalog import snapshot, validate, require
ROOT=Path(__file__).resolve().parent
ORG='e0000000-0000-0000-0000-000000000001'

def expected(before):
    old=snapshot(json.loads((ROOT/'ontology_seed-v011.json').read_text()))
    data,_=validate(ROOT/'ontology_seed-v012.json');new=snapshot(data)
    supplement=json.loads((ROOT.parents[2]/'backend/src/main/resources/db/seed/se-modules.json').read_text())
    for row in supplement['relationships']:
        p={k:v for k,v in row.items() if v is not None};kind=p.pop('type');a=p.pop('fromId');b=p.pop('toId')
        old['relationships'][p['id']]={'type':kind,'from':a,'to':b,'properties':p}
        e=copy.deepcopy(old['relationships'][p['id']]);e['properties']['version']='0.12.0';new['relationships'][p['id']]=e
    require(set(before['nodes'])==set(old['nodes']),'Unknown/missing workspace node; reconciliation required')
    for key,o in old['nodes'].items():
        current=before['nodes'][key];meta={}
        require(current['properties'].get('organizationId')==ORG,'Unexpected tenant ownership')
        meta['organizationId']=ORG
        for field in ('assignedExpertId','assignedExpertName'):
            if field in current['properties']:
                require(o['labels']==['TargetRole'],'Unexpected Expert metadata owner')
                meta[field]=current['properties'][field]
        if 'assignedExpertId' in meta:UUID(meta['assignedExpertId'])
        o['properties'].update(meta);new['nodes'][key]['properties'].update(meta)
        if o['labels']==['JobPosition']:o['labels']=['Occupation']
    return old,new

def plan(before):
    old,new=expected(before)
    result=plan_upgrade(before,old,new)
    result['preservedOrganizationId']=ORG
    result['renamedOccupationNodes']=5
    result['preservedSePrerequisites']=3
    return old,new,result

def apply(g,before,backup):
    old,new,result=plan(before)
    if result['alreadyApplied']:return result
    backup.mkdir(mode=0o700,parents=True,exist_ok=False)
    write_private(backup/'graph-before.json',before);write_private(backup/'plan.json',result)
    write_private(backup/'schema-before.json',g.call('/db/neo4j/tx/commit',[g.statement('SHOW CONSTRAINTS'),g.statement('SHOW INDEXES')]))
    tx=g.call('/db/neo4j/tx',[]);path=urllib.parse.urlsplit(tx['commit']).path.removesuffix('/commit')
    require(path.startswith('/db/neo4j/tx/') and path.rsplit('/',1)[-1].isdigit(),'Invalid transaction')
    committed=False
    try:
        g.call(path,[g.statement('UNWIND $ids AS id MATCH (n {id:id}) SET n.id=n.id',{'ids':sorted(old['nodes'])})])
        require(g.snapshot(path)==before,'Concurrent graph change; refusing cutover')
        statements=[g.statement('MATCH (n:Occupation) WHERE n.id IN $ids REMOVE n:Occupation SET n:JobPosition',{'ids':[k for k,n in new['nodes'].items() if n['labels']==['JobPosition']]}),g.statement('MATCH ()-[r]->() WHERE r.id IN $ids DELETE r',{'ids':result['retiredTeaches']})]
        for label in sorted({n['labels'][0] for n in new['nodes'].values()}):
            statements.append(g.statement(f'UNWIND $rows AS p MATCH (n:{label} {{id:p.id}}) SET n=p',{'rows':[n['properties'] for n in new['nodes'].values() if n['labels']==[label]]}))
        for kind in sorted({e['type'] for e in new['relationships'].values()}):
            rows=[{'a':e['from'],'b':e['to'],'p':e['properties']} for e in new['relationships'].values() if e['type']==kind]
            statements.append(g.statement(f'UNWIND $rows AS row MATCH (a {{id:row.a}}),(b {{id:row.b}}) MERGE (a)-[r:{kind} {{id:row.p.id}}]->(b) SET r=row.p',{'rows':rows}))
        g.call(path,statements);require(g.snapshot(path)==new,'Cutover readback mismatch')
        g.call(path+'/commit',[]);committed=True;write_private(backup/'graph-after.json',new)
        return result
    finally:
        if not committed:g.call(path,method='DELETE')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url');p.add_argument('--snapshot',type=Path);p.add_argument('--apply',action='store_true');p.add_argument('--backup-dir',type=Path);a=p.parse_args()
    if a.snapshot:
        require(not a.apply,'Offline snapshots cannot be applied');before=json.loads(a.snapshot.read_text());g=None
    else:
        require(a.url and os.environ.get('NEO4J_PASSWORD'),'Set loopback URL and password privately')
        g=LocalGraph(a.url,os.environ.get('NEO4J_USER','neo4j'),os.environ['NEO4J_PASSWORD']);before=g.snapshot()
    _,_,result=plan(before)
    if a.apply:
        require(a.backup_dir,'A new private backup directory is required');result=apply(g,before,a.backup_dir)
        g.call('/db/neo4j/tx/commit',[g.statement('CREATE CONSTRAINT ontology_v012_jobposition_id IF NOT EXISTS FOR (n:JobPosition) REQUIRE n.id IS UNIQUE')])
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
