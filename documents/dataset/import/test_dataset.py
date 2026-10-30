"""Regression checks for the v0.11 catalog boundary. No database connection."""
import copy,json,unittest
from pathlib import Path
from unittest.mock import patch
from validate_dataset import validate
from graph_payload import build_payload

SEED=Path(__file__).with_name('ontology_seed-v011.json')
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
        self.assertEqual((len(nodes),len(edges)),(994,5121))
        for _,props in nodes.values():self.assertFalse({'occupationId','targetRoleId','levelId','levelIds'} & props.keys())

    def test_many_to_many_teaching_is_accepted(self):
        from collections import Counter
        edges=[e for e in self.data['relationships'] if e['type']=='TEACHES']
        self.assertTrue(any(n>1 for n in Counter(e['fromId'] for e in edges).values()))
        self.assertTrue(any(n>1 for n in Counter(e['toId'] for e in edges).values()))

    def test_teaching_pairs_match_retained_source_evidence(self):
        manifest=json.loads((SEED.parent.parent/'sources/local_review/teaching_focus_difficulty_v011.json').read_text())
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
            if edge['type']=='TEACHES':properties|={'teachingFocus','difficultyLevel'}
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
            for existing in edges:
                if existing is not edge and existing['fromId']==edge['fromId'] and existing['teachingFocus']=='PRIMARY':
                    existing['teachingFocus']='SUPPORTING'
        self.check_invalid(mutate,'Each module must teach at least one skill')

    def test_skill_without_provider_rejected(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES']
            orphan=d['MicroSkills'][0]['id']
            occupied={(e['fromId'],e['toId']) for e in edges}
            for edge in edges:
                if edge['toId']!=orphan:continue
                target=next(skill['id'] for skill in d['MicroSkills'] if skill['id']!=orphan and (edge['fromId'],skill['id']) not in occupied)
                edge['toId']=target;occupied.add((edge['fromId'],target))
        self.check_invalid(mutate,'Each skill must have at least one module')

    def test_duplicate_teaching_pair_rejected(self):
        def mutate(d):
            edges=[e for e in d['relationships'] if e['type']=='TEACHES']
            edges[0].update(fromId=edges[1]['fromId'],toId=edges[1]['toId'])
        self.check_invalid(mutate,'Duplicate edge pair')

    def test_retired_field_rejected(self):
        self.check_invalid(lambda d:d['LearningModules'][0].update(teachingFocus='PRIMARY'),'belong only on TEACHES')

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

    def test_two_teaching_properties_are_independent_and_preserved(self):
        nodes,edges,_=build_payload(self.data)
        for row in self.data['relationships']:
            if row['type']=='TEACHES':
                props=edges[row['id']][3]
                self.assertEqual(props['teachingFocus'],row['teachingFocus'])
                self.assertEqual(props['difficultyLevel'],row['difficultyLevel'])
                self.assertNotIn('instructionLevel',props)
        self.assertTrue(any(e['type']=='TEACHES' and e['teachingFocus']=='PRIMARY' and e['difficultyLevel']=='LOW' for e in self.data['relationships']))
        self.assertTrue(any(e['type']=='TEACHES' and e['teachingFocus']=='SUPPORTING' and e['difficultyLevel']=='HIGH' for e in self.data['relationships']))
        for m in self.data['LearningModules']:
            self.assertEqual(nodes[m['id']][1]['duration'],m['duration'])
            self.assertEqual(nodes[m['id']][1]['price'],m['price'])

    def test_invalid_teaching_values_rejected(self):
        for field in ['teachingFocus','difficultyLevel']:
            for value in [None,True,0.5,'0.5','','Primary','primary','foundational','EXPERT',[],{}]:
                with self.subTest(field=field,value=value):
                    self.check_invalid(lambda d:next(e for e in d['relationships'] if e['type']=='TEACHES').update({field:value}),'Invalid '+field)

    def test_missing_teaching_values_rejected(self):
        for field in ['teachingFocus','difficultyLevel']:
            with self.subTest(field=field):
                self.check_invalid(lambda d:next(e for e in d['relationships'] if e['type']=='TEACHES').pop(field),'Invalid '+field)

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

    def test_same_skill_has_primary_low_medium_high_options(self):
        by_skill={s['id']:set() for s in self.data['MicroSkills']}
        for e in self.data['relationships']:
            if e['type']=='TEACHES' and e['teachingFocus']=='PRIMARY':by_skill[e['toId']].add(e['difficultyLevel'])
        self.assertTrue(all(v=={'LOW','MEDIUM','HIGH'} for v in by_skill.values()))

    def test_old_property_names_rejected(self):
        for old in ['instructionLevel','learningOutcome','outcomeCoverage']:
            def mutate(d):next(e for e in d['relationships'] if e['type']=='TEACHES')[old]='retired'
            with self.subTest(old=old):self.check_invalid(mutate,'fields leaked')

    def test_all_teaching_pairs_match_authoring_manifest(self):
        manifest=json.loads((SEED.parent.parent/'sources/local_review/teaching_focus_difficulty_v011.json').read_text())
        expected={(r['relationshipId'],r['moduleId'],r['skillId']):(r['teachingFocus'],r['difficultyLevel']) for r in manifest['teachingPairs']}
        actual={(e['id'],e['fromId'],e['toId']):(e['teachingFocus'],e['difficultyLevel']) for e in self.data['relationships'] if e['type']=='TEACHES'}
        self.assertEqual(len(expected),664)
        self.assertEqual(expected,actual)

    def test_v010_catalog_and_all_non_teaching_relationships_preserved(self):
        old=json.loads(SEED.with_name('ontology_seed-v010.json').read_text())
        strip=lambda row:{k:v for k,v in row.items() if k!='version'}
        for section in ['Occupations','TargetRoles','Levels','Competencies','MicroSkills']:
            self.assertEqual([strip(r) for r in old[section]],[strip(r) for r in self.data[section]])
        new_modules={m['id']:m for m in self.data['LearningModules']}
        manifest=json.loads((SEED.parent.parent/'sources/local_review/teaching_focus_difficulty_v011.json').read_text())
        revisions={r['moduleId']:r for r in manifest['revisedExistingModules']}
        for m in old['LearningModules']:
            expected=strip(m)
            if m['id'] in revisions:expected.update(revisions[m['id']]['current'])
            self.assertEqual(expected,strip(new_modules[m['id']]))
            self.assertEqual((m['duration'],m['price']),(new_modules[m['id']]['duration'],new_modules[m['id']]['price']))
        new_edges={e['id']:e for e in self.data['relationships']}
        for e in old['relationships']:
            if e['type']!='TEACHES':self.assertEqual(strip(e),strip(new_edges[e['id']]))
            else:self.assertEqual((e['fromId'],e['toId']),(new_edges[e['id']]['fromId'],new_edges[e['id']]['toId']))

    def test_incidental_links_do_not_replace_primary_providers(self):
        def mutate(d):
            for e in d['relationships']:
                if e['type']=='TEACHES' and e['fromId']=='MOD-READ-CORE01':e['teachingFocus']='INCIDENTAL'
        self.check_invalid(mutate,'Each module must have exactly one PRIMARY skill')

    def test_new_module_content_agrees_with_relationship_roles(self):
        for m in self.data['LearningModules']:
            if not m['id'].startswith('MOD-FOCUS-'):continue
            content=(SEED.parent/m['contentUri']).read_text()
            for e in self.data['relationships']:
                if e['type']=='TEACHES' and e['fromId']==m['id']:
                    skill=next(s for s in self.data['MicroSkills'] if s['id']==e['toId'])
                    self.assertIn('| '+e['toId']+' — '+skill['name']+' | '+e['teachingFocus']+' | '+e['difficultyLevel']+' |',content)
            self.assertIn('## Primary task',content)
            self.assertIn('## Supporting task',content)
            self.assertIn('no teaching or mastery credit',content)

    def test_application_developer_levels_have_independent_requirements(self):
        role=next(r for r in self.data['TargetRoles'] if r['name']=='Application Developer')
        levels={l['code']:l for l in self.data['Levels'] if l['targetRoleId']==role['id']}
        req={code:{e['toId']:e['requiredScore'] for e in self.data['relationships'] if e['type']=='REQUIRES_SKILL' and e['fromId']==level['id']} for code,level in levels.items()}
        self.assertEqual([len(req[c]) for c in ['J','M','S']],[11,14,14])
        self.assertNotEqual(set(req['J']),set(req['M']))
        self.assertEqual([req[c]['MS-CORE01'] for c in ['J','M','S']],[0.6,0.75,0.9])

    def test_revised_integrated_packages_have_single_primary_scope(self):
        from collections import Counter
        primary_counts=Counter(e['fromId'] for e in self.data['relationships'] if e['type']=='TEACHES' and e['teachingFocus']=='PRIMARY')
        self.assertEqual(set(primary_counts),{m['id'] for m in self.data['LearningModules']})
        self.assertTrue(all(count==1 for count in primary_counts.values()))
        manifest=json.loads((SEED.parent.parent/'sources/local_review/teaching_focus_difficulty_v011.json').read_text())
        self.assertEqual(len(manifest['revisedExistingModules']),9)
        for revision in manifest['revisedExistingModules']:
            module=next(m for m in self.data['LearningModules'] if m['id']==revision['moduleId'])
            content=(SEED.parent/module['contentUri']).read_text()
            self.assertEqual(module['contentVersion'],'1.3')
            self.assertIn('## One primary objective',content)
            self.assertEqual(content.count(' | PRIMARY | '),1)
            self.assertIn('## Supporting practice',content)

    def test_second_primary_skill_is_rejected(self):
        def mutate(data):
            edge=next(e for e in data['relationships'] if e['type']=='TEACHES' and e['fromId']=='MOD-FOCUS-CORE01-HIGH' and e['teachingFocus']=='SUPPORTING')
            edge['teachingFocus']='PRIMARY'
        self.check_invalid(mutate,'Each module must have exactly one PRIMARY skill')

    def test_same_primary_and_difficulty_have_distinct_supporting_options(self):
        for skill_id,legacy in [('MS-DE01','MOD-DE'),('MS-FS03','MOD-FS'),('MS-FS07','MOD-QA')]:
            for difficulty in ['LOW','MEDIUM','HIGH']:
                providers={e['fromId'] for e in self.data['relationships'] if e['type']=='TEACHES' and e['toId']==skill_id and e['teachingFocus']=='PRIMARY' and e['difficultyLevel']==difficulty}
                self.assertGreaterEqual(len(providers),2)
                supports={tuple(sorted(e['toId'] for e in self.data['relationships'] if e['type']=='TEACHES' and e['fromId']==mid and e['teachingFocus']=='SUPPORTING')) for mid in providers}
                self.assertGreaterEqual(len(supports),2)

if __name__=='__main__':unittest.main()
