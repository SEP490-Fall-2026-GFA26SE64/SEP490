"""Offline contract tests: fixed scoring uses Java separately; these cover fixture/HTTP safety."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import seed
from build_fixture import build


class FixtureTests(unittest.TestCase):
    def temporary(self):
        parent = seed.LOCAL.resolve()
        self.assertTrue(parent.is_relative_to(seed.ROOT.resolve()))
        parent.mkdir(parents=True, exist_ok=True)
        return tempfile.TemporaryDirectory(prefix='test-', dir=parent)

    def test_checked_in_release_is_reproducible(self):
        self.assertEqual(json.loads((seed.HERE / 'fixture.json').read_text(encoding='utf-8')), build())
        seed.validate()

    def test_missing_provider_and_prerequisite_are_actual_graph_conditions(self):
        f = build()
        e = f['relationships']
        self.assertEqual([(r['fromId'], r['toId']) for r in e if r['type'] == 'HAS_SKILL_PREREQUISITE'], [('MS-DEMO-02', 'MS-DEMO-05')])
        self.assertFalse(any(r['type'] in ['TEACHES', 'REQUIRES_CERTIFICATE'] and 'MS-DEMO-03' in [r['fromId'], r['toId']] for r in e))
        self.assertEqual(sum(r['type'] == 'TEACHES' and r['toId'] == 'MS-DEMO-01' for r in e), 2)

    def test_corruption_is_rejected_before_any_connection(self):
        with self.temporary() as directory:
            root = Path(directory)
            (root / 'fixture.json').write_text('{}')
            (root / 'fixture.sha256').write_text('0' * 64)
            with patch.object(seed, 'HERE', root), self.assertRaisesRegex(ValueError, 'hash mismatch'):
                seed.validate()

    def test_init_and_rerun_preserve_private_passwords_and_keys(self):
        with self.temporary() as directory, patch.object(seed, 'LOCAL', Path(directory)):
            seed.initialize(build())
            path = Path(directory) / 'private.env'
            before = path.read_bytes()
            seed.initialize(build())
            self.assertEqual(before, path.read_bytes())
            self.assertIn(b'COUNCIL_SEED_ALLOWED=false', before)
            self.assertTrue((Path(directory) / 'ACCOUNTS.md').exists())

    def test_configure_uses_current_routes_methods_and_retains_matching_versions(self):
        f = build()
        policies = [p for p in f['policies'] if p['purpose'] == 'SKILL_ASSESSMENT']
        choices = [dict(key=str(i) * 64, ownerId=p['ownerId'], levelId=p['levelId'], ready=True) for i, p in enumerate(policies, 1)]
        pending = {}
        active = {}
        requests = []

        class Response:
            def __init__(self, body=None, status=200):
                self.status, self.body = status, body
            def __enter__(self):
                return self
            def read(self):
                return json.dumps(self.body).encode()
            def __exit__(self, *_):
                return False

        class Client:
            def open(self, request, timeout):
                path = seed.urllib.parse.urlparse(request.full_url).path
                method = request.get_method()
                body = None if request.data is None else json.loads(request.data)
                requests.append((method, path, body))
                if path.endswith('/csrf'):
                    return Response(dict(headerName='X-CSRF-TOKEN', token='test'))
                if path.endswith('/sign-in'):
                    return Response(dict(stage='COMPLETE', organizationId=f['organizationId'], roles=['DOMAIN_EXPERT']))
                if path.endswith('/sign-out'):
                    return Response(status=204)
                if path.endswith('/scopes'):
                    return Response(dict(choices=choices))
                key = path.split('/scopes/')[1].split('/')[0]
                index = next(i for i, c in enumerate(choices) if c['key'] == key)
                if method == 'POST' and path.endswith('/draft'):
                    pending[key] = dict(id='draft', revision=1)
                elif method == 'PUT' and path.endswith('/draft'):
                    self_test.assertEqual(body['configuration'], policies[index]['configuration'])
                    pending[key] = dict(id='draft', revision=2)
                elif method == 'POST' and path.endswith('/activation'):
                    active[key] = dict(configuration=policies[index]['configuration'], catalogHash='hash')
                    pending.pop(key)
                elif method != 'GET':
                    raise AssertionError('Unexpected mutation route: ' + path)
                return Response(dict(scope=dict(catalogHash='hash'), active=active.get(key), draft=pending.get(key), activationRevision=0))

        self_test = self
        settings = dict(COUNCIL_API_URL='http://127.0.0.1:29080', COUNCIL_SEED_ALLOWED='true', COUNCIL_EXPERT_PASSWORD='private-test-only')
        with patch.dict(os.environ, settings), patch.object(seed.urllib.request, 'build_opener', return_value=Client()):
            seed.configure(f)
            first_count = sum(method in ['PUT', 'POST'] and '/scopes/' in path for method, path, _ in requests)
            seed.configure(f)
        self.assertEqual(first_count, 9)
        self.assertEqual(sum(method in ['PUT', 'POST'] and '/scopes/' in path for method, path, _ in requests), 9)

    def test_configure_rejects_nonlocal_api_before_login(self):
        with patch.dict(os.environ, dict(COUNCIL_API_URL='https://example.com', COUNCIL_SEED_ALLOWED='true')), self.assertRaisesRegex(ValueError, 'local HTTP'):
            seed.configure(build())


if __name__ == '__main__':
    unittest.main()
