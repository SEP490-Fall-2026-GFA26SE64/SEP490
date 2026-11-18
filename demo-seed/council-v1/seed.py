"""External demo CLI. Default validation is offline; apply/configure are explicit writes."""
import argparse
import base64
import hashlib
import http.cookiejar
import json
import os
import secrets
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LOCAL = ROOT / 'local' / 'council-demo-v1'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load_private():
    path = LOCAL / 'private.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                os.environ.setdefault(key, value)


def initialize(f):
    LOCAL.mkdir(parents=True, exist_ok=True)
    path = LOCAL / 'private.env'
    if path.exists():
        print('Existing private.env retained; credentials were not changed.')
        return
    values = dict(COUNCIL_DB_URL='jdbc:postgresql://127.0.0.1:29432/adapt_learn_graph_council_demo',
                  COUNCIL_DB_USER='adapt_learn_graph', COUNCIL_DB_PASSWORD=secrets.token_urlsafe(24),
                  COUNCIL_NEO4J_URI='bolt://127.0.0.1:29687', COUNCIL_NEO4J_USER='neo4j', COUNCIL_NEO4J_PASSWORD=secrets.token_urlsafe(24),
                  COUNCIL_ASSETS_PASSWORD=secrets.token_urlsafe(24),
                  COUNCIL_ENCRYPTION_KEY=base64.b64encode(secrets.token_bytes(32)).decode(),
                  COUNCIL_HMAC_KEY=base64.b64encode(secrets.token_bytes(32)).decode(),
                  COUNCIL_API_URL='http://127.0.0.1:29080', COUNCIL_EMPLOYEE_PASSWORD=secrets.token_urlsafe(20),
                  COUNCIL_MANAGER_EMAIL='manager@technova.com', COUNCIL_MANAGER_PASSWORD='Password123!',
                  COUNCIL_EXPERT_EMAIL='expert@technova.com', COUNCIL_EXPERT_PASSWORD='Password123!', COUNCIL_SEED_ALLOWED='false')
    with path.open('x', encoding='utf-8') as output:
        output.write('# Private isolated local demo. Preserve this file and keys across restarts.\n')
        output.write('\n'.join(f'{key}={value}' for key, value in values.items()) + '\n')
    path.chmod(0o600)
    sheet = '# Private council demo accounts\n\nWeb: http://127.0.0.1:29088/login\n\n| Actor | Login | Password |\n| --- | --- | --- |\n'
    sheet += f"| L&D | manager@technova.com | {values['COUNCIL_MANAGER_PASSWORD']} |\n| Expert | expert@technova.com | {values['COUNCIL_EXPERT_PASSWORD']} |\n"
    sheet += ''.join(f"| {row['name']} | {row['email']} | {values['COUNCIL_EMPLOYEE_PASSWORD']} |\n" for row in f['learners'])
    (LOCAL / 'ACCOUNTS.md').write_text(sheet, encoding='utf-8')
    print('Created private settings/account sheet in ignored local/council-demo-v1/. No database contacted; no credentials printed.')


def validate():
    payload = (HERE / 'fixture.json').read_bytes()
    require(hashlib.sha256(payload).hexdigest() == (HERE / 'fixture.sha256').read_text().strip(), 'Fixture hash mismatch. Review changes before rebuilding the fixture.')
    f = json.loads(payload)
    require(f['format'] == 'COUNCIL_DEMO_V1' and f['developmentOnly'], 'Not a development fixture')
    nodes = {n['properties']['id']: n for n in f['nodes']}
    require(len(nodes) == len(f['nodes']) == 18 and len(f['relationships']) == 25, 'Graph identity/inventory drift')
    require(len({n['properties']['name'] for n in f['nodes'] if n['label'] == 'Competency'}) == 2, 'Keep competency names unique for bootstrap deduplication')
    require(all(n['properties']['organizationId'] == f['organizationId'] for n in nodes.values()), 'Foreign organization')
    require(len(f['modules']) == 4 and len(f['items']) == 15 and len(f['learners']) == 11, 'Unexpected inventory')
    require(len({i['id'] for i in f['items']}) == len({i['versionId'] for i in f['items']}) == 15, 'Duplicate question/item ID')
    edges = f['relationships']
    require(len({e['properties']['id'] for e in edges}) == len(edges), 'Duplicate relationship ID')
    require(all(e['fromId'] in nodes and e['toId'] in nodes for e in edges), 'Dangling relationship')
    prerequisites = [e for e in edges if e['type'] == 'HAS_SKILL_PREREQUISITE']
    require(len(prerequisites) == 1 and (prerequisites[0]['fromId'], prerequisites[0]['toId']) == ('MS-DEMO-02', 'MS-DEMO-05'), 'Prerequisite closure changed')
    require(not any(e['type'] in ['TEACHES', 'REQUIRES_CERTIFICATE'] and 'MS-DEMO-03' in [e['fromId'], e['toId']] for e in edges), 'Bypass Skill C must truly have no provider')
    require(len([e for e in edges if e['type'] == 'REQUIRES_CERTIFICATE']) == 1, 'Expected one certificate definition')
    for index in [1, 2, 3, 5]:
        pool = [i['content'] for i in f['items'] if i['content']['skillId'] == f'MS-DEMO-0{index}']
        require(len(pool) == (3 if index == 3 else 4), 'Unexpected group pool')
        require(all(q['correctAnswer'] == (0 if index == 5 else 1) and len(q['options']) == len(set(q['options'])) == 4 for q in pool), 'Answer convention or options changed')
    for doc in f['modules']:
        p = doc['revisions'][0]['payload']
        require(p['metadata'] == {k: nodes[doc['id']]['properties'][k] for k in p['metadata']}, 'Module graph/document metadata mismatch')
        require(p['content']['lessons'][0]['body'] and p['skillVersion'] == '0.12.1', 'Missing lesson or exact Skill version')
    print(f"Offline fixture valid: {len(nodes)} nodes, {len(edges)} edges, 4 modules, 15 questions, 11 clean learners.")
    print('Expected: baseline 12 -> 4 gaps; A=3/3; B MAIN=3/3/P=0/3; P=3/3; certificate D; C bypass.')
    return f


def prepare():
    wrapper = ROOT / 'backend' / ('mvnw.cmd' if os.name == 'nt' else 'mvnw')
    subprocess.run([str(wrapper), '-f', str(ROOT / 'backend/pom.xml'), '-DskipTests', '-Dmaven.test.skip=true', 'package'], cwd=ROOT, check=True)
    jar = ROOT / 'backend/target/adapt-learn-graph.jar'
    digest = hashlib.sha256(jar.read_bytes()).hexdigest()[:12]
    build = LOCAL / digest
    build.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(jar) as archive:
        for name in archive.namelist():
            if not name.endswith('/') and (name.startswith('BOOT-INF/lib/') or name.startswith('BOOT-INF/classes/')):
                target = build / Path(name)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(name))
    classes = build / 'external-classes'
    classes.mkdir(exist_ok=True)
    cp = os.pathsep.join([str(build / 'BOOT-INF/classes'), *map(str, sorted((build / 'BOOT-INF/lib').glob('*.jar')))])
    # javac argfile avoids Windows command-line length and space/escaping problems.
    argfile = build / 'javac.args'
    argfile.write_text('\n'.join(json.dumps(s.replace('\\', '/')) for s in ['-encoding', 'UTF-8', '-cp', cp, '-d', str(classes), str(HERE / 'CouncilDemoSeed.java')]), encoding='utf-8')
    subprocess.run(['javac', '@' + str(argfile)], cwd=ROOT, check=True)
    LOCAL.mkdir(parents=True, exist_ok=True)
    (LOCAL / 'runtime.json').write_text(json.dumps(dict(classpath=os.pathsep.join([str(classes), cp]),
        importerSha256=hashlib.sha256((HERE / 'CouncilDemoSeed.java').read_bytes()).hexdigest())), encoding='utf-8')
    java('validate')


def java(action):
    path = LOCAL / 'runtime.json'
    require(path.exists(), 'Run prepare first to compile the external importer against the current backend.')
    settings = json.loads(path.read_text())
    require(settings['importerSha256'] == hashlib.sha256((HERE / 'CouncilDemoSeed.java').read_bytes()).hexdigest(), 'Importer changed: run prepare again.')
    args = LOCAL / 'java.args'
    args.write_text('\n'.join(json.dumps(s.replace('\\', '/')) for s in ['-cp', settings['classpath'], 'CouncilDemoSeed', action, str(HERE / 'fixture.json')]), encoding='utf-8')
    subprocess.run(['java', '@' + str(args)], cwd=ROOT, check=True)


def configure(f, include_baseline=False):
    base = os.environ.get('COUNCIL_API_URL', 'http://127.0.0.1:29080').rstrip('/')
    require(base == 'http://127.0.0.1:29080', 'Only local HTTP council demo API at port 29080 accepted')
    require(os.environ.get('COUNCIL_SEED_ALLOWED') == 'true', 'Set COUNCIL_SEED_ALLOWED=true for explicit configuration writes')
    for purpose, email_key, password_key, role in [
        ('SKILL_ASSESSMENT', 'COUNCIL_EXPERT_EMAIL', 'COUNCIL_EXPERT_PASSWORD', 'DOMAIN_EXPERT'),
        *([('BASELINE', 'COUNCIL_MANAGER_EMAIL', 'COUNCIL_MANAGER_PASSWORD', 'LD_MANAGER')] if include_baseline else []),
    ]:
        client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def call(path, body=None, method=None):
            headers = {}
            if body is not None:
                csrf = call('/api/v1/workspace-auth/csrf')
                headers = {csrf['headerName']: csrf['token'], 'Content-Type': 'application/json'}
            request = urllib.request.Request(base + path, headers=headers, data=None if body is None else json.dumps(body).encode(), method=method)
            with client.open(request, timeout=30) as response:
                return None if response.status == 204 else json.load(response)

        email = os.environ.get(email_key, 'expert@technova.com' if purpose == 'SKILL_ASSESSMENT' else 'manager@technova.com')
        require(os.environ.get(password_key), f'Set private environment variable {password_key}')
        session = call('/api/v1/workspace-auth/sign-in', dict(email=email, password=os.environ[password_key]))
        require(session.get('stage') == 'COMPLETE' and session.get('organizationId') == f['organizationId'] and role in session.get('roles', []), 'Unexpected authenticated session')
        directory = call(f'/api/v1/assessment-policies/{purpose}/scopes?page=0&size=100')
        choices = directory['choices']
        for recipe in [p for p in f['policies'] if p['purpose'] == purpose]:
            found = [s for s in choices if s['ownerId'] == recipe['ownerId'] and s['levelId'] == recipe['levelId']]
            require(len(found) == 1 and found[0]['ready'], 'Exact policy scope unavailable or not ready')
            route = f"/api/v1/assessment-policies/{purpose}/scopes/{found[0]['key']}"
            workspace = call(route)
            if workspace.get('active'):
                require(workspace['active']['configuration'] == recipe['configuration'] and workspace['active']['catalogHash'] == workspace['scope']['catalogHash'], 'Existing policy differs; preserved without overwrite')
                print('Existing matching policy retained:', recipe['ownerId'])
                continue
            require(not workspace.get('draft'), 'Existing draft preserved; finish it manually or review it before configuring')
            workspace = call(route + '/draft', dict(commandKey=str(uuid.uuid4()), expectedActivationRevision=workspace['activationRevision']))
            draft = workspace['draft']
            workspace = call(route + '/draft', dict(commandKey=str(uuid.uuid4()), draftId=draft['id'], expectedRevision=draft['revision'], expectedCatalogHash=workspace['scope']['catalogHash'], configuration=recipe['configuration']), method='PUT')
            draft = workspace['draft']
            call(route + '/activation', dict(commandKey=str(uuid.uuid4()), draftId=draft['id'], expectedRevision=draft['revision'], expectedActivationRevision=workspace['activationRevision'], expectedCatalogHash=workspace['scope']['catalogHash']))
            print('Configured through normal assigned-actor API:', recipe['ownerId'])
        call('/api/v1/workspace-auth/sign-out', {})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', nargs='?', default='validate', choices=['validate', 'init', 'prepare', 'score', 'check', 'apply', 'verify', 'configure'])
    parser.add_argument('--include-baseline', action='store_true', help='Also configure L&D baseline; omit to demonstrate it live')
    args = parser.parse_args()
    try:
        fixture = validate()
        load_private()
        if args.action == 'init':
            initialize(fixture)
        elif args.action == 'prepare':
            prepare()
        elif args.action == 'score':
            java('validate')
        elif args.action in ['check', 'apply', 'verify']:
            java(args.action)
        elif args.action == 'configure':
            configure(fixture, args.include_baseline)
    except (ValueError, subprocess.CalledProcessError, urllib.error.URLError, OSError) as error:
        print(f'Council demo: {error}', file=sys.stderr)
        sys.exit(1)
