"""Regression checks for the v0.10 catalog boundary. No database connection."""
import copy,json,unittest
from pathlib import Path
from unittest.mock import patch
from validate_dataset import validate
from graph_payload import build_payload

SEED=Path(__file__).with_name('ontology_seed-v010.json')
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

    def test_teaching_pairs_match_retained_source_evidence(self):
        manifest=json.loads((SEED.parent.parent/'sources/local_review/module_skill_mapping_v09.json').read_text())
        expected={(p['moduleId'],p['skillId']) for p in manifest['teachingPairs']}
        actual={(e['fromId'],e['toId']) for e in self.data['relationships'] if e['type']=='TEACHES'}
        self.assertEqual(expected,actual)

    def test_all_architecture_fields_are_present_and_populated(self):
        common={'id','version','status','reviewStatus','reviewedBy','reviewedAt'}
        fields={
            'Occupations':{'code','name','jobZone',*('interest'+n for n in ['Realistic','Investigative','Artistic','Social','Enterprising','Conventional'])},
            'TargetRoles':{'code','name','scope','occupationId'},
            'Levels':{'code','name','rank','attainmentRule','targetRoleId'},
            'Competencies':{'name','description','attainmentRule','levelId'},
            'MicroSkills':{'name','definition'},
            'LearningModules':{'title','moduleType','contentUri','contentType','contentVersion','duration','price'},
        }
        for section,properties in fields.items():
            for row in self.data[section]:
                self.assertEqual(common|properties,set(row),row['id'])
                for key,value in row.items():
                    if key in {'reviewedBy','reviewedAt'}:
                        self.assertIsNone(value)
                    else:
                        self.assertIsNotNone(value,(row['id'],key))
                        if isinstance(value,str):self.assertTrue(value.strip(),(row['id'],key))
        for edge in self.data['relationships']:
            properties={'type','fromId','toId'}
            if edge['type']=='TEACHES':properties|={'instructionLevel'}
            if edge['type']=='REQUIRES_SKILL':properties|={'requiredScore','isMandatory'}
            if edge['type']=='HAS_SKILL_PREREQUISITE':properties|={'requiredScore'}
            self.assertEqual(common|properties,set(edge),edge['id'])

    def test_nonmodule_catalog_business_data_is_preserved(self):
        previous=json.loads((SEED.parent.parent/'question-bank/15-1212.00/historical/ontology_seed-v08.json').read_text())
        for section in ['Occupations','TargetRoles','Levels','Competencies','MicroSkills']:
            without_version=lambda rows:sorted(({k:v for k,v in r.items() if k not in {'version','context'}} for r in rows),key=lambda r:r['id'])
            self.assertEqual(without_version(previous[section]),without_version(self.data[section]))

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
        self.check_invalid(lambda d:d['LearningModules'][0].update(instructionLevel='retired'),'belongs only on TEACHES')

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

    def test_instruction_level_is_independent_and_preserved_in_graph_payload(self):
        data=copy.deepcopy(self.data)
        from collections import Counter
        counts=Counter(e['fromId'] for e in data['relationships'] if e['type']=='TEACHES')
        module=next(m for m,n in counts.items() if n==3)
        selected=[e for e in data['relationships'] if e['type']=='TEACHES' and e['fromId']==module]
        for edge,value in zip(selected,['FOUNDATIONAL','INTERMEDIATE','ADVANCED']):edge['instructionLevel']=value
        original=Path.read_text
        def read(path,*args,**kwargs):
            return json.dumps(data) if path==SEED else original(path,*args,**kwargs)
        with patch.object(Path,'read_text',read):validated,_=validate(SEED)
        nodes,edges,_=build_payload(validated)
        self.assertEqual([edges[e['id']][3]['instructionLevel'] for e in selected],['FOUNDATIONAL','INTERMEDIATE','ADVANCED'])
        for row in data['LearningModules']:
            self.assertEqual(nodes[row['id']][1]['duration'],row['duration'])
            self.assertEqual(nodes[row['id']][1]['price'],row['price'])
        for row in data['Levels']:self.assertNotIn('context',nodes[row['id']][1])

    def test_invalid_instruction_levels_rejected(self):
        for value in [None,True,0.5,'0.5','', 'foundational','FOUNDATION','EXPERT',[],{},float('nan'),float('inf')]:
            with self.subTest(value=value):
                self.check_invalid(lambda d:next(e for e in d['relationships'] if e['type']=='TEACHES').update(instructionLevel=value),'Invalid instructionLevel')

    def test_missing_instruction_level_rejected(self):
        self.check_invalid(lambda d:next(e for e in d['relationships'] if e['type']=='TEACHES').pop('instructionLevel'),'Invalid instructionLevel')

    def test_invalid_duration_values_rejected(self):
        for value in [None,True,0,-1,1.5,'60',float('inf')]:
            with self.subTest(value=value):
                self.check_invalid(lambda d:d['LearningModules'][0].update(duration=value),'Invalid duration')

    def test_invalid_price_values_rejected(self):
        for value in [None,True,0,-1,'0',float('nan'),float('inf')]:
            with self.subTest(value=value):
                self.check_invalid(lambda d:d['LearningModules'][0].update(price=value),'Invalid price')

    def test_level_context_rejected(self):
        self.check_invalid(lambda d:d['Levels'][0].update(context='retired'),'Retired Level context')

    def test_module_estimates_are_diverse_and_reproducible(self):
        from estimate_module_costs import estimate, MANIFEST
        manifest=json.loads(MANIFEST.read_text())
        estimated=estimate(self.data)
        self.assertEqual(manifest['modules'],estimated)
        lookup={row['moduleId']:row for row in estimated}
        for module in self.data['LearningModules']:
            for field in ('duration','price'):
                self.assertEqual(module[field],lookup[module['id']][field])
                self.assertGreater(module[field],0)
            self.assertEqual(module['duration']%15,0)
            self.assertEqual(module['price']%10000,0)
        self.assertGreater(len({m['duration'] for m in self.data['LearningModules']}),1)
        self.assertGreater(len({m['price'] for m in self.data['LearningModules']}),1)

    def test_same_skill_package_scales_with_task_depth(self):
        modules={m['id']:m for m in self.data['LearningModules']}
        for junior in self.data['LearningModules']:
            if '-J-' not in junior['id']:continue
            middle=modules[junior['id'].replace('-J-','-M-')]
            senior=modules[junior['id'].replace('-J-','-S-')]
            for field in ('duration','price'):
                self.assertLess(junior[field],middle[field])
                self.assertLess(middle[field],senior[field])

    def test_same_skill_has_independent_instruction_levels_in_different_modules(self):
        _,edges,_=build_payload(self.data)
        values={a:props['instructionLevel'] for kind,a,b,props in edges.values()
                if kind=='TEACHES' and b=='MS-DE06'}
        self.assertEqual(values['MOD-DE-J-MODEL-01'],'FOUNDATIONAL')
        self.assertEqual(values['MOD-DE-J-QUAL-01'],'INTERMEDIATE')
        self.assertGreater(len(set(values.values())),1)

    def test_old_oc_property_name_rejected(self):
        for old_name in ['learningOutcome','outcomeCoverage']:
            def mutate(data):
                edge=next(e for e in data['relationships'] if e['type']=='TEACHES')
                edge[old_name]=edge.pop('instructionLevel')
            with self.subTest(old_name=old_name):self.check_invalid(mutate,'fields leaked')

    def test_every_instruction_level_sample_matches_its_exact_pair(self):
        manifest=json.loads((SEED.parent.parent/'sources/local_review/module_instruction_levels_v010.json').read_text())
        expected={(r['relationshipId'],r['moduleId'],r['skillId']):r['instructionLevel']
                  for r in manifest['teachingInstructionLevels']}
        actual={(e['id'],e['fromId'],e['toId']):e['instructionLevel']
                for e in self.data['relationships'] if e['type']=='TEACHES'}
        self.assertEqual(len(expected),181)
        self.assertEqual(expected,actual)

    def test_legacy_conversion_rounds_half_up_before_classification(self):
        from instruction_levels import convert_legacy_coverage
        cases={0.0:'FOUNDATIONAL',0.25:'FOUNDATIONAL',0.3:'FOUNDATIONAL',
               0.35:'INTERMEDIATE',0.4:'INTERMEDIATE',0.5:'INTERMEDIATE',0.6:'INTERMEDIATE',
               0.65:'ADVANCED',0.7:'ADVANCED',0.85:'ADVANCED',0.9:'ADVANCED'}
        for value,expected in cases.items():
            with self.subTest(value=value):self.assertEqual(convert_legacy_coverage(value),expected)
        for value in [True,None,'0.5',-0.1,0.91,1,float('nan'),float('inf')]:
            with self.subTest(invalid=value),self.assertRaises(ValueError):convert_legacy_coverage(value)

if __name__=='__main__':unittest.main()
