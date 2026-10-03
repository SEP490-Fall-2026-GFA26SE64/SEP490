#!/usr/bin/env python3
"""Seed local PostgreSQL demo identities, then import the aligned Neo4j workbook."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import import_neo4j_dataset as graph

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent.parent
ORG_ID = '00000000-0000-0000-0000-000000000001'
COMPOSE = ['docker', 'compose', '-f', 'compose.dev.yml']


def run(arguments, sql=None):
    result = subprocess.run(arguments, cwd=ROOT, input=sql, text=True,
                            capture_output=True, timeout=180)
    if result.returncode:
        # psql errors contain schema/fixture identifiers, not passwords.
        raise graph.ValidationError(result.stderr.strip() or 'Docker/psql command failed')
    return result.stdout


def validate_workbook(path):
    data = graph.prepare(graph.read_xlsx(path))
    graph.require({r['organizationId'] for r in data['Target Roles']} == {ORG_ID},
                  'Workbook organizationId must match the ALG_DEMO organization UUID ' + ORG_ID)
    return data


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', type=Path, default=graph.DEFAULT_FILE)
    parser.add_argument('--dry-run', action='store_true', help='Validate workbook and display plan without databases')
    parser.add_argument('--identity-only', action='store_true', help='Seed PostgreSQL and check workbook alignment; skip Neo4j import')
    args = parser.parse_args(argv)
    try:
        validate_workbook(args.file)
        print('Organization: ALG_DEMO / ' + ORG_ID, flush=True)
        print('Accounts: org-admin@alg-demo.example, expert@alg-demo.example, employee@alg-demo.example', flush=True)
        if args.dry_run:
            print('Plan: seed PostgreSQL identities, then import catalog; no database contacted.')
            return 0
        config = json.loads(run(COMPOSE + ['config', '--format', 'json']))
        pg = config['services']['postgres']['environment']
        command = COMPOSE + ['exec', '-T', 'postgres', 'psql', '-X', '-q', '-A', '-t',
                             '-v', 'ON_ERROR_STOP=1', '-U', pg['POSTGRES_USER'], '-d', pg['POSTGRES_DB']]
        if args.identity_only:
            print(run(command, (BASE / 'seed_demo_identity.sql').read_text()), end='', flush=True)
            print('PostgreSQL identities committed; workbook organizationId matches. Neo4j was not changed.')
            return 0
        neo = config['services']['neo4j']
        user, password = neo['environment']['NEO4J_AUTH'].split('/', 1)
        port = next(p['published'] for p in neo['ports'] if int(p['target']) == 7474)
        # Both stores must come from this local Compose project, never remote env overrides.
        url = 'http://127.0.0.1:' + str(port)
        graph.require(os.environ.get('NEO4J_HTTP_URL', url) == url,
                      'Remote/custom NEO4J_HTTP_URL conflicts with local demo setup')
        graph.require(os.environ.get('NEO4J_DATABASE', 'neo4j') == 'neo4j',
                      'Demo setup uses the Compose neo4j database')
        with graph_context(url, user, password) as client:
            graph.wait_ready(client, 180)
            client.begin()
            graph.check_constraints(client)
            graph.merge_preview(graph.snapshot(client), validate_workbook(args.file))
            client.rollback()
        print(run(command, (BASE / 'seed_demo_identity.sql').read_text()), end='', flush=True)
        print('PostgreSQL committed. Importing Neo4j; rerun safely if this step fails.', flush=True)
        env = dict(os.environ, NEO4J_HTTP_URL=url, NEO4J_USER=user, NEO4J_PASSWORD=password,
                   NEO4J_DATABASE='neo4j', DATASET_ORGANIZATION_ID=ORG_ID)
        result = subprocess.run([sys.executable, str(BASE / 'import_neo4j_dataset.py'),
                                 '--file', str(args.file.resolve())], cwd=ROOT, env=env)
        if result.returncode:
            print('PostgreSQL identities remain committed. Fix the reported graph error and rerun.', file=sys.stderr)
        return result.returncode
    except (graph.ValidationError, OSError, subprocess.TimeoutExpired, ValueError, KeyError, StopIteration) as exc:
        print('ERROR: ' + str(exc), file=sys.stderr)
        print('Start Compose and complete its migrate service (V1–V6) before setup.', file=sys.stderr)
        return 1


class graph_context:
    def __init__(self, url, user, password):
        self.client = graph.Neo4jHTTP(url, 'neo4j', user, password)

    def __enter__(self):
        return self.client

    def __exit__(self, *args):
        self.client.rollback()


if __name__ == '__main__':
    sys.exit(main())
