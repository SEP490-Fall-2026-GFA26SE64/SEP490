"""Build the explicit development fixture; does not connect to or modify a database."""
import hashlib
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / 'documents/dataset/import/ontology_seed-skill-level.json'
PREFIX = 'development-knowledge-bank:v1:'


def identity(value):
    return str(uuid.UUID(bytes=hashlib.md5((PREFIX + value).encode()).digest(), version=3))


def build():
    original = BASE.read_bytes()
    if hashlib.sha256(original).hexdigest() != '1f6c15983de4486ecee6dd3c0d764b19ddceee12252ad54ad7d016e839cbdb1d':
        raise ValueError('Unexpected base catalog; preserve it and review the release input')
    catalog = json.loads(original)
    profiles = []
    for line in Path(__file__).with_name('profiles.tsv').read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        parts = line.split('|')
        if len(parts) != 6:
            raise ValueError('Each profile must explicitly define three knowledge tasks')
        profiles.append(dict(zip(['skillId', 'definition', 'applicationQuestion', 'applicationAnswer', 'evaluationQuestion', 'evaluationAnswer'], parts)))
    skills = {s['id']: s for s in catalog['MicroSkills']}
    if len(profiles) != 79 or {p['skillId'] for p in profiles} != set(skills):
        raise ValueError('Profiles must cover the exact current catalog skill identities')
    publisher = identity('publisher')
    level_names = [('FOUNDATION', 'definition'), ('INTERMEDIATE', 'applicationAnswer'), ('ADVANCED', 'evaluationAnswer')]
    items, bindings = [], []
    for profile in profiles:
        skill = skills[profile['skillId']]
        skill['version'] = '0.12.1'
        skill['reviewStatus'] = 'APPROVED'
        skill['reviewedBy'] = publisher
        skill['reviewedAt'] = None  # No human review event or timestamp is invented.
        skill['reviewSource'] = 'DEVELOPMENT_KNOWLEDGE_BANK_V1'
        scope = {'skillId': skill['id'], 'skillName': skill['name'], 'levels': []}
        peers = [p for p in profiles if p['skillId'] != skill['id'] and p['skillId'].split('-')[1].rstrip('0123456789') == skill['id'].split('-')[1].rstrip('0123456789')]
        if len(peers) < 3:
            peers += [p for p in profiles if p['skillId'] != skill['id'] and p not in peers]
        for level, answer_key in level_names:
            label = {'FOUNDATION': 'Explain the core concepts of ', 'INTERMEDIATE': 'Apply the defined procedure for ', 'ADVANCED': 'Evaluate constraints and tradeoffs for '}[level] + skill['name']
            scope['levels'].append({'knowledgeLevel': level, 'description': label})
            prop = level.lower()
            skill[prop + 'OutcomeLabels'] = [label]
            for variant, context in enumerate(['payroll', 'ordering', 'inventory'], 1):
                if level == 'FOUNDATION':
                    prompt = f"For a {context} project, which statement accurately describes the skill '{skill['name']}'?"
                else:
                    prompt = f"In a {context} project: " + profile['applicationQuestion' if level == 'INTERMEDIATE' else 'evaluationQuestion']
                correct = profile[answer_key]
                wrong = [peers[(variant - 1 + offset) % len(peers)][answer_key] for offset in range(3)]
                choices = [correct] + wrong
                if len(set(choices)) != 4:
                    raise ValueError('Question requires four distinct authored choices')
                rotation = (variant + list(skills).index(skill['id']) + len(level)) % 4
                choices = choices[rotation:] + choices[:rotation]
                key = f"{skill['id']}:{level}:{variant}"
                items.append({'id': identity(key), 'versionId': identity(key + ':version:1'),
                    'content': {'prompt': prompt, 'options': choices, 'correctAnswer': choices.index(correct),
                        'skillId': skill['id'], 'skillName': skill['name'], 'difficulty': None,
                        'explanation': correct + ' This directly answers the stated task; the other choices address different catalog capabilities.',
                        'knowledgeLevel': level, 'skillVersion': skill['version'], 'mandatory': False}})
        bindings.append(scope)
    manifest = {'format': 'DEVELOPMENT_KNOWLEDGE_BANK_V1', 'developmentOnly': True,
        'publicationSource': 'DEVELOPMENT_SEED', 'publisherId': publisher,
        'baseCatalogSha256': hashlib.sha256(original).hexdigest(),
        'limitations': 'Authored scenario variants for local development only; not an Expert-reviewed or calibrated production question bank.',
        'catalogBindings': bindings, 'profiles': profiles, 'items': items}
    outputs = [(ROOT / 'backend/src/main/resources/db/seed/knowledge-question-bank.json', manifest),
               (ROOT / 'documents/dataset/import/ontology_seed-skill-level.json', catalog)]
    for path, value in outputs:
        data = (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode('utf-8')
        path.write_bytes(data)
        print(path.relative_to(ROOT), hashlib.sha256(data).hexdigest())
    print(f'{len(skills)} skills, {len(bindings) * 3} knowledge groups, {len(items)} development questions')


if __name__ == '__main__':
    build()
