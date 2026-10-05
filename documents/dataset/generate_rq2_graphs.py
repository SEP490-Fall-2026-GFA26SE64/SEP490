"""Scale the supplied ontology into nested, isolated RQ2 benchmark graphs."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import random
import uuid
import import_neo4j_dataset as catalog_reader

BASE = Path(__file__).resolve().parent
COUNTS = {
    1000: {'JobDomain': 3, 'TargetRole': 100, 'MacroCompetency': 30, 'MicroSkill': 600, 'LearningModule': 267},
    5000: {'JobDomain': 3, 'TargetRole': 500, 'MacroCompetency': 150, 'MicroSkill': 3000, 'LearningModule': 1347},
    10000: {'JobDomain': 3, 'TargetRole': 1000, 'MacroCompetency': 300, 'MicroSkill': 6000, 'LearningModule': 2697},
}
ENDPOINTS = {
    'HAS_ROLE': ('JobDomain', 'TargetRole'),
    'REQUIRES_MACRO': ('TargetRole', 'MacroCompetency'),
    'HAS_SKILL': ('MacroCompetency', 'MicroSkill'),
    'REQUIRES_SKILL': ('TargetRole', 'MicroSkill'),
    'PREREQUISITE_OF': ('MicroSkill', 'MicroSkill'),
    'TEACHES': ('LearningModule', 'MicroSkill'),
    'HAS_ENTRY_REQUIREMENT': ('LearningModule', 'MicroSkill'),
}
STAMP = '2026-10-03T00:00:00Z'
ORG = '00000000-0000-0000-0000-000000000101'
QUERY = """MATCH (s:MicroSkill {code: $skillCode})
MATCH (p:MicroSkill)-[:PREREQUISITE_OF*1..DEPTH]->(s)
RETURN count(DISTINCT p) AS prerequisiteCount"""


def require(condition, message):
    if not condition:
        raise ValueError(message)


def reachable(start, reverse, depth):
    visited = set()
    frontier = {start}
    for _ in range(depth):
        frontier = {p for s in frontier for p in reverse[s]} - visited
        visited.update(frontier)
    return visited


def generate(size, seed):
    counts = COUNTS[size]
    rng = random.Random(seed)
    nodes, edges = [], []
    pools = defaultdict(list)
    domains, layers = {}, {}
    source = catalog_reader.prepare(catalog_reader.read_xlsx(catalog_reader.DEFAULT_FILE))
    label_for_sheet = {sheet: spec[0] for sheet, spec in catalog_reader.NODES.items()}
    role_domain = {e['targetCode']: e['sourceCode'] for e in source['HAS_ROLE'] if e['status'] == 'ACTIVE'}
    required_domains = defaultdict(Counter)
    for e in source['REQUIRES_SKILL']:
        if e['status'] == 'ACTIVE' and e['sourceCode'] in role_domain:
            required_domains[e['targetCode']][role_domain[e['sourceCode']]] += 1
    skill_domain = {s: (required_domains[s].most_common(1)[0][0] if required_domains[s] else 'SE')
                    for s in {e['targetCode'] for e in source['HAS_SKILL']}}
    macro_domain = {}
    for e in source['HAS_SKILL']:
        macro_domain.setdefault(e['sourceCode'], Counter())[skill_domain[e['targetCode']]] += 1
    macro_domain = {m: d.most_common(1)[0][0] for m, d in macro_domain.items()}
    module_domain = {}
    for module in source['Learning Modules']:
        taught = [skill_domain.get(e['targetCode'], 'SE') for e in source['TEACHES'] if e['sourceCode'] == module['code']]
        module_domain[module['code']] = Counter(taught).most_common(1)[0][0] if taught else 'SE'
    for sheet, records in source.items():
        if sheet in label_for_sheet:
            label = label_for_sheet[sheet]
            for row in records:
                code = row['code']
                nodes.append({'label': label, 'properties': {k: v for k, v in row.items() if not k.startswith('_')}})
                pools[label].append(code)
                domain = (code if label == 'JobDomain' else role_domain[code] if label == 'TargetRole'
                          else macro_domain.get(code, 'SE') if label == 'MacroCompetency'
                          else skill_domain.get(code, 'SE') if label == 'MicroSkill'
                          else module_domain[code])
                domains[code] = domain
        elif sheet in catalog_reader.RELS:
            for row in records:
                props = {k: v for k, v in row.items() if k not in ('sourceCode', 'targetCode', 'relationshipType') and not k.startswith('_')}
                edges.append({'type': sheet, 'sourceCode': row['sourceCode'], 'targetCode': row['targetCode'], 'properties': props})
    core_node_codes = set(domains)
    def node(label, index, domain):
        code = f'RQ2_{label.upper()}_{index:05d}'
        props = {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, f'rq2-v2/{seed}/{code}')),
                 'code': code, 'status': 'ACTIVE', 'createdAt': STAMP, 'updatedAt': STAMP}
        props['title' if label == 'LearningModule' else 'name'] = f'Synthetic {label} {index}'
        props['description'] = 'Synthetic RQ2 performance fixture; not a curated competency.'
        if label == 'TargetRole':
            props.update(familyCode=f'RQ2_{domain}_FAMILY', track='PROFESSIONAL',
                         seniority=f'P{index % 5 + 1}', organizationId=ORG)
        if label == 'LearningModule':
            props.pop('description')
            props.update(provider='Synthetic RQ2', platform='Benchmark fixture',
                         sourceUrl=f'https://example.com/rq2/{code}', durationHours=round(rng.uniform(1, 20), 2))
        nodes.append({'label': label, 'properties': props})
        pools[label].append(code)
        domains[code] = domain
        return code
    def edge(kind, a, b, **props):
        edges.append({'type': kind, 'sourceCode': a, 'targetCode': b,
                      'properties': {'status': 'ACTIVE', 'createdAt': STAMP, 'updatedAt': STAMP, **props}})
    for label, count in counts.items():
        existing = len(pools[label])
        for index in range(count - existing):
            domain = ('SE', 'DATA', 'AI')[index % 3]
            code = node(label, index, domain)
            if label == 'MicroSkill':
                # Use only macros present at 1k so existing assignments remain nested.
                domain_macros = [m for m in pools['MacroCompetency'] if domains[m] == domain and
                                 (not m.startswith('RQ2_') or int(m.rsplit('_', 1)[1]) < 27)]
                edge('HAS_SKILL', domain_macros[index % len(domain_macros)], code)
                layers[code] = 8 + (index // 3) % 8
    domain_nodes = {domains[s]: s for s in pools['JobDomain']}
    smallest_graph_macro_count = COUNTS[1000]['MacroCompetency'] - len(source['Macro Competencies'])
    stable_macros_by_domain = {d: [m for m in ms if not m.startswith('RQ2_') or
                                   int(m.rsplit('_', 1)[1]) < smallest_graph_macro_count]
                              for d in domain_nodes for ms in [[m for m in pools['MacroCompetency'] if domains[m] == d]]}
    skill_macro = {e['targetCode']: e['sourceCode'] for e in edges if e['type'] == 'HAS_SKILL'}
    core_skills = [s for s in pools['MicroSkill'] if s not in layers]
    core_out, indegree = defaultdict(set), dict.fromkeys(core_skills, 0)
    for e in edges:
        a, b = e['sourceCode'], e['targetCode']
        if e['type'] == 'PREREQUISITE_OF' and a in indegree and b in indegree and b not in core_out[a]:
            core_out[a].add(b)
            indegree[b] += 1
    queue = [s for s, degree in indegree.items() if degree == 0]
    for s in queue: layers[s] = 0
    while queue:
        a = queue.pop()
        for b in sorted(core_out[a]):
            layers[b] = max(layers.get(b, 0), layers[a] + 1)
            indegree[b] -= 1
            if indegree[b] == 0: queue.append(b)
    require(len(layers) >= len(core_skills), 'Source prerequisite graph is cyclic')
    skills_by_domain = {d: [s for s in pools['MicroSkill'] if domains[s] == d] for d in domain_nodes}
    smallest_graph_skill_count = COUNTS[1000]['MicroSkill'] - len(source['MicroSkills'])
    stable_skills_by_domain = {d: [s for s in ss if not s.startswith('RQ2_') or
                                  int(s.rsplit('_', 1)[1]) < smallest_graph_skill_count]
                              for d, ss in skills_by_domain.items()}
    synthetic_roles = [r for r in pools['TargetRole'] if r.startswith('RQ2_')]
    for role in synthetic_roles:
        edge('HAS_ROLE', domain_nodes[domains[role]], role)
        role_rng = random.Random(f'{seed}/{role}/requirements')
        required = role_rng.sample(stable_skills_by_domain[domains[role]], role_rng.randint(15, 25))
        for s in required:
            edge('REQUIRES_SKILL', role, s, targetMastery=round(role_rng.uniform(.4, .9), 2))
        for macro in sorted({skill_macro[s] for s in required}):
            edge('REQUIRES_MACRO', role, macro)
    for module in [m for m in pools['LearningModule'] if m.startswith('RQ2_')]:
        module_rng = random.Random(f'{seed}/{module}/outcomes')
        pool = stable_skills_by_domain[domains[module]]
        for s in module_rng.sample(pool, module_rng.randint(3, 6)):
            edge('TEACHES', module, s, outcomeMastery=round(module_rng.uniform(.4, .9), 2), coverage='CORE')
        for s in module_rng.sample(pool, module_rng.randint(0, 2)):
            edge('HAS_ENTRY_REQUIREMENT', module, s, minMastery=round(module_rng.uniform(.3, .7), 2))
    # A backbone across adjacent tiers makes real 3/4/5-hop paths available.
    # Extra edges connect the same domain and later tiers; no disconnected
    # copies of a small ontology are used.
    pairs, outdegree = set(), Counter()
    for e in edges:
        if e['type'] == 'PREREQUISITE_OF':
            pairs.add((e['sourceCode'], e['targetCode']))
            outdegree[e['sourceCode']] += 1
    eligible = [s for s in pools['MicroSkill'] if s.startswith('RQ2_') and layers[s] < 15]
    baseline_codes = {s for ss in stable_skills_by_domain.values() for s in ss}
    forward = {s: sorted(b for b in baseline_codes if domains[b] == domains[s] and layers[b] > layers[s])
               for s in eligible}
    # Each baseline synthetic skill receives a backbone edge to the next tier;
    # later appended skills get the same deterministic opportunity to connect.
    for a in eligible:
        candidates = forward[a]
        if candidates:
            target = candidates[0]
            pairs.add((a, target))
            outdegree[a] += 1
    target_edges = 2 * counts['MicroSkill'] - sum(1 for e in edges if e['type'] == 'PREREQUISITE_OF')
    existing_pairs = {(e['sourceCode'], e['targetCode']) for e in edges if e['type'] == 'PREREQUISITE_OF'}
    attempts = 0
    while len(pairs) - len(existing_pairs) < target_edges:
        attempts += 1
        require(attempts < target_edges * 100, 'Unable to meet prerequisite edge quota')
        a = eligible[(attempts - 1) % len(eligible)]
        if outdegree[a] >= 4 or not forward[a]:
            continue
        candidates = [b for b in forward[a] if (a, b) not in pairs]
        if not candidates:
            continue
        pair_rng = random.Random(f'{seed}/{a}/extra/{outdegree[a]}')
        b = candidates[pair_rng.randrange(len(candidates))]
        pairs.add((a, b))
        outdegree[a] += 1
    for a, b in sorted(pairs - existing_pairs):
        pair_rng = random.Random(f'{seed}/{a}/{b}/prerequisite')
        edge('PREREQUISITE_OF', a, b, minMastery=round(pair_rng.uniform(.4, .7), 2))
    graph = {'datasetVersion': 'RQ2_GRAPH_V2', 'purpose': 'SYNTHETIC_LATENCY_BENCHMARK_ONLY',
             'seed': seed, 'size': size, 'nodes': nodes, 'relationships': edges,
             'sourceWorkbook': catalog_reader.DEFAULT_FILE.name,
             'sourceSha256': hashlib.sha256(catalog_reader.DEFAULT_FILE.read_bytes()).hexdigest(),
             'generationMeta': {'skillLayers': layers, 'domainByCode': domains,
                 'coreNodeCodes': sorted(core_node_codes)}}
    graph['validation'] = validate(graph)
    return graph


def validate(graph):
    nodes, edges = graph['nodes'], graph['relationships']
    lookup = {n['properties']['code']: n for n in nodes}
    require(len(lookup) == len(nodes) == graph['size'], 'Wrong node count or duplicate codes')
    require(len({n['properties']['id'] for n in nodes}) == len(nodes), 'Duplicate node IDs')
    require(dict(Counter(n['label'] for n in nodes)) == COUNTS[graph['size']], 'Wrong label counts')
    pairs = set()
    mappings, reqs, teaches = Counter(), Counter(), Counter()
    role_macros, required_macros = defaultdict(set), defaultdict(set)
    macro_for = {e['targetCode']: e['sourceCode'] for e in edges if e['type'] == 'HAS_SKILL'}
    reverse, degree = defaultdict(set), Counter()
    layers = graph['generationMeta']['skillLayers']
    longest = {s: 0 for s in layers}
    for e in edges:
        kind, a, b = e['type'], e['sourceCode'], e['targetCode']
        key = (kind, a, b)
        require(key not in pairs, 'Duplicate edge')
        pairs.add(key)
        require(a in lookup and b in lookup, 'Missing endpoint')
        require((lookup[a]['label'], lookup[b]['label']) == ENDPOINTS[kind], 'Wrong endpoint labels')
        require(e['properties']['status'] == 'ACTIVE', 'Invalid lifecycle status')
        for field in ('targetMastery', 'minMastery', 'outcomeMastery'):
            if field in e['properties']:
                require(0 <= e['properties'][field] <= 1, 'Mastery out of bounds')
        if kind in ('HAS_ROLE', 'HAS_SKILL'):
            mappings[b] += 1
        if kind == 'REQUIRES_SKILL':
            reqs[a] += 1
            required_macros[a].add(macro_for[b])
        if kind == 'REQUIRES_MACRO':
            role_macros[a].add(b)
        if kind == 'TEACHES':
            teaches[a] += 1
        if kind == 'PREREQUISITE_OF':
            require(a != b and layers[a] < layers[b], 'Self-loop or invalid DAG ordering')
            reverse[b].add(a)
            degree[a] += 1
    for n in nodes:
        label, code = n['label'], n['properties']['code']
        core = not code.startswith('RQ2_')
        if label in ('TargetRole', 'MicroSkill') and not core:
            require(mappings[code] == 1, 'Expected one domain/macro mapping')
        if label == 'TargetRole' and not core:
            require(15 <= reqs[code] <= 25, 'Wrong role requirement degree')
            require(role_macros[code] == required_macros[code], 'Role macro mismatch')
        if label == 'LearningModule' and not core:
            require(3 <= teaches[code] <= 6, 'Wrong module outcome degree')
    for s in sorted(layers, key=lambda s: (layers[s], s)):
        longest[s] = max((longest[p] + 1 for p in reverse[s]), default=0)
    require(max(longest.values()) >= 5, 'Graph lacks five-hop prerequisite paths')
    require(max(degree.values()) <= 4, 'Prerequisite degree exceeds four')
    require(sum(degree.values()) == 2 * len(layers), 'Wrong prerequisite edge quota')
    return {'passed': True, 'nodeCount': len(nodes), 'edgeCount': len(edges),
            'nodeCounts': dict(Counter(n['label'] for n in nodes)),
            'edgeCounts': dict(Counter(e['type'] for e in edges)),
            'prerequisiteMeanOutDegree': sum(degree.values()) / len(layers),
            'prerequisiteMaxOutDegree': max(degree.values()),
            'prerequisiteLongestPathHops': max(longest.values()),
            'cycleCheck': 'PASS: all prerequisite edges strictly increase layer',
            'skillsWithAtLeastFiveHopPath': sum(v >= 5 for v in longest.values())}


def workload_strata(graph, seed):
    reverse = defaultdict(set)
    for e in graph['relationships']:
        if e['type'] == 'PREREQUISITE_OF':
            reverse[e['targetCode']].add(e['sourceCode'])
    core = set(graph['generationMeta']['coreNodeCodes'])
    baseline_count = COUNTS[1000]['MicroSkill'] - 66
    skills = sorted(s for s in graph['generationMeta']['skillLayers']
                    if s in core or (s.startswith('RQ2_') and int(s.rsplit('_', 1)[1]) < baseline_count))
    strata_by_skill = {}
    for depth in (3, 4, 5):
        rng = random.Random(seed + depth)
        ranked = [(s, len(reachable(s, reverse, depth))) for s in skills]
        rng.shuffle(ranked)
        ranked.sort(key=lambda x: x[1])
        buckets = [ranked[len(ranked) * i // 3:len(ranked) * (i + 1) // 3] for i in range(3)]
        for name, bucket in zip(('LOW', 'MEDIUM', 'HIGH'), buckets):
            for skill, _ in bucket:
                strata_by_skill[(depth, skill)] = name
    return strata_by_skill


def workloads(graph, seed, reference_strata):
    reverse = defaultdict(set)
    for e in graph['relationships']:
        if e['type'] == 'PREREQUISITE_OF':
            reverse[e['targetCode']].add(e['sourceCode'])
    core = set(graph['generationMeta']['coreNodeCodes'])
    baseline_count = COUNTS[1000]['MicroSkill'] - 66
    skills = sorted(s for s in graph['generationMeta']['skillLayers']
                    if s in core or (s.startswith('RQ2_') and int(s.rsplit('_', 1)[1]) < baseline_count))
    result = []
    per_depth = {3: 334, 4: 333, 5: 333}
    warm_per_depth = {3: 34, 4: 33, 5: 33}
    for depth in (3, 4, 5):
        rng = random.Random(seed + depth)
        reachable_by_skill = {s: len(reachable(s, reverse, depth)) for s in skills}
        buckets = [[(s, reachable_by_skill[s]) for s in skills if reference_strata[(depth, s)] == name]
                   for name in ('LOW', 'MEDIUM', 'HIGH')]
        for bucket in buckets:
            bucket.sort()
        measured, warmup = [], []
        strata_quota = (per_depth[depth] // 3 + (1 if i < per_depth[depth] % 3 else 0) for i in range(3))
        warm_quota = (warm_per_depth[depth] // 3 + (1 if i < warm_per_depth[depth] % 3 else 0) for i in range(3))
        for name, bucket, quota, warm_count in zip(('LOW', 'MEDIUM', 'HIGH'), buckets, strata_quota, warm_quota):
            for dest, count in ((measured, quota), (warmup, warm_count)):
                for _ in range(count):
                    s, expected = rng.choice(bucket)
                    dest.append({'skillCode': s, 'rankStratum': name, 'expectedPrerequisiteCount': expected})
        rng.shuffle(measured)
        rng.shuffle(warmup)
        result.append({'maxHops': depth, 'cypher': QUERY.replace('DEPTH', str(depth)),
            'strata': {name: {'skillCount': len(bucket), 'reachableCountRange': [bucket[0][1], bucket[-1][1]]}
                       for name, bucket in zip(('LOW', 'MEDIUM', 'HIGH'), buckets)},
            'warmup': warmup, 'measurements': measured})
    return {'datasetVersion': graph['datasetVersion'], 'size': graph['size'], 'seed': seed,
            'semantics': 'Unique prerequisite nodes reachable by incoming paths of 1..maxHops; start node excluded',
            'sampling': 'Start-code samples are identical across nested graph sizes; LOW/MEDIUM/HIGH ranks are frozen from 1k graph per depth; sampling with replacement; zero-result starts retained',
            'workloads': result,
            'totalMeasuredExecutions': sum(len(w['measurements']) for w in result),
            'totalWarmupExecutions': sum(len(w['warmup']) for w in result)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sizes', nargs='+', type=int, choices=sorted(COUNTS), default=sorted(COUNTS))
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output-dir', type=Path, default=BASE / 'outputs/rq2_v2')
    args = parser.parse_args()
    graphs = [generate(size, args.seed) for size in args.sizes]
    reference = next((g for g in graphs if g['size'] == 1000), None)
    if reference is None:
        reference = generate(1000, args.seed)
    reference_strata = workload_strata(reference, args.seed + 1000)
    for graph in graphs:
        size = graph['size']
        workload = workloads(graph, args.seed + 1000, reference_strata)
        folder = args.output_dir / str(size)
        folder.mkdir(parents=True, exist_ok=True)
        hashes = {}
        for name, payload in [('graph.json', graph), ('workloads.json', workload)]:
            raw = (json.dumps(payload, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
            (folder / name).write_bytes(raw)
            hashes[name] = hashlib.sha256(raw).hexdigest()
        manifest = {'datasetVersion': graph['datasetVersion'], 'seed': args.seed,
                    'validation': graph['validation'], 'filesSha256': hashes,
                    'measurementExecutionsPerGraph': workload['totalMeasuredExecutions'],
                    'measurementExecutionsByDepth': {str(w['maxHops']): len(w['measurements']) for w in workload['workloads']},
                    'warmupExecutionsPerGraph': workload['totalWarmupExecutions'],
                    'rules': {'skillLayers': 8, 'prerequisiteMeanOutDegree': 2, 'prerequisiteMaxOutDegree': 4,
                        'requiredSkillsPerRole': [15, 25], 'taughtSkillsPerModule': [3, 6],
                        'entrySkillsPerModule': [0, 2], 'density': 'one fixed degree configuration across sizes'}}
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'size': size, **graph['validation']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
