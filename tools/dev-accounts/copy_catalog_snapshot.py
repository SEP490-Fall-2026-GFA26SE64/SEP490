#!/usr/bin/env python3
"""Copy a saved catalog snapshot only into an empty or identical local dev graph."""
import base64
import json
from urllib.request import Request, urlopen
from accounts import STATE, settings

LABELS = {'Competency', 'LearningModule', 'Level', 'MicroSkill', 'Occupation', 'TargetRole'}
TYPES = {'HAS_COMPETENCY', 'HAS_LEVEL', 'HAS_ROLE', 'HAS_SKILL', 'HAS_SKILL_PREREQUISITE', 'REQUIRES_SKILL', 'TEACHES'}
values = settings()
snapshot = json.loads((STATE / 'legacy-graph-snapshot.json').read_text())
assert all(len(labels) == 1 and labels[0] in LABELS and props.get('id') for labels, props in snapshot['nodes'])
assert all(kind in TYPES and props.get('id') for kind, _, _, props in snapshot['edges'])
assert len({props['id'] for _, props in snapshot['nodes']}) == len(snapshot['nodes'])


def call(statements, path='/db/neo4j/tx/commit'):
    token = base64.b64encode(('neo4j:' + values['DEV_ACCOUNTS_NEO4J_PASSWORD']).encode()).decode()
    request = Request('http://127.0.0.1:28174' + path, data=json.dumps({'statements': statements}).encode(),
                      headers={'Authorization': 'Basic ' + token, 'Content-Type': 'application/json'})
    with urlopen(request, timeout=120) as response:
        result = json.load(response)
    if result.get('errors'):
        raise RuntimeError('Catalog copy refused: ' + str(result['errors']))
    return result


query_nodes = 'MATCH (n) WHERE n.id IS NOT NULL RETURN labels(n),properties(n)'
query_edges = 'MATCH (a)-[r]->(b) RETURN type(r),a.id,b.id,properties(r)'
original = call([{'statement': query_nodes}, {'statement': query_edges}])
current = {'nodes': [row['row'] for row in original['results'][0]['data']], 'edges': [row['row'] for row in original['results'][1]['data']]}
canonical = lambda rows: sorted(json.dumps(row, sort_keys=True) for row in rows)
if current['nodes'] or current['edges']:
    if all(canonical(current[key]) == canonical(snapshot[key]) for key in ['nodes', 'edges']):
        print('Exact catalog snapshot already present; no writes.')
    else:
        raise SystemExit('Destination is neither empty nor identical; no catalog overwritten.')
else:
    statements = []
    for label in sorted(LABELS):
        rows = [props for labels, props in snapshot['nodes'] if labels == [label]]
        statements.append({'statement': f'UNWIND $rows AS props CREATE (n:{label}) SET n=props', 'parameters': {'rows': rows}})
    for kind in sorted(TYPES):
        rows = [{'source': source, 'target': target, 'props': props} for relation, source, target, props in snapshot['edges'] if relation == kind]
        statements.append({'statement': f'UNWIND $rows AS row MATCH (a {{id:row.source}}),(b {{id:row.target}}) CREATE (a)-[r:{kind}]->(b) SET r=row.props', 'parameters': {'rows': rows}})
    call(statements)
    final = call([{'statement': query_nodes}, {'statement': query_edges}])
    actual = {'nodes': [row['row'] for row in final['results'][0]['data']], 'edges': [row['row'] for row in final['results'][1]['data']]}
    assert all(canonical(actual[key]) == canonical(snapshot[key]) for key in ['nodes', 'edges']), 'Catalog differs from source snapshot'
    call([{'statement': f'CREATE CONSTRAINT dev_{label.lower()}_id IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE'} for label in sorted(LABELS)])
    print(f'Catalog copied and compared exactly: {len(actual["nodes"])} nodes, {len(actual["edges"])} relationships.')
