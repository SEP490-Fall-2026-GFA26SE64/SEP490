"""Guarded upgrade planning tests; no database changes."""
import copy
import json
import unittest
from pathlib import Path

from upgrade_neo4j_v011 import LocalGraph, payload_snapshot, plan_upgrade


class UpgradePlanTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        folder = Path(__file__).resolve().parent
        cls.baseline = payload_snapshot(json.loads((folder / 'ontology_seed.json').read_text()))
        cls.release = payload_snapshot(json.loads((folder / 'ontology_seed-v011.json').read_text()))

    def test_original_catalog_upgrades_to_exact_release(self):
        after, plan = plan_upgrade(self.baseline, self.baseline, self.release, set())
        self.assertEqual(self.release, after)
        self.assertEqual((994, 5121, 246, 664), (plan['afterNodes'], plan['afterRelationships'], plan['catalogModules'], plan['catalogTeachingPairs']))

    def test_exact_rerun_has_no_writes(self):
        _, plan = plan_upgrade(self.release, self.baseline, self.release, set())
        self.assertEqual((0, 0), (plan['nodesToWrite'], plan['relationshipsToWrite']))

    def test_preserves_authoring_payload_byte_values_and_never_mutates_input(self):
        before = copy.deepcopy(self.baseline)
        before['nodes']['authored'] = {'labels': ['LearningModule'], 'properties': {'id': 'authored', 'version': '0.11.0', 'reviewedBy': 'actual-reviewer', 'price': 100}}
        before['relationships']['authored-edge'] = {'type': 'TEACHES', 'from': 'authored', 'to': 'MS-DE01', 'properties': {'id': 'authored-edge', 'teachingFocus': 'PRIMARY'}}
        unchanged = copy.deepcopy(before)
        after, plan = plan_upgrade(before, self.baseline, self.release, {'authored'})
        self.assertEqual(before, unchanged)
        self.assertEqual(before['nodes']['authored'], after['nodes']['authored'])
        self.assertEqual(before['relationships']['authored-edge'], after['relationships']['authored-edge'])
        self.assertEqual((1, 1), (plan['preservedAuthoredModules'], plan['preservedAuthoredRelationships']))

    def test_refuses_overwriting_real_review_or_unrecognized_catalog_edits(self):
        before = copy.deepcopy(self.baseline)
        before['nodes']['MOD-DE-J-MODEL-01']['properties']['reviewedBy'] = 'human-reviewer'
        with self.assertRaisesRegex(ValueError, 'drift requires review'):
            plan_upgrade(before, self.baseline, self.release, set())

    def test_refuses_unknown_extra_nodes_and_edges(self):
        before = copy.deepcopy(self.baseline)
        before['nodes']['unexpected'] = {'labels': ['Account'], 'properties': {'id': 'unexpected'}}
        with self.assertRaisesRegex(ValueError, 'Unexpected noncatalog node'):
            plan_upgrade(before, self.baseline, self.release, set())
        before = copy.deepcopy(self.baseline)
        before['relationships']['unexpected'] = {'type': 'TEACHES', 'from': 'MOD-DE-J-MODEL-01', 'to': 'MS-DE01', 'properties': {'id': 'unexpected'}}
        with self.assertRaisesRegex(ValueError, 'Unexpected noncatalog relationship'):
            plan_upgrade(before, self.baseline, self.release, set())

    def test_refuses_catalog_authoring_collision_or_missing_base(self):
        with self.assertRaisesRegex(ValueError, 'collide'):
            plan_upgrade(self.baseline, self.baseline, self.release, {'MOD-DE-J-MODEL-01'})
        before = copy.deepcopy(self.baseline)
        before['nodes'].pop('MOD-DE-J-MODEL-01')
        with self.assertRaisesRegex(ValueError, 'lacks original'):
            plan_upgrade(before, self.baseline, self.release, set())

    def test_never_sends_credentials_to_a_nonlocal_endpoint(self):
        with self.assertRaisesRegex(ValueError, 'loopback'):
            LocalGraph('https://example.org', 'neo4j', 'password')


if __name__ == '__main__':
    unittest.main()
