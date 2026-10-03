"""Validation regression tests. No database and no workbook mutations."""
import copy
import unittest
from unittest.mock import patch
import json

import import_neo4j_dataset as importer

TEST_ORG = "00000000-0000-0000-0000-000000000001"


class CatalogValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.valid = importer.prepare(importer.read_xlsx(importer.DEFAULT_FILE), TEST_ORG)

    def setUp(self):
        self.data = copy.deepcopy(self.valid)

    def test_complete_catalog_and_counts(self):
        importer.validate_graph(self.data)
        self.assertEqual(158, sum(len(self.data[x]) for x in importer.NODES))
        self.assertEqual(1422, sum(len(self.data[x]) for x in importer.RELS))

    def test_missing_organization_is_blocked(self):
        raw = importer.read_xlsx(importer.DEFAULT_FILE)
        for role in raw["Target Roles"]:
            role["organizationId"] = None
        with self.assertRaisesRegex(importer.ValidationError, "organizationId"):
            importer.prepare(raw)

    def test_compose_connection_uses_published_port_and_auth(self):
        config = {"services": {"neo4j": {"environment": {"NEO4J_AUTH": "neo4j/custom/pass"}, "ports": [{"target": 7474, "published": "17474"}]}}}
        with patch.object(importer.subprocess, "run") as run:
            run.return_value.returncode = 0
            run.return_value.stdout = json.dumps(config)
            self.assertEqual(("http://127.0.0.1:17474", "neo4j", "custom/pass"), importer.compose_connection())

    def test_workbook_is_ready_without_organization_argument(self):
        importer.prepare(importer.read_xlsx(importer.DEFAULT_FILE))

    def test_track_grade_mismatch(self):
        self.data["Target Roles"][0]["seniority"] = "M3"
        with self.assertRaisesRegex(importer.ValidationError, "seniority"):
            importer.validate_graph(self.data)

    def test_missing_endpoint(self):
        self.data["TEACHES"][0]["targetCode"] = "NOT_A_SKILL"
        with self.assertRaisesRegex(importer.ValidationError, "missing endpoint"):
            importer.validate_graph(self.data)

    def test_duplicate_relationship(self):
        self.data["TEACHES"].append(copy.deepcopy(self.data["TEACHES"][0]))
        with self.assertRaisesRegex(importer.ValidationError, "duplicate edge"):
            importer.validate_graph(self.data)

    def test_cycle(self):
        edge = copy.deepcopy(self.data["PREREQUISITE_OF"][0])
        edge["sourceCode"], edge["targetCode"] = edge["targetCode"], edge["sourceCode"]
        self.data["PREREQUISITE_OF"].append(edge)
        with self.assertRaisesRegex(importer.ValidationError, "cycle"):
            importer.validate_graph(self.data)

    def test_mastery_out_of_range(self):
        self.data["TEACHES"][0]["outcomeMastery"] = 1.1
        with self.assertRaisesRegex(importer.ValidationError, r"\[0,1\]"):
            importer.validate_graph(self.data)

    def test_price_requires_currency(self):
        self.data["Learning Modules"][0]["currency"] = None
        with self.assertRaisesRegex(importer.ValidationError, "currency"):
            importer.validate_graph(self.data)

    def test_multiple_macros(self):
        edge = copy.deepcopy(self.data["HAS_SKILL"][0])
        edge["sourceCode"] = "COMMUNICATION"
        self.data["HAS_SKILL"].append(edge)
        with self.assertRaisesRegex(importer.ValidationError, "exactly one active HAS_SKILL"):
            importer.validate_graph(self.data)

    def test_reimport_preserves_existing_identity(self):
        existing = copy.deepcopy(self.valid)
        existing["MicroSkills"][0]["id"] = "existing-technical-id"
        reused = importer.merge_preview(existing, self.data)
        self.assertEqual(66, reused["MicroSkills"])
        self.assertEqual("existing-technical-id", existing["MicroSkills"][0]["id"])

    def test_cross_organization_code_conflict(self):
        existing = copy.deepcopy(self.valid)
        existing["Target Roles"][0]["organizationId"] = "00000000-0000-0000-0000-000000000002"
        with self.assertRaisesRegex(importer.ValidationError, "different organization"):
            importer.merge_preview(existing, self.data)

    def test_existing_edge_conflict_is_blocked(self):
        existing = copy.deepcopy(self.valid)
        existing["TEACHES"][0]["outcomeMastery"] = 0.1
        with self.assertRaisesRegex(importer.ValidationError, "differs"):
            importer.merge_preview(existing, self.data)

    def test_existing_id_is_not_reassigned(self):
        existing = copy.deepcopy(self.valid)
        existing["MicroSkills"][1]["id"] = self.data["MicroSkills"][0]["id"]
        with self.assertRaisesRegex(importer.ValidationError, "different database code"):
            importer.merge_preview(existing, self.data)


if __name__ == "__main__":
    unittest.main()
