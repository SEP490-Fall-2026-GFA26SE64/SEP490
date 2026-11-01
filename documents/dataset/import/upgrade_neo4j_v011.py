"""Explicit, backed-up local v0.9 -> v0.11 catalog upgrade; preserve authored modules.

Uses Neo4j's HTTP transaction API and Python's standard library. The normal
empty/identical importer remains unchanged. Run without --apply to inspect a plan.
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from graph_payload import build_payload
from validate_dataset import LABELS, TYPES, require, validate


def payload_snapshot(data):
    nodes, edges, _ = build_payload(data)
    return {
        'nodes': {key: {'labels': labels, 'properties': props} for key, (labels, props) in nodes.items()},
        'relationships': {key: {'type': kind, 'from': start, 'to': end, 'properties': props}
                          for key, (kind, start, end, props) in edges.items()},
    }


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def plan_upgrade(before, baseline, release, managed_ids):
    """Allow only an exact old/new catalog plus separately owned Module records."""
    for section in ('nodes', 'relationships'):
        require(set(baseline[section]) <= set(release[section]), f'Release removes original {section}')
        require(set(baseline[section]) <= set(before[section]), f'Runtime lacks original {section}')
        for key, current in before[section].items():
            if key in release[section]:
                require(current == baseline[section].get(key) or current == release[section][key],
                        f'Runtime {section} drift requires review: {key}')
    require(not (set(release['nodes']) & set(managed_ids)), 'Catalog IDs collide with an authoring document')
    extras = {key: value for key, value in before['nodes'].items() if key not in release['nodes']}
    for key, value in extras.items():
        require(value['labels'] == ['LearningModule'] and key in managed_ids,
                f'Unexpected noncatalog node: {key}')
    extra_edges = {key: value for key, value in before['relationships'].items() if key not in release['relationships']}
    for key, edge in extra_edges.items():
        require(edge['type'] == 'TEACHES' and edge['from'] in extras
                and edge['to'] in release['nodes'] and release['nodes'][edge['to']]['labels'] == ['MicroSkill'],
                f'Unexpected noncatalog relationship: {key}')
    expected = {'nodes': {**release['nodes'], **extras}, 'relationships': {**release['relationships'], **extra_edges}}
    return expected, {
        'beforeNodes': len(before['nodes']), 'beforeRelationships': len(before['relationships']),
        'catalogNodes': len(release['nodes']), 'catalogRelationships': len(release['relationships']),
        'catalogModules': sum(value['labels'] == ['LearningModule'] for value in release['nodes'].values()),
        'catalogTeachingPairs': sum(value['type'] == 'TEACHES' for value in release['relationships'].values()),
        'preservedAuthoredModules': len(extras), 'preservedAuthoredRelationships': len(extra_edges),
        'nodesToWrite': sum(before['nodes'].get(key) != value for key, value in release['nodes'].items()),
        'relationshipsToWrite': sum(before['relationships'].get(key) != value for key, value in release['relationships'].items()),
        'afterNodes': len(expected['nodes']), 'afterRelationships': len(expected['relationships']),
        'beforeDigest': digest(before), 'expectedDigest': digest(expected),
    }


def docker_inspect(container):
    return json.loads(subprocess.check_output(['docker', 'inspect', container]))[0]


def container_env(info):
    return dict(value.split('=', 1) for value in info['Config']['Env'] if '=' in value)


class LocalGraph:
    def __init__(self, url, username, password):
        parsed = urllib.parse.urlsplit(url)
        require(parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1', '::1'}
                and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment,
                'Only an explicit loopback Neo4j HTTP endpoint is supported')
        self.url = url.rstrip('/')
        self.authorization = 'Basic ' + base64.b64encode(f'{username}:{password}'.encode()).decode()

    def call(self, path, statements=None, method='POST'):
        body = None if statements is None else json.dumps({'statements': statements}).encode()
        request = urllib.request.Request(self.url + path, body, method=method,
                                        headers={'Authorization': self.authorization, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=300) as response:
            result = json.load(response)
        require(not result.get('errors'), 'Neo4j transaction error: ' + json.dumps(result.get('errors', [])))
        return result

    @staticmethod
    def statement(query, parameters=None):
        return {'statement': query, 'parameters': parameters or {}}

    def snapshot(self, path='/db/neo4j/tx/commit'):
        result = self.call(path, [
            self.statement('MATCH (n) RETURN labels(n), properties(n)'),
            self.statement('MATCH (a)-[r]->(b) RETURN type(r), a.id, b.id, properties(r)'),
        ])
        nodes, edges = {}, {}
        for row in result['results'][0]['data']:
            labels, props = row['row']
            require(props.get('id') and props['id'] not in nodes, 'Missing or duplicate node ID')
            require(all(type(value) in (str, bool, int, float) for value in props.values()), 'Unsupported graph property type')
            nodes[props['id']] = {'labels': sorted(labels), 'properties': props}
        for row in result['results'][1]['data']:
            kind, start, end, props = row['row']
            require(props.get('id') and props['id'] not in edges, 'Missing or duplicate relationship ID')
            require(all(type(value) in (str, bool, int, float) for value in props.values()), 'Unsupported relationship property type')
            edges[props['id']] = {'type': kind, 'from': start, 'to': end, 'properties': props}
        return {'nodes': nodes, 'relationships': edges}


def pg_query(container, user, database, sql):
    output = subprocess.check_output(['docker', 'exec', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
                                      '-U', user, '-d', database, '-c', sql], text=True)
    return output.strip()


def pg_fingerprint(container, user, database):
    tables = json.loads(pg_query(container, user, database,
        "SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='platform'"))
    parts = []
    for table in tables:
        require(table.replace('_', '').isalnum(), 'Unexpected table identifier')
        parts.append(f"SELECT '{table}' AS name, count(*) AS count, "
                     f"md5(coalesce(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text),'')) AS hash FROM platform.\"{table}\" t")
    return json.loads(pg_query(container, user, database,
        "SELECT json_object_agg(name,json_build_object('count',count,'hash',hash)) FROM (" + ' UNION ALL '.join(parts) + ') fingerprints'))


def write_private(path, value):
    with path.open('x', encoding='utf-8') as target:
        os.chmod(path, 0o600)
        json.dump(value, target, ensure_ascii=False, sort_keys=True, indent=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--neo4j-container', required=True)
    parser.add_argument('--postgres-container', required=True)
    parser.add_argument('--api-container', required=True)
    parser.add_argument('--neo4j-http-url', required=True)
    parser.add_argument('--backup-dir', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    base = Path(__file__).resolve().parent
    data, _ = validate(base / 'ontology_seed-v011.json')
    release = payload_snapshot(data)
    baseline = payload_snapshot(json.loads((base / 'ontology_seed.json').read_text()))
    neo = docker_inspect(args.neo4j_container)
    pg = docker_inspect(args.postgres_container)
    api = docker_inspect(args.api_container)
    projects = {info['Config']['Labels'].get('com.docker.compose.project') for info in (neo, pg, api)}
    require(len(projects) == 1 and None not in projects, 'Containers must belong to the same explicit Compose project')
    endpoint = urllib.parse.urlsplit(args.neo4j_http_url)
    bindings = neo['NetworkSettings']['Ports'].get('7474/tcp') or []
    require(any(int(binding['HostPort']) == endpoint.port and binding['HostIp'] in {'127.0.0.1', '::1'} for binding in bindings),
            'HTTP endpoint does not match the explicit local container')
    if args.apply:
        require(not api['State']['Running'], 'Stop the application writer before applying the upgrade')
    neo_env, pg_env = container_env(neo), container_env(pg)
    auth = neo_env.get('NEO4J_AUTH', '')
    require('/' in auth and auth != 'none', 'Expected the existing local Neo4j authentication configuration')
    username, password = auth.split('/', 1)
    graph = LocalGraph(args.neo4j_http_url, username, password)
    user, database = pg_env['POSTGRES_USER'], pg_env['POSTGRES_DB']
    managed = set(json.loads(pg_query(args.postgres_container, user, database,
        "SELECT coalesce(json_agg(module_id),'[]') FROM platform.module_authoring")))
    before = graph.snapshot()
    expected, plan = plan_upgrade(before, baseline, release, managed)
    plan.update(project=next(iter(projects)), neo4jContainer=args.neo4j_container, httpEndpoint=args.neo4j_http_url,
                releaseSha256=hashlib.sha256((base / 'ontology_seed-v011.json').read_bytes()).hexdigest())
    args.backup_dir.mkdir(parents=True, mode=0o700, exist_ok=False)
    write_private(args.backup_dir / 'plan.json', plan)
    print(json.dumps(plan, indent=2))
    if not args.apply:
        return
    write_private(args.backup_dir / 'graph-before.json', before)
    schema = graph.call('/db/neo4j/tx/commit', [graph.statement('SHOW CONSTRAINTS'), graph.statement('SHOW INDEXES')])
    write_private(args.backup_dir / 'schema-before.json', schema)
    fingerprint = pg_fingerprint(args.postgres_container, user, database)
    write_private(args.backup_dir / 'postgres-before.json', fingerprint)
    with (args.backup_dir / 'postgres-before.dump').open('xb') as dump:
        os.chmod(dump.name, 0o600)
        subprocess.run(['docker', 'exec', args.postgres_container, 'pg_dump', '-U', user, '-d', database, '-Fc'], stdout=dump, check=True)
    with (args.backup_dir / 'postgres-before.dump').open('rb') as dump:
        subprocess.run(['docker', 'exec', '-i', args.postgres_container, 'pg_restore', '--list'],
                       stdin=dump, stdout=subprocess.DEVNULL, check=True)
    backup_files = {path.name: {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                    for path in args.backup_dir.iterdir() if path.is_file()}
    write_private(args.backup_dir / 'backup-files.json', backup_files)
    transaction = graph.call('/db/neo4j/tx', [])
    path = urllib.parse.urlsplit(transaction['commit']).path.removesuffix('/commit')
    require(path.startswith('/db/neo4j/tx/') and path.rsplit('/', 1)[-1].isdigit(), 'Unexpected local transaction location')
    committed = False
    try:
        require(graph.snapshot(path) == before, 'Graph changed after backup; upgrade refused')
        statements = []
        for label in LABELS.values():
            rows = [value['properties'] for key, value in release['nodes'].items()
                    if value['labels'] == [label] and before['nodes'].get(key) != value]
            if rows:
                statements.append(graph.statement(f'UNWIND $rows AS row MERGE (n:{label} {{id:row.id}}) SET n=row', {'rows': rows}))
        for kind, endpoints in TYPES.items():
            for start, end in sorted(endpoints):
                rows = [{'from': value['from'], 'to': value['to'], 'props': value['properties']}
                        for key, value in release['relationships'].items() if value['type'] == kind
                        and release['nodes'][value['from']]['labels'] == [start]
                        and release['nodes'][value['to']]['labels'] == [end]
                        and before['relationships'].get(key) != value]
                if rows:
                    statements.append(graph.statement(f'UNWIND $rows AS row MATCH (a:{start} {{id:row.from}}), (b:{end} {{id:row.to}}) '
                        f'MERGE (a)-[r:{kind} {{id:row.props.id}}]->(b) SET r=row.props', {'rows': rows}))
        if statements:
            graph.call(path, statements)
        after = graph.snapshot(path)
        require(after == expected, 'Readback differs from the exact release plus preserved authored modules; rollback')
        require(pg_fingerprint(args.postgres_container, user, database) == fingerprint, 'PostgreSQL changed during upgrade; rollback')
        graph.call(path + '/commit', [])
        committed = True
    finally:
        if not committed:
            graph.call(path, method='DELETE')
    require(graph.snapshot() == expected, 'Committed graph readback mismatch')
    write_private(args.backup_dir / 'graph-after.json', after)
    write_private(args.backup_dir / 'receipt.json', {**plan, 'applied': True, 'postgresUnchanged': True,
        'actualDigest': digest(after), 'nodeLabels': dict(Counter(value['labels'][0] for value in after['nodes'].values())),
        'relationshipTypes': dict(Counter(value['type'] for value in after['relationships'].values()))})
    print('Verified v0.11 catalog; authored modules and all PostgreSQL platform rows preserved.')


if __name__ == '__main__':
    main()
