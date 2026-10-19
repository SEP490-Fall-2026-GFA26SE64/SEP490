"""Regression checks for the v0.8 catalog boundary. No database connection."""
import copy,json,unittest
from pathlib import Path
from unittest.mock import patch
from validate_dataset import validate
from graph_payload import build_payload

SEED=Path(__file__).with_name('ontology_seed.json')
class CatalogContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data,_=validate(SEED)

    def check_invalid(self,mutate,pattern):
        data=copy.deepcopy(self.data);mutate(data)
        original=Path.read_text
        def read(path,*args,**kwargs):
            return json.dumps(data) if path==SEED else original(path,*args,**kwargs)
        with patch.object(Path,'read_text',read),self.assertRaisesRegex(ValueError,pattern):validate(SEED)

    def test_valid_payload_has_no_export_join_fields(self):
        nodes,edges,_=build_payload(self.data)
        self.assertEqual((len(nodes),len(edges)),(827,4536))
        for _,props in nodes.values():self.assertFalse({'occupationId','targetRoleId','levelId','levelIds'} & props.keys())

    def test_two_providers_leave_another_skill_without_module(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES'];edges[0]['toId']=edges[1]['toId']
        self.check_invalid(mutate,'Each skill must have exactly one module')

    def test_one_module_teaches_two_skills_leaving_an_orphan(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES'];edges[0]['fromId']=edges[1]['fromId']
        self.check_invalid(mutate,'Each module must teach exactly one skill')

    def test_retired_field_rejected(self):
        self.check_invalid(lambda d:d['LearningModules'][0].update(learningOutcome='retired'),'fields leaked')

    def test_retired_profile_key_rejected(self):
        self.check_invalid(lambda d:d['TargetRoles'][0].update(canonicalProfileKey='PROFILE-DEV'),'fields leaked')

    def test_course_section_rejected(self):
        self.check_invalid(lambda d:d.update(Courses=[]),'Unknown or retired seed sections')

    def test_prerequisite_cycle_rejected(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='HAS_SKILL_PREREQUISITE']
            edges[1].update(fromId=edges[0]['toId'],toId=edges[0]['fromId'])
        self.check_invalid(mutate,'Dependency cycle')

    def test_boolean_is_not_a_threshold(self):
        def mutate(d):
            next(e for e in d['relationships'] if e['type']=='HAS_SKILL_PREREQUISITE')['requiredScore']=True
        self.check_invalid(mutate,'Invalid readiness threshold')

if __name__=='__main__':unittest.main()
