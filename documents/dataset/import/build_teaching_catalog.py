"""Author the v0.11 review catalog from preserved v0.10, without any DB writes.

Explicit local authoring decisions, pending expert review. Not a scoring model,
published vendor catalog, source-certified mapping, or gap-to-difficulty rule.
"""
import json,re
from collections import defaultdict,Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'ontology_seed-v011.json'
MANIFEST=ROOT.parent/'sources/local_review/teaching_focus_difficulty_v011.json'
DIFFICULTY={'J':'LOW','M':'MEDIUM','S':'HIGH'}
SUPPORT={'ARC':('MS-ARC05','MS-ARC01'),'CORE':('MS-CORE02','MS-CORE03'),
         'DE':('MS-DE06','MS-DE01'),'FS':('MS-FS07','MS-FS06'),
         'QA':('MS-QA04','MS-QA03'),'GOV':('MS-GOV01','MS-GOV02'),
         'INF':('MS-INF04','MS-INF05'),'SEC':('MS-SEC09','MS-SEC01')}
SCENARIO={
 'ARC':'a booking service with API, storage and external notification boundaries',
 'CORE':'a small inventory service with executable scripts and a controlled release',
 'DE':'a synthetic retail warehouse with orders, products and daily data loads',
 'FS':'an order-management application with browser, service and database layers',
 'QA':'a sandbox checkout service with documented acceptance criteria and known defects',
 'GOV':'a fictional organization handling customer and operational datasets',
 'INF':'an isolated two-service infrastructure sandbox with synthetic monitoring data',
 'SEC':'an isolated lab with fictional users, assets, alerts and security policies',
}
SUPPORT_ACTIVITY={
 'ARC':'Create a short decision record explaining assumptions and how the primary design was checked.',
 'CORE':'Record a controlled change with a small history and a reproducible check. Use the supplied sandbox repository.',
 'DE':'Record dataset meanings, ownership and a structural change in a small data dictionary.',
 'FS':'Write focused checks for the primary implementation and explain one defect revealed by the checks.',
 'QA':'Record expected and observed results, reproduction steps, and a clear test finding.',
 'GOV':'Identify an accountable owner and record who reviews the primary governance artifact.',
 'INF':'Record baseline configuration, a controlled change and how the resulting service state was verified.',
 'SEC':'Write a short security recommendation linking evidence, operational impact and the proposed action.',
}

def metadata(identity):
    return {'id':identity,'version':'0.11.0','status':'ACTIVE',
            'reviewStatus':'NEEDS_EXPERT_REVIEW','reviewedBy':None,'reviewedAt':None}

def build():
    data=json.loads((ROOT/'ontology_seed-v010.json').read_text())
    skills={s['id']:s for s in data['MicroSkills']}
    by_module=defaultdict(list)
    for e in data['relationships']:
        if e['type']=='TEACHES':by_module[e['fromId']].append(e)
    tasks=defaultdict(dict)
    original_modules=list(data['LearningModules'])
    assignments=[];covered=set()
    for m in original_modules:
        reading=m['moduleType']=='RESOURCE_GUIDED_PRACTICE'
        tier='J' if reading else m['id'].split('-')[2]
        depth=DIFFICULTY[tier]
        body=(ROOT/m['contentUri']).read_text()
        section=body.split('## Assigned tasks and submission evidence',1)[-1].split('Submit evidence:',1)[0]
        for skill_id,task in re.findall(r'^- (MS-[A-Z]+\d+): (.+)$',section,re.M):
            tasks[skill_id][depth]=task
        for index,e in enumerate(by_module[m['id']]):
            # Existing lessons assign a direct practice task to each member.
            # The leading focus remains primary; other practiced skills support it.
            e.pop('instructionLevel')
            e.update(teachingFocus='PRIMARY' if index==0 else 'SUPPORTING',difficultyLevel=depth)
            if index==0:covered.add((e['toId'],depth))
            assignments.append({'relationshipId':e['id'],'moduleId':e['fromId'],'skillId':e['toId'],
                                'teachingFocus':e['teachingFocus'],'difficultyLevel':depth,
                                'basis':'Local review of existing ordered skill focus and guided/independent/complex practice tasks.'})
    new_specs=[]
    for skill_id,skill in skills.items():
        family=re.search(r'MS-([A-Z]+)',skill_id).group(1)
        plans=[(depth,False) for depth in ['LOW','MEDIUM','HIGH']]
        if skill_id in {'MS-DE01','MS-FS03','MS-FS07'}:
            plans += [(depth,True) for depth in ['LOW','MEDIUM','HIGH']]
        for difficulty,alternative in plans:
            if not alternative and (skill_id,difficulty) in covered:continue
            module_id=f'MOD-FOCUS-{skill_id[3:]}-{difficulty}'+('-ALT' if alternative else '')
            alternate_support={'MS-DE01':'MS-DE05','MS-FS03':'MS-FS12','MS-FS07':'MS-FS06'}
            support=alternate_support[skill_id] if alternative else next(s for s in SUPPORT[family] if s!=skill_id)
            incidental='MS-CORE02' if 'MS-CORE02' not in {skill_id,support} else 'MS-CORE03'
            if incidental in {skill_id,support}:incidental='MS-CORE01'
            support_depth='MEDIUM' if difficulty=='HIGH' else 'LOW'
            supporting_task=(SUPPORT_ACTIVITY[family] if support==SUPPORT[family][0]
                             else tasks[support].get(support_depth,skills[support]['definition']))
            pairs=[(skill_id,'PRIMARY',difficulty),(support,'SUPPORTING',support_depth),
                   (incidental,'INCIDENTAL','LOW')]
            task=tasks[skill_id].get(difficulty,skill['definition'])
            if alternative:
                task += ' '+{
                    'MS-DE01':'Focus this variant on invalid-data cases: design constraints and demonstrate accepted versus rejected sample records.',
                    'MS-FS03':'Focus this variant on request/response error contracts and input boundary failures in the API.',
                    'MS-FS07':'Focus this variant on a reproducible defect: write a failing regression test, diagnose the cause and verify the correction.',
                }[skill_id]
            delivery={'LOW':'Guided practice','MEDIUM':'Independent implementation','HIGH':'Complex scenario and trade-off review'}[difficulty]
            title=f"{skill['name']} — {delivery}"+(' — Focused verification variant' if alternative else '')
            uri=f'content/modules/{module_id}.md'
            m={**metadata(module_id),'title':title,'moduleType':'LESSON_AND_PRACTICE',
               'contentUri':uri,'contentType':'text/markdown','contentVersion':'1.0',
               'duration':1,'price':1} # replaced by the documented effort estimator below
            data['LearningModules'].append(m)
            source=next(x for x in original_modules if skill_id in {e['toId'] for e in by_module[x['id']]})
            progression={
             'LOW':'Use a supplied worked example and step-by-step checklist. Change one input, execute the checks and explain the observed result.',
             'MEDIUM':'Implement a variant independently from the stated requirements. Diagnose one injected failure and justify the correction with before/after checks.',
             'HIGH':'Evaluate two approaches under conflicting constraints. Introduce an edge or failure condition, compare the consequences, and justify recovery, verification and trade-offs.',
            }[difficulty]
            context={
                'MS-CORE02':'A repository snapshot is provided as context; source-control operations are not taught or assessed here.',
                'MS-CORE03':'A requirements brief is provided as context; translating requirements into changes is not taught or assessed here.',
                'MS-CORE01':'An executable starter script is provided as context; programming and scripting are not taught or assessed here.',
            }[incidental]
            body=f'''# {title}

Module ID: {module_id}. Content version: 1.0. Review: NEEDS_EXPERT_REVIEW.

## Purpose and scenario

Practice **{skill['name']}** using {SCENARIO[family]}. This locally authored review package is a scaffold for expert lesson/lab authoring, not a complete approved course.

## Teaching focus and difficulty

| Skill | Teaching focus | Difficulty | Meaning |
|---|---|---|---|
| {skill_id} — {skill['name']} | PRIMARY | {difficulty} | Main instructional objective, with direct practice and evidence. |
| {support} — {skills[support]['name']} | SUPPORTING | {support_depth} | Supporting activity, not an equivalent primary treatment. |
| {incidental} — {skills[incidental]['name']} | INCIDENTAL | LOW | Context only; no teaching or mastery credit. |

## Read and prepare

Read [the retained source-linked introduction]({Path(source['contentUri']).name}) for terminology and references. It is a reference, not a compulsory module completion. Review the supplied scenario, inputs and expected outputs with the instructor. For real use, experts must provide and approve the actual sandbox assets, worked examples and task/rubric configuration.

## Primary task

{task}

{progression}

## Supporting task

{supporting_task} The supporting activity develops {skills[support]['name']}; review its evidence separately from the primary result.

## Incidental context

{context} Merely using that context does not close a gap for {incidental}.

## Checks and evidence

Submit the primary artifact, stated assumptions, expected-versus-observed checks and one limitation. Include evidence for the supporting activity. For HIGH difficulty, add the alternative comparison, failure analysis and recovery checks; for MEDIUM, include diagnosis and correction; for LOW, retain the worked-example checklist and changed-input result. No evidence or attainment decision is claimed for incidental context.

## Readiness and assessment boundary

Skill prerequisite edges determine readiness; supporting/incidental links do not create new prerequisites. An approved external task/rubric and compatible learner evidence are required to confirm readiness or attainment. Difficulty is an expert authoring category, not a numeric score threshold, role-Level shortcut, or expected mastery increase. Completion never automatically passes any skill.
'''
            (ROOT/uri).write_text(body)
            for target,focus,depth in pairs:
                edge={**metadata(f'REL-TEACHES-{module_id}-{target}'),'type':'TEACHES',
                      'fromId':module_id,'toId':target,'teachingFocus':focus,'difficultyLevel':depth}
                data['relationships'].append(edge)
                assignments.append({'relationshipId':edge['id'],'moduleId':module_id,'skillId':target,
                                    'teachingFocus':focus,'difficultyLevel':depth,
                                    'basis':'New local authored primary practice, explicit supporting task or provided incidental context; not inferred official mapping.'})
            new_specs.append({'moduleId':module_id,'primarySkillId':skill_id,'difficultyLevel':difficulty,
                              'sourceIntroductionModuleId':source['id'],'task':task,
                              'supportingTask':supporting_task,
                              'supportingSkillId':support,'incidentalSkillId':incidental,
                              'contentUri':uri,'reviewStatus':'NEEDS_EXPERT_REVIEW'})
    # Revise the nine formerly co-primary packages into one clear learning unit.
    # Keep original files immutable for the pinned historical catalogs.
    revisions=[]
    for family,topic,primary_id in [('DE','MODEL','MS-DE01'),('FS','SERVICE','MS-FS03'),('QA','AUTO','MS-FS07')]:
        for tier,depth in DIFFICULTY.items():
            module_id=f'MOD-{family}-{tier}-{topic}-01'
            m=next(row for row in data['LearningModules'] if row['id']==module_id)
            old={key:m[key] for key in ['title','contentUri','contentVersion']}
            mode={'LOW':'Guided implementation','MEDIUM':'Independent implementation','HIGH':'Complex review'}[depth]
            m.update(title=f"{skills[primary_id]['name']} — {mode} with supporting practice",
                     contentUri=f'content/modules/{module_id}-single-primary.md',contentVersion='1.3')
            supporting=[e['toId'] for e in by_module[module_id] if e['toId']!=primary_id]
            lines='\n'.join(f"| {sid} — {skills[sid]['name']} | {'PRIMARY' if sid==primary_id else 'SUPPORTING'} | {depth} |" for sid in [primary_id,*supporting])
            supporting_work={
                'DE':'Use the supplied small warehouse/load scaffold only to check that the model preserves keys and grain. Record a concise data dictionary for the model. A full warehouse implementation is not a second main objective.',
                'FS':'Use a small parameterized query and a supplied integration fixture only to check the API contract. Query-language breadth and a full integration implementation are not main objectives here.',
                'QA':'Use a supplied automation runner and one integration fixture to execute and inspect the unit checks. Authoring an automation framework or a full integration suite is not a main objective here.',
            }[family]
            text=f'''# {m['title']}

Module ID: {module_id}. Content version: 1.3. Review: NEEDS_EXPERT_REVIEW.

## One primary objective

This revised learning unit focuses on **{skills[primary_id]['name']}**. Other activities support that single objective; they are not co-primary outcomes. This is a locally authored lesson/lab scaffold pending expert content, sandbox and assessment approval.

| Skill | Teaching focus | Difficulty |
|---|---|---|
{lines}

## Read and prepare

Use [the retained introduction and official references]({Path(old['contentUri']).name}) for background. The original file is historical reference, not a second required completion or the current task scope.

## Primary task

{tasks[primary_id].get(depth,skills[primary_id]['definition'])}

{ {'LOW':'Follow a supplied example, make one controlled change and verify the result.', 'MEDIUM':'Implement the task independently, diagnose one fault and justify the correction.', 'HIGH':'Compare alternatives under conflicting constraints; explain failure modes, checks and recovery.'}[depth] }

## Supporting practice

{supporting_work}

## Evidence and assessment boundary

Submit the primary artifact, expected-versus-observed checks and rationale for the primary decisions. Keep supporting artifacts small and tied to verifying the primary result. Difficulty is not an expected score gain. Readiness and attainment still require approved external tasks/rubrics, compatible learner evidence and skill prerequisites. Completion does not prove mastery. Original estimated duration/price are retained for review and are not measured times or vendor quotes.
'''
            (ROOT/m['contentUri']).write_text(text)
            revisions.append({'moduleId':module_id,'primarySkillId':primary_id,'previous':old,
                              'current':{key:m[key] for key in old},
                              'reason':'Exactly one primary objective; narrow supporting exercises rather than relabel an unchanged co-primary task.'})
    for records in data.values():
        for row in records:row['version']='0.11.0'
    # The estimator reads actual authored edge roles, with no mastery-gap rule.
    from estimate_module_costs import estimate
    estimates=estimate(data)
    costs={r['moduleId']:r for r in estimates}
    for m in data['LearningModules']:
        for key in ['duration','price']:m[key]=costs[m['id']][key]
    OUTPUT.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    manifest={'catalogVersion':'0.11.0','reviewStatus':'NEEDS_EXPERT_REVIEW',
              'sourceSnapshot':'../../import/ontology_seed-v010.json',
              'legacyPolicy':'Retain all 85 original module IDs, all 181 original pairs and all original duration/price values. Exactly one leading skill is PRIMARY and remaining direct-practice skills are SUPPORTING. Nine previously co-primary packages have revised titles/content references/version 1.3 and narrowed supporting tasks; original content files are preserved. Difficulty follows task depth, not coverage or requiredScore.',
              'expansionPolicy':'Fill missing PRIMARY LOW/MEDIUM/HIGH skill packages. Add one explicit supporting practice and one provided incidental context per new module. Values are independent authoring choices awaiting expert review.',
              'revisedExistingModules':revisions,'newModules':new_specs,'teachingPairs':assignments,
              'counts':{'newModules':len(new_specs),'modules':len(data['LearningModules']),'teachingPairs':len(assignments)},
              'focusCounts':dict(Counter(a['teachingFocus'] for a in assignments)),
              'difficultyCounts':dict(Counter(a['difficultyLevel'] for a in assignments))}
    MANIFEST.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({**manifest['counts'],'focusCounts':manifest['focusCounts'],'difficultyCounts':manifest['difficultyCounts']},indent=2))

if __name__=='__main__':build()
