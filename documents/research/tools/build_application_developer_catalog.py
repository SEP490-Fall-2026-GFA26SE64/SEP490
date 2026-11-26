"""Build a synthetic benchmark specification, never profiles or application data.
Hand-authored skill outcomes and case scopes below are research proposals.
Run with the bundled Python. Refuses to overwrite a frozen/reviewed catalog.
"""
from pathlib import Path
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
OUT=ROOT/'data/rq1/application-developer-v0.1'
VERSION='research-ad-0.1'
LEVELS=['FOUNDATION','INTERMEDIATE','ADVANCED']
SOURCES={
 'V3': {'title':'Project registration Version 3','kind':'user supplied requirement','path':'../../../sources/version-3/research-scope-extract.md'},
 'GOV': {'title':'UK Government software developer role','url':'https://understand-digital-data-roles-skills.service.gov.uk/role/software-developer/','use':'Broad role scope and responsibility progression; local levels and requirements are not an official equivalence.'},
 'MDN': {'title':'MDN Curriculum','url':'https://developer.mozilla.org/en-US/curriculum/','use':'Frontend topic coverage; does not establish our Intermediate or Advanced thresholds.'},
 'OWASP': {'title':'OWASP ASVS overview','url':'https://asvs.owasp.org/','use':'Security scope context, not certification or a full ASVS compliance mapping.'},
 'PG': {'title':'PostgreSQL transactions tutorial','url':'https://www.postgresql.org/docs/current/tutorial-transactions.html','use':'Transaction concept reference; not a required technology stack.'},
 'GH': {'title':'Understanding GitHub Actions','url':'https://docs.github.com/en/actions/get-started/understand-github-actions','use':'CI workflow concepts; GitHub is an example, not required vendor.'},
 'LOCAL': {'title':'Existing skill-level seed','path':'../../../../dataset/import/ontology_seed-skill-level.json','use':'Retained identities and legacy comparison; seed approvals are not research expert approval.'}
}
# id suffix | group | concise topic | scope exclusion | source | three level-specific outcomes (two per level) | three distinct scenario titles
ROWS=[
('CORE01','Implementation','Executable business logic','Framework deployment and architecture selection','GOV',
 ['Trace branching and collection operations for a small order calculator;Identify boundary inputs and explain the expected result',
 'Implement decomposed pricing logic with explicit error handling;Verify empty, invalid and boundary cases without changing the stated rules',
 'Evaluate alternative implementations under changing discount policies;Justify complexity and maintainability trade-offs using failure cases'],
 ['Tracing a shopping-basket calculator','Implementing a subscription price engine','Evolving promotion rules safely']),
('CORE02','Delivery','Version-controlled collaboration','Build pipeline authoring and application debugging','GOV',
 ['Explain commits, branches and working-tree changes;Recover a mistaken local edit without losing unrelated work',
 'Resolve a conflicting feature change while preserving both intended behaviors;Prepare a reviewable history and identify the tested revision',
 'Design a branching and hotfix strategy for concurrent releases;Evaluate rollback and traceability risks across maintained versions'],
 ['Recovering a local edit','Reconciling two checkout changes','Coordinating a hotfix across releases']),
('CORE03','Requirements','Verifiable software requirements','UI styling and implementation of the whole feature','GOV',
 ['Identify actors, inputs and outputs in a small user request;Write observable acceptance examples including one failure case',
 'Resolve ambiguities in a multi-step user workflow;Define testable business rules and boundaries before implementation',
 'Reconcile conflicting functional and quality constraints;Prioritize a bounded release with traceable acceptance and explicit residual risk'],
 ['Specifying a password-change request','Clarifying a booking workflow','Negotiating a constrained product release']),
('CORE04','Delivery','Controlled application release','Cloud platform administration and continuous-integration pipeline design','GOV',
 ['Explain configuration, artifact and health-check roles in a release;Identify the rollback point in a supplied deployment procedure',
 'Plan a reproducible application rollout with environment-specific configuration;Verify service health and define rollback triggers',
 'Evaluate staged rollout alternatives under migration and availability constraints;Specify evidence for safe rollback when versions coexist'],
 ['Reading a release checklist','Rolling out a booking service','Planning a staged release with schema changes']),
('FS01','Frontend','User interaction design','Semantic HTML implementation and visual branding','MDN',
 ['Identify interface states and navigation for a simple user task;Explain the purpose of clear labels and actionable feedback',
 'Specify interaction states for an interrupted multi-step task;Resolve navigation and error-recovery ambiguities with a flow model',
 'Compare interaction alternatives for conflicting user needs;Justify recovery and consistency decisions across complex workflows'],
 ['Mapping a registration journey','Designing resumable checkout','Reviewing complex account-management flows']),
('FS02','Frontend','Accessible web interaction','Full accessibility certification and purely visual layout work','MDN',
 ['Explain semantic controls, accessible names and keyboard order;Identify inaccessible interactions in a small form',
 'Specify keyboard and focus behavior for a dialog and validation flow;Check accessible names and dynamic feedback against observable criteria',
 'Evaluate accessibility trade-offs in a complex interactive widget;Design a verification strategy across input methods and assistive use'],
 ['Finding barriers in a sign-up form','Managing focus in a confirmation dialog','Reviewing an interactive data workspace']),
('FS03','Backend','Application API contracts','Database schema design and UI implementation','GOV',
 ['Explain request, response and error conventions for a resource API;Select suitable operations and response meanings for basic CRUD',
 'Specify pagination, validation and repeat-request behavior for an API;Check examples for consistent success and failure contracts',
 'Evaluate versioning and compatibility strategies for changing consumers;Justify idempotency and failure semantics under partial completion'],
 ['Describing a notes API','Specifying a paginated inventory API','Evolving a reservation API contract']),
('FS04','Data','Relational data queries','Database administration and transaction-isolation design','GOV',
 ['Explain filtering, joining and aggregation on related tables;Predict the result of a query with missing or duplicate rows',
 'Construct queries for grouped business reports with explicit null handling;Check result correctness against a small reference dataset',
 'Compare equivalent query formulations under skewed data and access constraints;Justify an optimization while preserving result semantics'],
 ['Reading customer and order queries','Building a stock movement report','Reviewing a high-volume reporting query']),
('FS05','Backend','Component integration','Individual function implementation and API naming conventions alone','GOV',
 ['Identify producer, consumer and exchanged data in an integration;Explain how a failed dependency affects a user operation',
 'Specify component coordination with timeouts and partial-failure handling;Define contract and integration checks for the combined workflow',
 'Evaluate recovery strategies for repeated or out-of-order messages;Justify consistency and coupling trade-offs across service boundaries'],
 ['Following an order notification','Connecting checkout to a notification service','Recovering a distributed fulfillment workflow']),
('FS06','Quality','Systematic defect diagnosis','Broad monitoring infrastructure and feature redesign','GOV',
 ['Reproduce a defect from a bounded input and observed output;Distinguish symptoms from a testable causal hypothesis',
 'Trace a failure across UI, API and persistence boundaries;Verify the smallest justified correction with a regression case',
 'Evaluate competing explanations for an intermittent production-like fault;Design discriminating observations and validate a fix under recurrence conditions'],
 ['Diagnosing an incorrect total','Tracing a lost form update','Investigating an intermittent duplicate order']),
('FS07','Quality','Automated unit verification','Full end-to-end browser testing and performance benchmarking','GOV',
 ['Explain assertions, test isolation and boundary cases;Identify useful tests for a pure validation function',
 'Design deterministic unit tests around service collaborators;Verify error behavior without coupling tests to private implementation details',
 'Evaluate a unit-test suite for blind spots and brittle doubles;Select high-value cases for complex state transitions and mutation risks'],
 ['Checking a quantity validator','Testing a stock reservation service','Reviewing tests for a pricing state machine']),
('FS08','Quality','Code review decisions','Writing a new feature and managing Git conflicts','GOV',
 ['Distinguish correctness defects from style preferences in a patch;Write actionable feedback tied to an observable risk',
 'Review a feature diff for boundary behavior, tests and maintainability;Prioritize blocking findings and explain suggested corrections',
 'Evaluate cross-cutting design and security risks in a large change;Justify review decisions with evidence and proportionate verification'],
 ['Commenting on a small validation patch','Reviewing an account-update feature','Reviewing a cross-service permission change']),
('FS09','Frontend','Responsive interface layout','Visual brand design and keyboard accessibility verification','MDN',
 ['Explain flexible sizing, flow and viewport-dependent layout;Identify overflow causes in a simple page',
 'Specify a responsive layout across narrow and wide viewports;Preserve content order and usable controls with long text and tables',
 'Evaluate layout strategies for dense data and localization constraints;Define checks for content loss, reflow and interaction stability'],
 ['Understanding a flexible product grid','Adapting a management screen','Reviewing a localized analytics layout']),
('FS10','Frontend','Semantic HTML structure','CSS layout and custom-widget interaction programming','MDN',
 ['Choose elements matching headings, navigation and form intent;Explain the difference between a link and an action control',
 'Structure a complex document and form with meaningful relationships;Validate labels, groups and native interaction semantics',
 'Evaluate competing markup structures for reusable components;Justify native-element choices and semantic constraints during composition'],
 ['Structuring a contact page','Marking up a grouped application form','Reviewing reusable page primitives']),
('FS11','Frontend','Asynchronous browser requests','Server API design and distributed-message processing','MDN',
 ['Explain pending, success and failure states of a browser request;Distinguish HTTP failure from a successful empty response',
 'Handle cancellation and stale responses in an interactive search;Specify consistent loading, empty and retry states',
 'Evaluate coordination strategies for overlapping browser operations;Justify freshness and recovery rules under races and intermittent connectivity'],
 ['Reading a remote-list request','Preventing stale search results','Coordinating edits during unreliable connectivity']),
('FS12','Security','Application input validation','Authorization policy and cryptographic implementation','OWASP',
 ['Distinguish required, malformed and out-of-range input;Explain why client checks do not replace server validation',
 'Specify consistent validation and feedback at request boundaries;Check nested, missing and adversarial input without trusting the client',
 'Evaluate validation policy across multiple entry points and schema versions;Justify canonicalization and compatibility decisions against ambiguous input'],
 ['Checking a registration payload','Validating a nested order request','Reviewing validation across evolving clients']),
('FS13','Security','Resource authorization','Identity-provider setup and general authentication implementation','OWASP',
 ['Distinguish authentication from permission to act on a resource;Identify missing ownership checks in a simple access scenario',
 'Specify trusted actor, organization and resource checks for protected operations;Verify allowed and denied cases including cross-organization access',
 'Evaluate authorization consistency across delegated and asynchronous actions;Justify policy decisions under stale grants and concurrent changes'],
 ['Explaining access to a private note','Protecting a multi-tenant project API','Reviewing delegated access during permission changes']),
('FS14','Data','Atomic data updates','Standalone SQL reporting and distributed consensus','PG',
 ['Explain commit and rollback for related database changes;Identify a partial-update failure that violates a business invariant',
 'Define transaction boundaries for a concurrent reservation;Check rollback and competing updates against a stated invariant',
 'Evaluate isolation, lock and retry alternatives under contention;Justify correctness and throughput trade-offs for overlapping transactions'],
 ['Reasoning about an account transfer','Protecting inventory reservations','Reviewing a contended allocation workflow']),
('FS15','Implementation','Behavior-preserving restructuring','New business features and architecture replacement','GOV',
 ['Identify duplication and mixed responsibilities in a small function;Explain how characterization checks protect existing behavior',
 'Plan incremental restructuring of a coupled service;Preserve public behavior with focused regression checks',
 'Evaluate alternative decompositions for a legacy subsystem;Justify migration steps and compatibility checks under ongoing change'],
 ['Recognizing duplication in order rules','Separating a coupled checkout service','Restructuring a legacy pricing subsystem']),
('FS16','Delivery','Continuous integration workflows','Production rollout and infrastructure provisioning','GH',
 ['Explain triggers, jobs and build-test artifacts in a pipeline;Identify how a failing check blocks an unsafe merge',
 'Specify a reproducible build and test workflow for a web application;Handle dependency setup and diagnostic artifacts on failure',
 'Evaluate pipeline isolation, caching and parallelization trade-offs;Justify reliable checks under untrusted changes and constrained runners'],
 ['Reading a pull-request check','Building a repeatable verification pipeline','Reviewing a secure parallel build workflow'])
]
# Additional alternatives have the same target outcomes, but a distinct scenario and bounded emphasis.
ALTS={
 'FS03': [('A library lending endpoint','resource identity and not-found responses'),('A support-ticket search endpoint','filter combinations and repeat submissions'),('A partner-facing billing contract','consumer migration and retry ambiguity')],
 'FS07': [('A date-range validator','empty and inverted ranges'),('A notification scheduling unit','clock control and failed collaborators'),('An entitlement decision suite','state transitions and misleading test doubles')],
 'FS11': [('A remote weather panel','empty responses and network failures'),('A dependent address selector','cancellation when the parent selection changes'),('An offline-tolerant draft editor','reconciliation of overlapping saves')],
 'FS14': [('A booking and payment record','rollback of related writes'),('A limited-seat booking transaction','conflicting reservations and retries'),('A concurrent credit-allocation process','isolation anomalies and lock ordering')]
}
def dump(name,obj):
 (OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def hashfile(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 OUT.mkdir(parents=True,exist_ok=True)
 if (OUT/'manifest.json').exists():
  prev=json.loads((OUT/'manifest.json').read_text())
  if prev.get('frozen') or prev.get('reviewStatus')!='NEEDS_EXPERT_REVIEW':raise RuntimeError('Create a new version instead of overwriting reviewed data')
 if (OUT/'review-items.json').exists():
  old_reviews=json.loads((OUT/'review-items.json').read_text())
  if any(any(x.get(k) is not None for k in ['decision','reviewerId','reviewedAt','comment']) for x in old_reviews):raise RuntimeError('Preserve real reviews in a new version before rebuilding')
 seedpath=REPO/'documents/dataset/import/ontology_seed-skill-level.json'
 seed=json.loads(seedpath.read_text()); old={s['id']:s for s in seed['MicroSkills']}
 review={'reviewStatus':'NEEDS_EXPERT_REVIEW','reviewedBy':None,'reviewedAt':None}
 skills=[];modules=[];bindings=[]
 for suffix,group,topic,excluded,source,outcomes,titles in ROWS:
  sid='MS-'+suffix
  defs={}
  for level,raw in zip(LEVELS,outcomes):
   defs[level]=[{'code':f'{sid}-{level}-{i+1:02d}','text':s.strip()} for i,s in enumerate(raw.split(';'))]
  skills.append({'id':sid,'version':VERSION,'name':old[sid]['name'],'definition':old[sid]['definition'],'researchFocus':topic,'competencyGroup':group,'provisionMode':'MODULE_ONLY','knowledgeOutcomes':defs,'excludedScope':excluded,'sourceIds':['LOCAL',source],**review})
  for li,level in enumerate(LEVELS):
   cases=[(titles[li],None)]+([ALTS[suffix][li]] if suffix in ALTS else [])
   for vi,(title,emphasis) in enumerate(cases,1):
    mid='RQM-'+hashlib.sha256(f'{suffix}|{level}|{vi}'.encode()).hexdigest()[:12].upper()
    text=f'This synthetic module specification concerns {topic.lower()} through the case "{title}". '
    text+=['It introduces concepts and interpretation of a bounded example.','It addresses independent application and checks within a stated workflow.','It addresses evaluation of alternatives under interacting constraints.'][li]
    if emphasis:text+=f' The case emphasizes {emphasis}.'
    modules.append({'id':mid,'revision':1,'contentVersion':VERSION,'organizationId':'RESEARCH-AD-ORG','title':title,'description':text,'knowledgeLevel':level,'learningOutcomes':[x['text'] for x in defs[level]],'includedScope':topic,'excludedScope':excluded,'scenarioFocus':emphasis or title,'language':'en','artifactType':'SYNTHETIC_MODULE_SPECIFICATION','benchmarkAvailability':'CANDIDATE','applicationPublicationState':None,'durationMinutes':None,'price':None,'sourceIds':[source],**review})
    bindings.append({'moduleId':mid,'skillId':sid,'skillVersion':VERSION,'knowledgeLevel':level,'outcomeCodes':[x['code'] for x in defs[level]],'mappingRationale':'Both stated outcomes target this exact research skill and knowledge group; subject to independent expert review.',**review})
 # Explicit sets; no inferred inheritance or equivalence between knowledge levels.
 req=[]
 advanced={'CORE01','CORE03','FS03','FS05','FS06','FS07','FS08','FS12','FS13','FS14','FS15','FS16'}
 for rolelevel in ['Junior','Middle','Senior']:
  for suffix,*_ in ROWS:
   if rolelevel=='Junior' and suffix in {'FS08','FS15'}:continue
   levels=['FOUNDATION']
   if rolelevel!='Junior': levels=['FOUNDATION','INTERMEDIATE']
   if rolelevel!='Junior' and suffix in {'FS08','FS15'}:levels=['INTERMEDIATE']
   if suffix=='FS10':levels=['FOUNDATION'] # semantic literacy maintained, advanced markup not mandatory for every role
   if rolelevel=='Senior' and suffix in advanced:levels=levels+['ADVANCED']
   rationale=('Junior scope is bounded implementation and interpretation with guidance.' if rolelevel=='Junior' else 'Middle scope includes independent application across the full-stack workflow.' if rolelevel=='Middle' else 'Senior scope adds judgment of interacting implementation, quality and security constraints.')
   if suffix=='FS10':rationale+=' Native markup literacy is required; specialized advanced markup remains an available learning option.'
   if suffix in {'FS08','FS15'}:rationale+=' These responsibilities start as explicit independent requirements at Middle.'
   if rolelevel=='Senior' and suffix not in advanced:rationale+=' Independent application is sufficient here; advanced specialist depth is not required by this bounded role.'
   req.append({'id':f'RQR-{rolelevel.upper()}-{suffix}','roleId':'ROLE-F72E5464F9B3','roleLevel':rolelevel,'skillId':'MS-'+suffix,'skillVersion':VERSION,'requiredKnowledgeLevels':levels,'mandatory':True,'rationale':rationale,'sourceIds':['GOV','V3'],**review})
 # Edges point from dependent to prerequisite; each pair is explicit and locally proposed.
 edge_specs=[
 ('FS01','FOUNDATION','CORE03','FOUNDATION','Interface states require an understood user task.'),
 ('FS02','FOUNDATION','FS10','FOUNDATION','Accessible controls depend on native element meanings.'),
 ('FS02','INTERMEDIATE','FS10','FOUNDATION','Focus and naming decisions require semantic control knowledge.'),
 ('FS09','FOUNDATION','FS10','FOUNDATION','Layout changes must preserve document structure.'),
 ('FS09','INTERMEDIATE','FS10','FOUNDATION','Responsive composition requires meaningful source order.'),
 ('FS03','FOUNDATION','CORE01','FOUNDATION','Request processing examples assume basic executable logic.'),
 ('FS03','INTERMEDIATE','CORE03','FOUNDATION','API behavior must reflect stated requirements.'),
 ('FS05','FOUNDATION','FS03','FOUNDATION','Integration interpretation requires an interface contract.'),
 ('FS05','INTERMEDIATE','FS03','INTERMEDIATE','Independent coordination requires explicit failure contracts.'),
 ('FS11','FOUNDATION','CORE01','FOUNDATION','Request callbacks assume basic control-flow understanding.'),
 ('FS11','INTERMEDIATE','FS03','FOUNDATION','Client failures must distinguish response contract meanings.'),
 ('FS12','FOUNDATION','CORE01','FOUNDATION','Validation examples rely on predicates and branches.'),
 ('FS13','FOUNDATION','CORE01','FOUNDATION','Permission decisions require conditional logic.'),
 ('FS13','INTERMEDIATE','FS03','FOUNDATION','Protected operations need a defined request boundary.'),
 ('FS14','FOUNDATION','FS04','FOUNDATION','Atomic updates assume knowledge of data manipulation.'),
 ('FS14','INTERMEDIATE','FS04','INTERMEDIATE','Concurrent update scenarios require independent query construction.'),
 ('FS06','FOUNDATION','CORE01','FOUNDATION','Diagnosis requires interpreting the failing program.'),
 ('FS07','FOUNDATION','CORE01','FOUNDATION','Unit assertions require understanding program outputs.'),
 ('FS08','INTERMEDIATE','CORE01','INTERMEDIATE','Review of implementation depends on independent code comprehension.'),
 ('FS15','INTERMEDIATE','FS07','INTERMEDIATE','Restructuring relies on regression checks around collaborators.'),
 ('FS16','FOUNDATION','CORE02','FOUNDATION','Pipeline triggers refer to identifiable source changes.'),
 ('FS16','INTERMEDIATE','FS07','FOUNDATION','Build verification needs interpretable automated test results.'),
 ('CORE04','INTERMEDIATE','CORE02','FOUNDATION','A repeatable release requires an identifiable revision.')]
 edge_specs += [
 ('FS03','ADVANCED','CORE03','INTERMEDIATE','Compatibility decisions depend on explicit workflow constraints.'),
 ('FS05','ADVANCED','FS03','INTERMEDIATE','Recovery across services requires stable failure contracts.'),
 ('FS11','ADVANCED','FS03','INTERMEDIATE','Client coordination must respect repeat-request behavior.'),
 ('FS13','ADVANCED','FS03','INTERMEDIATE','Distributed permission checks need explicit operation contracts.'),
 ('FS14','ADVANCED','FS04','INTERMEDIATE','Isolation analysis depends on understanding concurrent queries.'),
 ('FS15','ADVANCED','FS07','INTERMEDIATE','Legacy restructuring requires independent regression-test design.'),
 ('FS16','ADVANCED','CORE02','INTERMEDIATE','Pipeline isolation depends on branch and change provenance.'),
 ('CORE04','ADVANCED','CORE02','INTERMEDIATE','Coexisting releases require reliable revision management.')]
 prerequisites=[]
 for i,(a,al,b,bl,why) in enumerate(edge_specs,1):
  prerequisites.append({'id':f'RQP-{i:03d}','dependentSkillId':'MS-'+a,'dependentKnowledgeLevel':al,'prerequisiteSkillId':'MS-'+b,'prerequisiteKnowledgeLevel':bl,'skillVersion':VERSION,'relationType':'HAS_SKILL_PREREQUISITE','rationale':why,'sourceIds':['LOCAL'],'origin':'LOCAL_RESEARCH_ORDERING_PROPOSAL','applyToInitialGapExpansion':False,**review})
 role={'id':'ROLE-F72E5464F9B3','name':'Application Developer','researchSpecialization':'Web full-stack','version':VERSION,'levels':[
 {'name':'Junior','ordinal':1,'scope':'Bounded implementation with guidance; identify errors and follow established checks.'},
 {'name':'Middle','ordinal':2,'scope':'Independently implement, integrate and verify an application change.'},
 {'name':'Senior','ordinal':3,'scope':'Evaluate cross-cutting trade-offs and guide changes under interacting constraints.'}],
 'knowledgeSemantics':'FOUNDATION, INTERMEDIATE and ADVANCED are distinct explicit groups, not automatic supersets. Role levels specify sets of groups. Baseline passes do not grant official achievement.',**review}
 # Preserve old requirement scope for actual diff, no reviewer identities copied.
 old_levels={l['id']:l['name'] for l in seed['Levels'] if l['targetRoleId']==role['id']}
 legacy=[{'roleLevel':old_levels[r['fromId']],'skillId':r['toId'],'requiredKnowledgeLevels':r['requiredKnowledgeLevels']} for r in seed['relationships'] if r['type']=='REQUIRES_SKILL' and r['fromId'] in old_levels]
 oldmap={(r['roleLevel'],r['skillId']):r['requiredKnowledgeLevels'] for r in legacy}
 changes=[{'roleLevel':r['roleLevel'],'skillId':r['skillId'],'oldKnowledgeLevels':oldmap.get((r['roleLevel'],r['skillId'])),'newKnowledgeLevels':r['requiredKnowledgeLevels'],'change':'ADDED_TO_ROLE' if (r['roleLevel'],r['skillId']) not in oldmap else 'RETAINED' if oldmap[(r['roleLevel'],r['skillId'])]==r['requiredKnowledgeLevels'] else 'REVISED','rationale':r['rationale']} for r in req]
 for source in SOURCES.values():source['accessedOn']='2026-11-23'
 for name,obj in [('role.json',role),('skills.json',skills),('modules.json',modules),('teaching-bindings.json',bindings),('requirements.json',req),('prerequisites.json',prerequisites),('sources.json',SOURCES),('legacy-requirements.json',legacy),('change-log.json',changes)]:dump(name,obj)
 review_items=[{'objectType':kind,'objectId':x['id'],'decision':None,'reviewerId':None,'reviewedAt':None,'comment':None} for kind,rows in [('skill',skills),('requirement',req),('prerequisite',prerequisites),('module',modules)] for x in rows]
 dump('review-items.json',review_items)
 # Review cards deliberately omit skill IDs and mapping labels; IDs identify cards only, not recommendations.
 cards=['# Module specification cards','', 'Synthetic benchmark descriptions, not complete lessons or verified courses. Review status: NEEDS_EXPERT_REVIEW. No algorithm scores, rankings or relevance labels. A later annotation interface must randomize card order and hide teaching bindings.','']
 for m in modules:
  cards += [f"## {m['id']} — {m['title']}",'',f"Knowledge group: {m['knowledgeLevel']}",'',m['description'],'','Learning outcomes:']+['- '+x for x in m['learningOutcomes']]+['',f"Included: {m['includedScope']}.",f"Excluded: {m['excludedScope']}.",'']
 (OUT/'MODULE_CARDS.md').write_text('\n'.join(cards))
 matrix=['# Application Developer competency matrix','','Local research proposal; no official occupational equivalence. F = FOUNDATION; I = INTERMEDIATE; A = ADVANCED. Each letter is an explicit requirement, not an implicit hierarchy.','','| Skill | Focus | Junior | Middle | Senior |','|---|---|---|---|---|']
 for s in skills:
  cells=[]
  for l in ['Junior','Middle','Senior']:
   r=next((r for r in req if r['skillId']==s['id'] and r['roleLevel']==l),None)
   cells.append(', '.join(x[0] for x in r['requiredKnowledgeLevels']) if r else 'Not required')
  matrix.append('| '+ ' | '.join([s['id'],s['researchFocus']]+cells)+' |')
 matrix+=['','## Knowledge outcomes','']
 for s in skills:
  matrix += [f"### {s['id']} — {s['name']}",'',s['definition'],'']
  for l in LEVELS:matrix+=['- '+l+': '+'; '.join(x['text'] for x in s['knowledgeOutcomes'][l])]
  matrix+=['']
 (OUT/'COMPETENCY_MATRIX.md').write_text('\n'.join(matrix))
 prereq_lines=['# Prerequisite review table','','Direction: dependent skill/knowledge → prerequisite skill/knowledge. Local proposed learning order, not automatic initial gap expansion. All rows need expert review.','','| ID | Dependent | Prerequisite | Rationale |','|---|---|---|---|']
 names={s['id']:s['researchFocus'] for s in skills}
 for e in prerequisites:
  prereq_lines.append('| '+' | '.join([e['id'],names[e['dependentSkillId']]+' / '+e['dependentKnowledgeLevel'],names[e['prerequisiteSkillId']]+' / '+e['prerequisiteKnowledgeLevel'],e['rationale']])+' |')
 (OUT/'PREREQUISITES.md').write_text('\n'.join(prereq_lines)+'\n')
 manifest={'datasetId':'application-developer-catalog','version':VERSION,'schemaVersion':1,'createdAt':'2026-11-23','phase':'CATALOG_PREPARATION','frozen':False,'reviewStatus':'NEEDS_EXPERT_REVIEW','reviewedBy':None,'reviewedAt':None,'profileCount':0,'expertLabelCount':0,'counts':{'skills':len(skills),'modules':len(modules),'skillKnowledgePairs':len(skills)*3,'requirementRows':len(req),'requiredGroupsByRoleLevel':{l:sum(len(r['requiredKnowledgeLevels']) for r in req if r['roleLevel']==l) for l in ['Junior','Middle','Senior']},'prerequisiteEdges':len(prerequisites)},'generatorSha256':hashfile(Path(__file__)),'legacySource':{'path':str(seedpath.relative_to(REPO)),'sha256':hashfile(seedpath)},'randomSeed':None,'generationMethod':'Deterministic assembly of locally authored specifications; no random profiles or inferred expert labels.','applicationImportReady':False,'limitations':['Local role requirements and prerequisite choices require expert review.','Module descriptions are synthetic and do not establish learning effectiveness.','No engine parity or final RQ1 scoring performed.'],'files':{p.name:hashfile(p) for p in sorted(OUT.iterdir()) if p.suffix in {'.json','.md'} and p.name!='manifest.json'}}
 dump('manifest.json',manifest)
 print(json.dumps(manifest['counts'],indent=2))
if __name__=='__main__':build()
