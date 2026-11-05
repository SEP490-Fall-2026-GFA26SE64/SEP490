#!/usr/bin/env python3
"""Build the forward 0.12 single-skill release from retained 0.11 content, never from focus labels.

No graph/database writes. Every choice has a content rationale in the generated audit.
The 45 broad lesson/lab units are narrowed to an existing task and its existing evidence;
other tasks stay in the retained historical source, not as extra assessed outcomes.
"""
import collections
import copy
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'ontology_seed-v011.json'
TARGET = ROOT / 'ontology_seed-v012.json'
VERSION = '0.12.0'
# Editorial choices by activity, shared across the existing J/M/S context editions.
# These are task/content selections, not the old PRIMARY tag or a difficulty heuristic.
ACTIVITIES = {
 'DE-MODEL-02': ('MS-DE13', 'The local warehouse query measurement/optimisation task and before/after reconciliation are the selected outcome.'),
 'DE-PIPE-01': ('MS-DE02', 'The runnable transformation application and input/output fixtures are the implementation outcome.'),
 'DE-PIPE-02': ('MS-DE11', 'Transformation-rule validation and expected outputs define the retained guided validation task.'),
 'DE-QUAL-01': ('MS-DE05', 'The quality checks and validation report are the unit outcome; metadata/monitoring remain context.'),
 'DE-QUAL-02': ('MS-DE15', 'The pipeline test cases and verification results are retained as the validation outcome.'),
 'FS-UI-01': ('MS-FS02', 'The accessible interface implementation and accessibility checks define the implementation task.'),
 'FS-UI-02': ('MS-FS11', 'Asynchronous request handling and response/error checks are the selected validation activity.'),
 'FS-SERVICE-02': ('MS-FS12', 'The input-validation task and invalid-input checks define this validation unit.'),
 'FS-QUALITY-01': ('MS-FS06', 'Reproducing and correcting the defect with verification is the retained debugging task.'),
 'FS-QUALITY-02': ('MS-FS16', 'The continuous-integration configuration and execution evidence are the selected outcome.'),
 'QA-DESIGN-01': ('MS-QA01', 'The test-plan task and plan artifact are the selected design outcome.'),
 'QA-DESIGN-02': ('MS-QA10', 'Boundary cases and their expected-result evidence are the selected validation technique.'),
 'QA-EXEC-01': ('MS-QA03', 'Executing the supplied tests and preserving observed results define this execution unit.'),
 'QA-EXEC-02': ('MS-QA14', 'The regression task and execution results are the selected validation activity.'),
 'QA-AUTO-02': ('MS-QA16', 'Investigation of flaky automated tests and reproducibility evidence define this validation unit.'),
}

def release():
    original = json.loads(SOURCE.read_text())
    data = copy.deepcopy(original)
    skills = {s['id']: s for s in data['MicroSkills']}
    mappings = collections.defaultdict(list)
    for edge in data['relationships']:
        if edge['type'] == 'TEACHES': mappings[edge['fromId']].append(edge)
    audit, selected = [], {}
    for module in data['LearningModules']:
        source = ROOT / module['contentUri']
        body = source.read_text()
        candidates = mappings[module['id']]
        explicit = re.findall(r'focuses on \*\*(.+?)\*\*', body)
        heading = body.splitlines()[0].removeprefix('# ').casefold()
        matches = [e for e in candidates if explicit and skills[e['toId']]['name'].casefold() == explicit[0].casefold()]
        reason = 'The explicit objective in the lesson body names exactly this Skill.'
        if len(matches) != 1:
            matches = [e for e in candidates if heading.startswith(skills[e['toId']]['name'].casefold())]
            reason = 'The content heading names this Skill and the unit contains its existing practice activity.'
        if len(matches) != 1:
            key = re.sub(r'-(J|M|S)-', '-', module['id'].removeprefix('MOD-'))
            skill, reason = ACTIVITIES[key]
            matches = [e for e in candidates if e['toId'] == skill]
            # Editorial choices must be supported by the original task and evidence, not just an edge.
            assert re.search(r'^- ' + re.escape(skill) + r':', body, re.M), module['id']
        assert len(matches) == 1, module['id']
        edge = matches[0]
        skill = edge['toId']
        selected[module['id']] = edge['id']
        # Remove classification rows and assignments for other skills from this new content edition.
        lines = []
        for line in body.splitlines():
            if line.startswith('| Skill |') or line.startswith('|---') or line.startswith('| MS-'): continue
            if line.startswith('- **MS-') and not line.startswith('- **' + skill + ':'): continue
            if re.match(r'^- MS-[A-Za-z0-9]+:', line) and not line.startswith('- ' + skill + ':'): continue
            line = line.replace('One primary objective', 'Learning objective').replace('Primary task', 'Practice task')
            line = line.replace('Supporting practice', 'Context and practice').replace('co-primary outcomes', 'additional learning outcomes')
            line = line.replace('primary artifact', 'learning artifact').replace('primary decisions', 'learning decisions')
            lines.append(line)
        suffix = 'Guided validation' if 'validation' in module['title'].casefold() else 'Guided practice'
        title = skills[skill]['name'] + ' — ' + suffix
        lines[0] = '# ' + title
        text = '\n'.join(lines).strip() + '\n'
        text = re.sub(r'Content version: [^.]+(?:\.[^. ]+)*\.', 'Content version: 2.0.', text, count=1)
        text += '\n## Skill and completion contract\n\n'
        text += f'This edition teaches only **{skill} — {skills[skill]["name"]}**. Complete all lessons to meet the learning prerequisite for this Skill assessment. Other approved Modules for the same Skill remain optional. Completion is not an assessment result or mastery decision.\n'
        uri = 'content/modules/' + module['id'] + '-single-skill-v012.md'
        (ROOT / uri).write_text(text)
        audit.append({'moduleId': module['id'], 'skillId': skill, 'sourceContentUri': module['contentUri'],
                      'sourceContentSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                      'contentUri': uri, 'reason': reason,
                      'retiredSkillMappings': [e['toId'] for e in candidates if e['id'] != edge['id']]})
        module.update(title=title, contentUri=uri, contentVersion='2.0')
    data['relationships'] = [e for e in data['relationships'] if e['type'] != 'TEACHES' or selected[e['fromId']] == e['id']]
    for rows in data.values():
        if isinstance(rows, list):
            for row in rows:
                if 'version' in row: row['version'] = VERSION
                row.pop('teachingFocus', None); row.pop('difficultyLevel', None)
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    counts = collections.Counter(e['toId'] for e in data['relationships'] if e['type'] == 'TEACHES')
    report = {'catalogVersion': VERSION, 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'releaseSha256': hashlib.sha256(TARGET.read_bytes()).hexdigest(), 'modules': audit,
              'uncoveredSkills': [s for s in skills if not counts[s]], 'providerCounts': dict(sorted(counts.items()))}
    (ROOT / 'single-skill-v012-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    assert len(audit) == 246 and len(selected) == 246
    print(f'0.12: {len(audit)} Modules, {len(counts)} covered Skills, {len(report["uncoveredSkills"])} uncovered Skills; historical release unchanged')

if __name__ == '__main__': release()
