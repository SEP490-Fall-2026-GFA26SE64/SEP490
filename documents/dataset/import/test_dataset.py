"""Regression checks for the v0.9 catalog boundary. No database connection."""
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
        self.assertEqual((len(nodes),len(edges)),(833,4638))
        for _,props in nodes.values():self.assertFalse({'occupationId','targetRoleId','levelId','levelIds'} & props.keys())

    def test_many_to_many_teaching_is_accepted(self):
        from collections import Counter
        edges=[e for e in self.data['relationships'] if e['type']=='TEACHES']
        self.assertTrue(any(n>1 for n in Counter(e['fromId'] for e in edges).values()))
        self.assertTrue(any(n>1 for n in Counter(e['toId'] for e in edges).values()))

    def test_module_without_skills_rejected(self):
        from collections import Counter
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES']
            counts=Counter(e['fromId'] for e in edges)
            edge=next(e for e in edges if counts[e['fromId']]==1)
            occupied={(e['fromId'],e['toId']) for e in edges}
            edge['fromId']=next(m['id'] for m in d['LearningModules'] if m['id']!=edge['fromId'] and (m['id'],edge['toId']) not in occupied)
        self.check_invalid(mutate,'Each module must teach at least one skill')

    def test_skill_without_provider_rejected(self):
        from collections import Counter
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES']
            counts=Counter(e['toId'] for e in edges)
            edge=next(e for e in edges if counts[e['toId']]==1)
            occupied={(e['fromId'],e['toId']) for e in edges}
            edge['toId']=next(skill['id'] for skill in d['MicroSkills'] if skill['id']!=edge['toId'] and (edge['fromId'],skill['id']) not in occupied)
        self.check_invalid(mutate,'Each skill must have at least one module')

    def test_duplicate_teaching_pair_rejected(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES']
            edges[0].update(fromId=edges[1]['fromId'],toId=edges[1]['toId'])
        self.check_invalid(mutate,'Duplicate edge pair')

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
