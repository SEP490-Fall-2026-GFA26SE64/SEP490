import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import generate_rq1_profiles as rq1
import import_neo4j_dataset as graph
import setup_demo_data as demo


class DemoAndRQ1Tests(unittest.TestCase):
    def test_workbook_matches_demo_organization(self):
        data = demo.validate_workbook(graph.DEFAULT_FILE)
        self.assertEqual(36, len(data['Target Roles']))

    def test_incomplete_existing_catalog_has_actionable_error(self):
        incoming = graph.prepare(graph.read_xlsx(graph.DEFAULT_FILE))
        existing = {k: [] for k in incoming}
        existing['Target Roles'] = [{'entity_id': 'legacy-id', 'name': 'Legacy role'}]
        with self.assertRaisesRegex(graph.ValidationError, 'legacy/incomplete'):
            graph.merge_preview(existing, incoming)

    def test_multiple_seeds_obey_generation_rules(self):
        catalog = rq1.load_v5_catalog(str(graph.DEFAULT_FILE))
        for seed in range(10):
            with self.subTest(seed=seed):
                profiles = rq1.generate_users(500, seed, str(graph.DEFAULT_FILE))
                report = rq1.summarize(profiles, catalog)
                self.assertEqual({'SE': 200, 'DATA': 150, 'AI': 150}, report['domainDistribution'])
                self.assertEqual(0, report['rq1Constraints']['duplicateCompetencyProfiles'])
                for key, value in report['rq1Constraints'].items():
                    if key != 'duplicateCompetencyProfiles':
                        self.assertEqual(500, value, key)

    def test_reproducible_across_python_hash_seeds_and_optimization(self):
        with tempfile.TemporaryDirectory() as tmp:
            results = []
            for hash_seed, optimize in [('1', False), ('987', True)]:
                output = Path(tmp) / (hash_seed + '.json')
                command = [sys.executable] + (['-O'] if optimize else [])
                command += [str(Path(rq1.__file__)), '50', '--output', str(output)]
                subprocess.run(command, env=dict(os.environ, PYTHONHASHSEED=hash_seed),
                               check=True, capture_output=True, text=True)
                results.append(output.read_bytes())
            self.assertEqual(*results)

    def test_invalid_profile_rejected(self):
        catalog = rq1.load_v5_catalog(str(graph.DEFAULT_FILE))
        profile = rq1.generate_users(20, 42, str(graph.DEFAULT_FILE))[0]
        bad = copy.deepcopy(profile)
        bad['competencyState'] = {key: None for key in bad['competencyState']}
        with self.assertRaises(ValueError):
            rq1.validate_profile(bad, catalog)


if __name__ == '__main__':
    unittest.main()
