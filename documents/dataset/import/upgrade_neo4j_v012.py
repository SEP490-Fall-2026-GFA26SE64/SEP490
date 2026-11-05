"""Explicit 0.11 -> 0.12 review-catalog migration; dry-run by default.

Only accepts an exact source release (or an identical already-upgraded graph).
Authored/tenant-specific graphs require separate reconciliation and are refused.
No PostgreSQL/learner/history writes. Never used as a startup migration.
"""
import argparse
import json
import os
from pathlib import Path
import urllib.parse
from upgrade_neo4j_v011 import LocalGraph, digest, write_private
from validate_single_skill_catalog import snapshot, validate, require

ROOT=Path(__file__).resolve().parent

def plan_upgrade(before, old, new):
    require(before==old or before==new,'Graph differs from the exact source release; review drift/authored/tenant nodes before migration')
    require(set(old['nodes'])==set(new['nodes']),'Node identities changed')
    retired=sorted(set(old['relationships'])-set(new['relationships']))
    require(all(old['relationships'][i]['type']=='TEACHES' for i in retired),'Only retired TEACHES links may be removed')
    return {'beforeDigest':digest(before),'afterDigest':digest(new),'nodes':len(new['nodes']),
            'teaches':sum(e['type']=='TEACHES' for e in new['relationships'].values()),
            'relationships':len(new['relationships']),'retiredTeaches':retired,
            'alreadyApplied':before==new}

def apply(graph, before, old, new, backup):
    plan=plan_upgrade(before,old,new)
    if plan['alreadyApplied']:return plan
    backup=Path(backup);backup.mkdir(mode=0o700,parents=True,exist_ok=False)
    write_private(backup/'graph-before.json',before);write_private(backup/'plan.json',plan)
    write_private(backup/'schema-before.json',graph.call('/db/neo4j/tx/commit',[graph.statement('SHOW CONSTRAINTS'),graph.statement('SHOW INDEXES')]))
    transaction=graph.call('/db/neo4j/tx',[])
    path=urllib.parse.urlsplit(transaction['commit']).path.removesuffix('/commit')
    require(path.startswith('/db/neo4j/tx/') and path.rsplit('/',1)[-1].isdigit(),'Invalid transaction path')
    committed=False
    try:
        graph.call(path,[graph.statement('UNWIND $ids AS id MATCH (n {id:id}) SET n.id=n.id',{'ids':sorted(old['nodes'])})])
        require(graph.snapshot(path)==before,'Graph changed after backup; refusing migration')
        statements=[graph.statement('MATCH ()-[r]->() WHERE r.id IN $ids DELETE r',{'ids':plan['retiredTeaches']})]
        for label in sorted({n['labels'][0] for n in new['nodes'].values()}):
            rows=[n['properties'] for n in new['nodes'].values() if n['labels']==[label]]
            statements.append(graph.statement(f'UNWIND $rows AS props MATCH (n:{label} {{id:props.id}}) SET n=props',{'rows':rows}))
        for kind in sorted({e['type'] for e in new['relationships'].values()}):
            rows=[{'from':e['from'],'to':e['to'],'props':e['properties']} for e in new['relationships'].values() if e['type']==kind]
            statements.append(graph.statement(f'UNWIND $rows AS row MATCH (a {{id:row.from}}),(b {{id:row.to}}) MERGE (a)-[r:{kind} {{id:row.props.id}}]->(b) SET r=row.props',{'rows':rows}))
        graph.call(path,statements)
        require(graph.snapshot(path)==new,'Migration readback differs; rolling back')
        graph.call(path+'/commit',[]);committed=True
        write_private(backup/'graph-after.json',new)
        return plan
    finally:
        if not committed:graph.call(path,method='DELETE')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--snapshot',type=Path,help='Offline graph snapshot; no database connection')
    p.add_argument('--url',help='Explicit loopback Neo4j HTTP URL')
    p.add_argument('--apply',action='store_true');p.add_argument('--backup-dir',type=Path)
    args=p.parse_args()
    data,_=validate(ROOT/'ontology_seed-v012.json');new=snapshot(data)
    old=snapshot(json.loads((ROOT/'ontology_seed-v011.json').read_text()))
    if args.snapshot:
        require(not args.apply,'Cannot apply an offline snapshot');before=json.loads(args.snapshot.read_text());graph=None
    else:
        require(args.url and os.environ.get('NEO4J_PASSWORD'),'Set loopback --url and NEO4J_PASSWORD privately')
        graph=LocalGraph(args.url,os.environ.get('NEO4J_USER','neo4j'),os.environ['NEO4J_PASSWORD']);before=graph.snapshot()
    result=plan_upgrade(before,old,new)
    if args.apply:
        require(args.backup_dir,'--apply requires a new private --backup-dir')
        result=apply(graph,before,old,new,args.backup_dir)
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
