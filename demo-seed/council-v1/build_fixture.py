"""Build a standalone, versioned demo dataset. Never connects to a service."""
import json
import hashlib
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORG = 'e0000000-0000-0000-0000-000000000001'
EXPERT = 'a0000000-0000-0000-0000-000000000002'
MANAGER = 'a0000000-0000-0000-0000-000000000001'
SOURCE = 'COUNCIL_DEMO_V1'
JP = 'OCC-DEMO-COUNCIL-V1'
ROLE = 'ROLE-DEMO-COUNCIL-V1'
NEXT = 'ROLE-DEMO-NEXT-V1'
AT = '2026-11-18T00:00:00Z'


def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'sep490:council-demo:v1:{name}'))


def build():
    nodes, edges = [], []

    def metadata(identity, version='0.12.0'):
        return dict(id=identity, version=version, status='ACTIVE', reviewStatus='APPROVED',
                    reviewSource='DEVELOPMENT_SEED', fixtureSource=SOURCE,
                    organizationId=ORG, reviewedBy='DEVELOPMENT_SEED', reviewedAt=AT)

    def node(label, identity, **props):
        value = metadata(identity)
        value.update(props)
        nodes.append(dict(label=label, properties=value))
        return identity

    def edge(kind, start, end, **props):
        value = metadata('REL-DEMO-' + uid(kind + ':' + start + ':' + end))
        value.update(props)
        edges.append(dict(type=kind, fromId=start, toId=end, properties=value))

    department = node('Department', uid('department'), name='Council Demo — Development', code='COUNCIL_DEMO')
    node('JobPosition', JP, code='DEMO-COUNCIL-V1', name='Council Demo — Application Engineering', jobZone=4,
         description='Isolated demonstration of learning, prerequisites and certificate evidence; synthetic interest profile.',
         interestRealistic=20, interestInvestigative=36, interestArtistic=26,
         interestSocial=16, interestEnterprising=18, interestConventional=30)
    edge('HAS_JOB_POSITION', department, JP)
    names = ['Unit testing', 'Database transactions', 'Refactoring', 'Input validation certificate', 'SQL query fundamentals']
    for index, name in enumerate(names, 1):
        node('MicroSkill', f'MS-DEMO-0{index}', version='0.12.1', name=name,
             definition=f'Council demo: {name}. Synthetic fixture, not a production qualification.',
             provisionMode='CERTIFICATE_ONLY' if index == 4 else 'MODULE_ONLY',
             foundationOutcomeLabels=[f'Explain {name}'], intermediateOutcomeLabels=[f'Apply {name}'], advancedOutcomeLabels=[f'Evaluate {name}'])
    for role, title, skills in [(ROLE, 'Application Developer — Council Demo', range(1, 6)), (NEXT, 'Application Developer — Next Target Demo', [1])]:
        node('TargetRole', role, code=role.replace('-', '_'), name=title, scope='Explicit demo fixture',
             levels=['M'], competencyIds=[role + '-COMP'], assignedExpertId=EXPERT, assignedExpertName='Dr. Sarah Chen')
        level = node('Level', role + '-M', code='M', name='Middle', rank=2, duration='4 months', context='Council demo', attainmentRule='ALL_MANDATORY_SKILLS')
        competency = node('Competency', role + '-COMP', code=role + '-COMP', name=title + ' capability',
                          description='Controlled end-to-end demonstration', attainmentRule='ALL_MEMBER_SKILLS_AT_OWNING_LEVEL',
                          departmentId=department, departmentName='Council Demo — Development', jobPositionId=JP,
                          jobPositionCode='DEMO-COUNCIL-V1', jobPositionTitle='Council Demo — Application Engineering')
        edge('HAS_ROLE', JP, role)
        edge('HAS_LEVEL', role, level)
        edge('HAS_COMPETENCY', level, competency)
        for index in skills:
            edge('REQUIRES_SKILL', level, f'MS-DEMO-0{index}', isMandatory=True, requiredKnowledgeLevels=['INTERMEDIATE'])
            edge('HAS_SKILL', competency, f'MS-DEMO-0{index}')
    edge('HAS_SKILL_PREREQUISITE', 'MS-DEMO-02', 'MS-DEMO-05', dependentKnowledgeLevel='INTERMEDIATE', prerequisiteKnowledgeLevel='INTERMEDIATE')
    cert = node('Certificate', 'CERT-DEMO-INPUT-V1', version='1', name='Council demo — Input validation evidence',
                description='Demo reference; this definition does not grant employee evidence.', knowledgeLevel='INTERMEDIATE',
                skillVersion='0.12.1', referenceUrl='https://owasp.org/www-project-web-security-testing-guide/', source='DEVELOPMENT_SEED')
    edge('REQUIRES_CERTIFICATE', 'MS-DEMO-04', cert)

    lessons = {
        'A1': ('Unit testing — boundary cases', 1, 'An order discount applies only at a subtotal of 100 or higher. Test 99, 100 and 101 independently. Use fixed inputs, assert the exact output and keep external services out of the unit test.\n\nPractice: write arrange/act/assert cases for the three boundaries. A test that only calls the function without an assertion cannot detect a wrong discount.'),
        'A2': ('Unit testing — isolated dependencies', 1, 'A payment calculation must be tested without contacting the payment gateway. Replace the gateway with a controlled test double and assert the calculation and intended interaction.\n\nPractice: test success and rejection independently. Reset fixtures between cases so test order cannot affect outcomes.'),
        'B1': ('Database transactions — atomic transfers', 2, 'A transfer debits one account and credits another. Put both updates in one database transaction. Commit only when both succeed; roll back both on failure.\n\nPractice: inject failure after the debit and verify both balances are unchanged. Repeating a request needs a stable idempotency key so the transfer is not applied twice.'),
        'P1': ('SQL — parameters and tenant predicates', 5, 'Use a parameterized query for user-supplied values. Obtain tenant identity from the authenticated server context and apply it in the WHERE predicate. A browser-supplied tenant ID does not establish ownership.\n\nPractice: query orders with WHERE organization_id = :trusted_org AND order_id = :order_id. Try an order belonging to another organization and confirm no row is returned.'),
    }
    modules = []
    for suffix, (title, index, body) in lessons.items():
        identity, skill = 'MOD-DEMO-' + suffix, f'MS-DEMO-0{index}'
        text = f'# {title}\n\n{body}\n\nRead to the end, then explicitly mark this lesson complete. Learning completion alone does not award the Skill.\n\nDevelopment demo content; not human-reviewed production training.\n'
        module = node('LearningModule', identity, title=title, moduleType='LESSON_AND_PRACTICE',
                      contentUri=f'content/demo/{identity}.md', contentType='text/markdown', contentVersion='1.0',
                      duration=3, knowledgeLevel='INTERMEDIATE', skillVersion='0.12.1')
        edge('TEACHES', module, skill)
        teaching = edges[-1]['properties']
        # PG authoring metadata uses its strict value-object fields, not arbitrary graph properties.
        meta = lambda props: {k: props[k] for k in ['id', 'version', 'status', 'reviewStatus', 'reviewedBy', 'reviewedAt']}
        content = dict(id='CONTENT-' + identity, title=title, markdown=text, contentType='text/markdown', contentVersion='1.0',
                       jobPositionIds=[JP], createdBy='DEVELOPMENT_SEED', createdAt=AT,
                       lessons=[dict(id=identity + '-TEXT', title=title, type='TEXT', body=text, bodyFormat='MARKDOWN',
                                     durationSeconds=180, durationSource='ESTIMATED', videoSource=None, assetId=None, videoUrl=None)])
        payload = dict(metadata=meta(nodes[-1]['properties']), title=title, moduleType='LESSON_AND_PRACTICE',
                       contentUri=f'content/demo/{identity}.md', contentType='text/markdown', contentVersion='1.0', duration=3,
                       teachings=[dict(metadata=meta(teaching), skillId=skill, skillName=names[index - 1])], content=content,
                       knowledgeLevel='INTERMEDIATE', outcomeCodes=[], skillVersion='0.12.1')
        modules.append(dict(id=identity, organizationId=ORG, jobPositionIds=[JP], createdBy='DEVELOPMENT_SEED', createdAt=AT,
                            lockVersion=1, everReleased=True, archived=False, releasedRevision=1,
                            revisions=[dict(number=1, state='RELEASED', payload=payload, editedBy='DEVELOPMENT_SEED', editedAt=AT,
                                            decidedBy=None, decidedAt=None, feedback=None)],
                            history=[dict(sequence=1, revision=1, action='DEVELOPMENT_SEED_PUBLISHED', actorId='DEVELOPMENT_SEED',
                                          occurredAt=AT, detail='Council fixture. No human review claimed.')], intake=None))

    questions = {
        1: [
            ('Which test detects a discount boundary defect?', ['Call the discount function without asserting.', 'Assert results for totals 99, 100 and 101 independently.', 'Only verify a page loads.', 'Reuse the previous test output.']),
            ('How should a unit test handle a payment dependency?', ['Call the live provider.', 'Use a controlled test double and assert the expected behavior.', 'Disable assertions when offline.', 'Depend on a previous payment.']),
            ('What keeps unit tests independent of execution order?', ['Share mutable global state.', 'Create fresh fixtures and explicit assertions for each case.', 'Run only the last test.', 'Ignore failures after a successful run.']),
            ('MANDATORY: a test passes without asserting the returned discount. What repairs it?', ['Rename the test.', 'Assert the exact expected discount for a fixed input.', 'Increase the timeout.', 'Skip the boundary input.']),
        ],
        2: [
            ('A transfer debit succeeds but its credit fails. What preserves atomicity?', ['Keep the debit.', 'Roll back both updates in the same transaction.', 'Commit before the credit.', 'Retry only the debit.']),
            ('When should a transfer transaction commit?', ['After the first update.', 'After every required update succeeds.', 'Before validating the destination.', 'On any caught exception.']),
            ('A client retries a timed-out transfer. What prevents duplicate application?', ['Generate a new key for every retry.', 'Reuse a stable idempotency key and retain the accepted outcome.', 'Ignore account balances.', 'Apply both requests then inspect manually.']),
            ('MANDATORY: a failed credit must not leave a completed debit. What is required?', ['Separate transactions for each update.', 'One transaction with rollback on failure.', 'Commit debit in a finally block.', 'Treat the error as success.']),
        ],
        3: [
            ('What should a behavior-preserving refactor keep stable?', ['All internal variable names.', 'Observable behavior verified by tests.', 'Every original private method.', 'The number of source lines.']),
            ('What is a safe first step before restructuring a legacy calculation?', ['Delete its tests.', 'Capture current expected behavior with focused tests.', 'Change outputs and structure together.', 'Disable validation.']),
            ('How should a refactor be reviewed?', ['Only compare file sizes.', 'Inspect small changes and rerun behavior checks.', 'Approve after formatting.', 'Ignore public API changes.']),
        ],
        5: [
            ('Which query construction handles an untrusted order identifier safely?', ['Bind it as a parameter and apply the authenticated tenant predicate.', 'Concatenate it into SQL.', 'Trust the tenant ID from the browser.', 'Remove the ownership predicate when empty.']),
            ('Where should the SQL tenant predicate obtain organization identity?', ['The authenticated server context.', 'An editable browser field.', 'The first row in the table.', 'A query string chosen by the caller.']),
            ('An order belongs to a different tenant. What should the scoped SELECT return?', ['No accessible row for the current tenant.', 'The foreign row with its ID hidden.', 'Every row so the browser can filter.', 'The first matching order regardless of tenant.']),
            ('MANDATORY: how do you keep a cross-tenant order inaccessible?', ['Apply the trusted organization predicate as well as the parameterized order ID.', 'Check only that the user is signed in.', 'Use a client-supplied tenant ID.', 'Filter results only in React.']),
        ],
    }
    items = []
    for index, entries in questions.items():
        for n, (prompt, options) in enumerate(entries, 1):
            items.append(dict(id=uid(f'question:{index}:{n}'), versionId=uid(f'item:{index}:{n}'), content=dict(
                prompt=prompt, options=options, correctAnswer=0 if index == 5 else 1, skillId=f'MS-DEMO-0{index}',
                skillName=names[index - 1], difficulty=None, explanation=options[0 if index == 5 else 1],
                knowledgeLevel='INTERMEDIATE', outcomeCode=None, mandatory=n == 4, skillVersion='0.12.1')))

    def group(index, mandatory=0):
        return dict(skillId=f'MS-DEMO-0{index}', knowledgeLevel='INTERMEDIATE', totalCount=3, requiredCorrectCount=2,
                    mandatoryCount=mandatory, mandatoryRequired=mandatory > 0, allWrongVeto=False)

    policies = [dict(purpose='SKILL_ASSESSMENT', ownerId=f'MS-DEMO-0{index}', levelId='INTERMEDIATE',
                     configuration=dict(timeLimitSeconds=300, retakeWaitSeconds=0, maxAttempts=3,
                                        groups=[group(index, 1)] + ([group(5)] if index == 2 else []))) for index in [1, 2, 5]]
    policies.append(dict(purpose='BASELINE', ownerId=ROLE, levelId=ROLE + '-M', configuration=dict(
        timeLimitSeconds=600, retakeWaitSeconds=0, maxAttempts=3,
        groups=[{k: v for k, v in group(i).items() if k != 'mandatoryCount'} for i in [1, 2, 3, 5]])))
    learners = [dict(id=uid(f'learner:{n}'), membershipId=uid(f'membership:{n}'), email=f'council-{n:02}@demo.invalid',
                     name=f'Council rehearsal {n:02}' if n <= 10 else 'Council presentation — clean account') for n in range(1, 12)]
    return dict(format=SOURCE, developmentOnly=True, organizationId=ORG, managerId=MANAGER, expertId=EXPERT,
                jobPositionId=JP, roleId=ROLE, nextRoleId=NEXT, departmentId=department,
                referenceId=uid('job-reference'), jobPositionReferenceId=uid('job-position-reference'),
                limitations='Synthetic standalone fixture. No learner responses, achievements, pathways, bypass decisions or approvals.',
                nodes=nodes, relationships=edges, modules=modules, items=items, learners=learners, policies=policies)


if __name__ == '__main__':
    payload = (json.dumps(build(), ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    (HERE / 'fixture.json').write_bytes(payload)
    (HERE / 'fixture.sha256').write_text(hashlib.sha256(payload).hexdigest() + '\n', encoding='ascii')
    print('Wrote standalone fixture.json; no database was contacted.')
