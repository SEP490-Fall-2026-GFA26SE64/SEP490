"""Select reproducible RQ3 pilot inputs from development profiles only."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

def build(source, output, seed):
    profiles = [json.loads(line) for line in source.read_text().splitlines() if line.strip()]
    selections = []
    for role, quotas in {'Junior': (12, 11, 11), 'Middle': (11, 11, 11), 'Senior': (11, 11, 11)}.items():
        for band, quota in zip(('LOW', 'MEDIUM', 'HIGH'), quotas):
            candidates = [p for p in profiles if p['roleLevel'] == role and p['gapBand'] == band]
            candidates.sort(key=lambda p: hashlib.sha256(f"{seed}:{p['profileId']}".encode()).digest())
            if len(candidates) < quota:
                raise ValueError(f'Insufficient profiles in {role}/{band}')
            selections.extend(candidates[:quota])
    excluded = set(json.loads(source.with_name('splits.json').read_text())['gold50'])
    ids = {p['profileId'] for p in selections}
    if len(ids) != 100 or ids & excluded:
        raise ValueError('Pilot requires 100 unique profiles outside Gold50')
    output.mkdir(parents=True, exist_ok=False)
    (output / 'profiles.jsonl').write_text(''.join(json.dumps(p, ensure_ascii=False, sort_keys=True) + '\n' for p in selections))
    manifest = {
        'status': 'DRAFT_PILOT_INPUTS', 'seed': seed, 'count': len(ids),
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'profiles_sha256': hashlib.sha256((output / 'profiles.jsonl').read_bytes()).hexdigest(),
        'role_counts': Counter(p['roleLevel'] for p in selections),
        'strata': Counter(f"{p['roleLevel']}/{p['gapBand']}" for p in selections),
        'budget': 40, 'learning_cost': 1, 'assessment_cost': 1,
        'checkpoints': [0, 10, 20, 30, 40],
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--seed', type=int, default=20261125)
    args = parser.parse_args()
    build(args.source, args.output, args.seed)
