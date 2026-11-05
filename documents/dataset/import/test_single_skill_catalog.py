import copy
import json
from pathlib import Path
import unittest
from validate_single_skill_catalog import validate, snapshot
from upgrade_neo4j_v012 import plan_upgrade

ROOT=Path(__file__).resolve().parent
class SingleSkillCatalogTest(unittest.TestCase):
    def test_release_content_audit_and_provider_counts(self):
        data,report=validate(ROOT/'ontology_seed-v012.json')
        self.assertEqual(246,report['modules']);self.assertEqual(71,report['coveredSkills'])
        self.assertEqual(8,len(report['uncoveredSkills']))
        self.assertTrue(all('teachingFocus' not in e and 'difficultyLevel' not in e for e in data['relationships']))
    def test_forward_plan_is_exact_and_idempotent_and_preserves_node_ids(self):
        old=snapshot(json.loads((ROOT/'ontology_seed-v011.json').read_text()))
        new=snapshot(json.loads((ROOT/'ontology_seed-v012.json').read_text()))
        p=plan_upgrade(old,old,new);self.assertEqual(418,len(p['retiredTeaches']));self.assertFalse(p['alreadyApplied'])
        self.assertTrue(plan_upgrade(new,old,new)['alreadyApplied']);self.assertEqual(set(old['nodes']),set(new['nodes']))
    def test_authored_or_drifted_graph_is_refused_without_mutation(self):
        old=snapshot(json.loads((ROOT/'ontology_seed-v011.json').read_text()))
        new=snapshot(json.loads((ROOT/'ontology_seed-v012.json').read_text()))
        drift=copy.deepcopy(old);next(iter(drift['nodes'].values()))['properties']['name']='Edited by user'
        with self.assertRaises(ValueError):plan_upgrade(drift,old,new)
        self.assertNotEqual(old,drift)
class WorkspaceCutoverTest(unittest.TestCase):
    def fixture(self):
        from upgrade_workspace_v012 import ORG, expected
        base=snapshot(json.loads((ROOT/'ontology_seed-v011.json').read_text()))
        for n in base['nodes'].values():n['properties']['organizationId']=ORG
        old,new=expected(base)
        return old,new
    def test_workspace_preserves_tenant_metadata_and_supplement(self):
        from upgrade_workspace_v012 import plan, ORG
        old,new=self.fixture();_,target,result=plan(old)
        self.assertEqual(new,target);self.assertEqual(418,len(result['retiredTeaches']))
        self.assertTrue(all(n['properties']['organizationId']==ORG for n in target['nodes'].values()))
        self.assertEqual(4706,len(target['relationships']))
        self.assertEqual(5,sum(n['labels']==['JobPosition'] for n in target['nodes'].values()))
        self.assertTrue(plan(new)[2]['alreadyApplied'])
    def test_workspace_rejects_foreign_or_content_drift(self):
        from upgrade_workspace_v012 import plan
        old,_=self.fixture()
        for field,value in [('organizationId','foreign'),('name','User edited')]:
            drift=copy.deepcopy(old);next(iter(drift['nodes'].values()))['properties'][field]=value
            with self.assertRaises(ValueError):plan(drift)
    def test_workspace_preserves_assigned_expert(self):
        from upgrade_workspace_v012 import plan
        old,_=self.fixture();key=next(k for k,n in old['nodes'].items() if n['labels']==['TargetRole'])
        meta={'assignedExpertId':'00000000-0000-0000-0000-000000000123','assignedExpertName':'Existing expert'}
        old['nodes'][key]['properties'].update(meta)
        _,new,_=plan(old)
        for k,v in meta.items():self.assertEqual(v,new['nodes'][key]['properties'][k])
if __name__=='__main__':unittest.main()
