"""Read-only schema capture and PlantUML generation. No migrations or data writes.
Use --snapshot FILE for offline regeneration; render .puml separately with PlantUML.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, zlib
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SQL = """
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object(
 'server',current_setting('server_version'),'schema','platform',
 'migrations',(SELECT json_agg(row_to_json(x) ORDER BY installed_rank) FROM
   (SELECT installed_rank,version,description,script,checksum,success FROM public.flyway_schema_history) x),
 'columns',(SELECT json_agg(json_build_object('table',t.relname,'position',a.attnum,
   'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'required',a.attnotnull,
   'default',pg_get_expr(d.adbin,d.adrelid),
   'pk',EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=t.oid AND c.contype='p' AND a.attnum=ANY(c.conkey)),
   'fk',EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conrelid=t.oid AND c.contype='f' AND a.attnum=ANY(c.conkey)))
   ORDER BY t.relname,a.attnum) FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
   JOIN pg_attribute a ON a.attrelid=t.oid LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
   WHERE n.nspname='platform' AND t.relkind='r' AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT json_agg(json_build_object('table',t.relname,'name',c.conname,'kind',c.contype,
   'parent',p.relname,'validated',c.convalidated,'definition',pg_get_constraintdef(c.oid,true))
   ORDER BY t.relname,c.conname) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
   JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class p ON p.oid=c.confrelid WHERE n.nspname='platform'),
 'indexes',(SELECT json_agg(row_to_json(x) ORDER BY tablename,indexname) FROM
   (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='platform') x),
 'triggers',(SELECT json_agg(json_build_object('table',t.relname,'name',g.tgname,
   'enabled',g.tgenabled,'definition',pg_get_triggerdef(g.oid,true)) ORDER BY t.relname,g.tgname)
   FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE n.nspname='platform' AND NOT g.tgisinternal),
 'functions',(SELECT json_agg(json_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'definition',pg_get_functiondef(p.oid)) ORDER BY p.proname,p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='platform' AND p.prokind='f')
)::text;
COMMIT;
"""
GROUPS = [
 ('postgresql','Identity, catalog and processing','organization organizational_unit account application_role account_role manager_scope session learner_state catalog_guard catalog_release catalog_reference target_selection target_selection_request outbox_event processing_job processing_receipt audit_event'.split()),
 ('postgresql-assessment','Legacy assessment and shared learning','evidence_policy_version model_version question_bank item_version assessment_version assessment_availability assessment_item item_skill_mapping baseline_blueprint baseline_blueprint_version baseline_blueprint_role baseline_blueprint_skill baseline_assessment_series baseline_blueprint_working_revision baseline_assessment_transition baseline_management_command baseline_answer_reveal_audit module_assessment_binding learning_activity activity_requirement assessment_assignment assessment_attempt item_response assessment_result evidence_observation processing_stream profile_revision mastery_estimate evidence_application progress_revision module_completion completion_pass'.split()),
 ('postgresql-pathway','Recommendation, analytics and evaluation','recommendation_version recommendation_run recommendation_candidate pathway_revision pathway_step pathway_approval publication_request cohort_snapshot cohort_member analytics_snapshot roi_scenario evaluation_run evaluation_artifact'.split()),
 ('postgresql-adaptive-blueprint','Adaptive baseline configuration','baseline_adaptive_blueprint_working_revision baseline_adaptive_blueprint_version baseline_adaptive_blueprint_role baseline_adaptive_blueprint_skill baseline_blueprint_working_registry baseline_blueprint_version_registry baseline_blueprint_activation baseline_blueprint_activation_event baseline_blueprint_command'.split()),
 ('postgresql-adaptive-attempt','Adaptive baseline attempts and evidence','baseline_adaptive_attempt baseline_attempt_pool_item baseline_attempt_item baseline_attempt_response baseline_attempt_skill_state baseline_attempt_command baseline_attempt_result baseline_attempt_skill_result baseline_mastery_evidence'.split()),
 ('postgresql-irt','IRT calibration and scoped selection','mastery_mapping_version irt_calibration_run irt_parameter_set irt_item_parameter irt_effective_parameter_selection irt_parameter_promotion_command'.split()),
 ('postgresql-role-profile','Current Role selection and initial Occupation profile','employee_role_selection employee_role_selection_request employee_occupation_profile'.split()),
]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot',type=Path)
    args=parser.parse_args()
    if args.snapshot:
        catalog=json.loads(args.snapshot.read_text(encoding='utf-8'))
    else:
        result=subprocess.run(['docker','compose','-f',str(REPO/'compose.dev.yml'),'exec','-T','postgres',
            'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','adapt_learn_graph','-d','adapt_learn_graph'],
            input=SQL,capture_output=True,text=True,check=True,encoding='utf-8')
        catalog=json.loads(result.stdout)
        catalog['capturedAtUtc']=datetime.now(timezone.utc).isoformat()
    tables=sorted({x['table'] for x in catalog['columns']})
    grouped=[t for _,_,ts in GROUPS for t in ts]
    if len(grouped)!=len(set(grouped)) or set(tables)!=set(grouped):
        raise SystemExit(f'Group coverage mismatch: missing={set(tables)-set(grouped)}, extra={set(grouped)-set(tables)}')
    sources=[]
    for path in sorted((REPO/'backend/src/main/resources/db/migration').glob('V*__*.sql')):
        crc=0
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            crc=zlib.crc32(line.encode('utf-8'),crc)
        sources.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'checksum':crc if crc<2**31 else crc-2**32})
    applied={x['script']:x for x in catalog['migrations']}
    if len(sources)!=len(applied) or any(s['file'] not in applied or
        s['checksum']!=applied[s['file']]['checksum'] or not applied[s['file']]['success'] for s in sources):
        raise SystemExit('Migration source/history mismatch; refusing current-schema label')
    catalog['migrationSources']=sources
    latest=max(int(x['version']) for x in catalog['migrations'])
    fks=[x for x in catalog['constraints'] if x['kind']=='f']
    edges=sorted({(x['parent'],x['table']) for x in fks})
    counts={'tables':len(tables),'columns':len(catalog['columns']),'constraints':len(catalog['constraints']),
        'foreignKeys':len(fks),'foreignKeyTablePairs':len(edges),'indexes':len(catalog['indexes']),
        'triggers':len(catalog['triggers']),'functions':len(catalog['functions'])}
    catalog['summary']=counts
    catalog['groups']=[{'file':f,'name':n,'tables':ts} for f,n,ts in GROUPS]
    (HERE/'postgresql-schema-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
    def start(title):
        return ['@startuml','!pragma layout smetana','top to bottom direction','skinparam shadowing false',
            'hide circle','skinparam classAttributeIconSize 0','skinparam defaultFontName SansSerif',
            'skinparam defaultFontSize 12',f'title PostgreSQL {catalog["server"]} / platform / V1-V{latest}\\n{title}',
            'legend top left','PK = primary key; FK = foreign-key column; ? = nullable',
            'Arrows: referenced parent -> referencing child; no cardinality inference.',
            'External tables are reference stubs. Full constraints/indexes/triggers: schema catalog.','endlegend']
    for filename,name,group in GROUPS:
        lines=start(f'{name} ({len(group)} tables)')
        for table in group:
            lines.append(f'class {table} {{')
            for c in catalog['columns']:
                if c['table']==table:
                    tags=[k.upper() for k in ('pk','fk') if c[k]]
                    suffix=' ['+', '.join(tags)+']' if tags else ''
                    lines.append(f'  {c["name"]}{"" if c["required"] else "?"} : {c["type"]}{suffix}')
            lines.append('}')
        relevant=[(p,c) for p,c in edges if c in group]
        for table in sorted({p for p,c in relevant if p not in group}):
            lines.append(f'class {table} <<external>> #F1F5F9')
        lines.extend(f'{p} --> {c}' for p,c in relevant)
        lines.append('@enduml')
        (HERE/(filename+'.puml')).write_text('\n'.join(lines)+'\n',encoding='utf-8')
    lines=start(f'All {len(tables)} tables / storage groups')
    ownership={t:f.replace('-','_') for f,_,ts in GROUPS for t in ts}
    for filename,name,group in GROUPS:
        lines.append(f'class "{name}\\n{len(group)} tables" as {filename.replace("-","_")} {{')
        lines.extend('  '+t for t in group)
        lines.append('}')
    group_edges={}
    for fk in fks:
        pair=ownership[fk['parent']],ownership[fk['table']]
        if pair[0]!=pair[1]: group_edges[pair]=group_edges.get(pair,0)+1
    lines.extend(f'{p} --> {c} : {count} FK constraints' for (p,c),count in sorted(group_edges.items()))
    lines.append('@enduml')
    (HERE/'postgresql-overview.puml').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    rows=['# PostgreSQL foreign-key inventory','',f'Generated from the same read-only V{latest} catalog. Each constraint, including composite keys, is listed. No data rows captured.','',
        '| Referencing table | Constraint | Definition |','| --- | --- | --- |']
    rows.extend(f'| `{x["table"]}` | `{x["name"]}` | `{x["definition"].replace("|","&#124;")}` |' for x in fks)
    (HERE/'postgresql-foreign-keys.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
    print(json.dumps({'latestMigration':latest,**counts,'groups':{f:len(ts) for f,_,ts in GROUPS}},indent=2))

if __name__=='__main__': main()
