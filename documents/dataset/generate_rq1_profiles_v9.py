"""Standalone RQ1 generator: Python standard library and the XLSX catalog only.

Frozen synthetic scenarios and a reproducible 50-profile expert sample.

Prerequisite consistency is a simulation assumption: an observed advanced skill
>= .75 requires observed prerequisites to meet the catalog minMastery. Unknown
prerequisites remain unknown, and are reported separately.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import random

from collections import defaultdict, deque
from datetime import datetime
import posixpath
import re
from typing import Any, Dict, List, Tuple
from urllib import parse
import uuid
import xml.etree.ElementTree as ET
import zipfile


BASE = Path(__file__).resolve().parent
DEFAULT_FILE = BASE / "neo4j_dataset_schema_diagram_aligned.xlsx"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
COMMON = ["status", "createdAt", "updatedAt"]
NODES = {
    "Job Domains": ("JobDomain", ["id", "code", "name", "description"] + COMMON),
    "Target Roles": ("TargetRole", ["id", "code", "name", "familyCode", "track", "description"] + COMMON + ["organizationId", "seniority"]),
    "Macro Competencies": ("MacroCompetency", ["id", "code", "name", "description"] + COMMON),
    "MicroSkills": ("MicroSkill", ["id", "code", "name", "description"] + COMMON),
    "Learning Modules": ("LearningModule", ["id", "code", "title", "provider", "platform", "sourceUrl", "durationHours", "priceAmount", "currency"] + COMMON),
}
RELS = {
    "HAS_ROLE": ("Job Domains", "Target Roles", []),
    "REQUIRES_MACRO": ("Target Roles", "Macro Competencies", []),
    "HAS_SKILL": ("Macro Competencies", "MicroSkills", []),
    "REQUIRES_SKILL": ("Target Roles", "MicroSkills", ["targetMastery"]),
    "PREREQUISITE_OF": ("MicroSkills", "MicroSkills", ["minMastery"]),
    "TEACHES": ("Learning Modules", "MicroSkills", ["outcomeMastery", "coverage"]),
    "HAS_ENTRY_REQUIREMENT": ("Learning Modules", "MicroSkills", ["minMastery"]),
}
STATUS = {"DRAFT", "ACTIVE", "RETIRED"}
COVERAGE = {"INTRODUCTION_OR_REVIEW", "SUPPORTING", "CORE", "ADVANCED"}


class ValidationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def valid_uuid(value):
    try:
        return isinstance(value, str) and str(uuid.UUID(value)) == value.lower()
    except (ValueError, TypeError, AttributeError):
        return False


def column_index(ref):
    letters = re.match(r"[A-Z]+", ref).group()
    index = 0
    for letter in letters:
        index = index * 26 + ord(letter) - 64
    return index - 1


def read_xlsx(path):
    """Read literal cells; reject formulas in import tables instead of trusting caches."""
    result = {}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(si.itertext()) for si in root.findall("s:si", NS)]
        links = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in links}
        root = ET.fromstring(archive.read("xl/workbook.xml"))
        for sheet in root.findall("s:sheets/s:sheet", NS):
            name = sheet.attrib["name"]
            if name not in NODES and name not in RELS:
                continue
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = targets[rid]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            xml = ET.fromstring(archive.read(member))
            rows = {}
            for row in xml.findall("s:sheetData/s:row", NS):
                number = int(row.attrib["r"])
                values = {}
                for cell in row.findall("s:c", NS):
                    ref = cell.attrib["r"]
                    require(number < 4 or cell.find("s:f", NS) is None,
                            f"{name}!{ref}: formulas are not supported in import tables")
                    kind = cell.attrib.get("t")
                    value = cell.findtext("s:v", default=None, namespaces=NS)
                    if kind == "inlineStr":
                        value = "".join(cell.find("s:is", NS).itertext())
                    elif kind == "s":
                        value = shared[int(value)]
                    elif kind == "b":
                        value = value == "1"
                    elif kind == "e":
                        raise ValidationError(f"{name}!{ref}: Excel error {value}")
                    elif value is not None and kind not in ("str", "d"):
                        value = float(value)
                    if value is not None and value != "":
                        values[column_index(ref)] = value
                rows[number] = values
            header_cells = rows.get(4, {})
            require(bool(header_cells), f"{name}: header must be on row 4")
            width = max(header_cells) + 1
            headers = [header_cells.get(i) for i in range(width)]
            require(all(text(x) for x in headers) and len(set(headers)) == width,
                    f"{name}: blank or duplicate headers")
            records = []
            for number, values in sorted(rows.items()):
                if number <= 4 or not values:
                    continue
                require(max(values) < width, f"{name} row {number}: data beyond table headers")
                record = {headers[i]: values.get(i) for i in range(width)}
                if name in RELS:
                    require(headers[0].startswith("sourceCode (") and headers[2].startswith("targetCode ("),
                            f"{name}: expected sourceCode/targetCode endpoint headers")
                    record["sourceCode"] = record.pop(headers[0])
                    record["targetCode"] = record.pop(headers[2])
                record["_row"] = number
                records.append(record)
            if name in NODES:
                expected = set(NODES[name][1])
                optional = {"responsibilities"} if name == "Target Roles" else set()
                actual = set(headers)
            else:
                expected = {"sourceCode", "targetCode", "relationshipType", *COMMON, *RELS[name][2]}
                optional = set()
                actual = {"sourceCode", "targetCode", *headers[1:2], *headers[3:]}
            require(expected <= actual and actual <= expected | optional,
                    f"{name}: missing columns {sorted(expected - actual)}; unexpected {sorted(actual - expected - optional)}")
            result[name] = records
    require(set(result) == set(NODES) | set(RELS), "Workbook must contain all five node and seven relationship sheets")
    return result


def prepare(data, organization_id=None):
    if organization_id:
        require(valid_uuid(organization_id), "--organization-id must be a canonical UUID")
        organization_id = str(uuid.UUID(organization_id))
    for row in data["Target Roles"]:
        current = row.get("organizationId")
        if current is None:
            row["organizationId"] = organization_id
        elif organization_id:
            require(current == organization_id, f"Target Roles row {row['_row']}: organization override conflicts with workbook")
        if "responsibilities" in row:
            if row["responsibilities"] is None:
                row.pop("responsibilities")
            elif isinstance(row["responsibilities"], str):
                try:
                    row["responsibilities"] = json.loads(row["responsibilities"])
                except json.JSONDecodeError as exc:
                    raise ValidationError("responsibilities must be a JSON string array") from exc
    validate_graph(data)
    return data


def validate_graph(data):
    indexes = {}
    for sheet, rows in data.items():
        codes = set()
        ids = set()
        pairs = set()
        for row in rows:
            where = f"{sheet} row {row.get('_row', '?')}"
            require(row.get("status") in STATUS, f"{where}: invalid status")
            times = []
            for field in ("createdAt", "updatedAt"):
                try:
                    dt = datetime.fromisoformat(row[field].replace("Z", "+00:00"))
                    require(dt.tzinfo is not None, f"{where}: {field} requires timezone")
                    times.append(dt)
                except (KeyError, ValueError, TypeError, AttributeError) as exc:
                    raise ValidationError(f"{where}: invalid ISO-8601 {field}") from exc
            require(times[1] >= times[0], f"{where}: updatedAt precedes createdAt")
            if sheet in NODES:
                for field in ["id", "code", "title" if sheet == "Learning Modules" else "name"]:
                    require(text(row.get(field)), f"{where}: {field} is required")
                require(row["code"] == row["code"].strip() and row["id"] == row["id"].strip(),
                        f"{where}: id/code must not have surrounding spaces")
                require(row["code"] not in codes and row["id"] not in ids, f"{where}: duplicate id/code")
                codes.add(row["code"])
                ids.add(row["id"])
            else:
                require(row.get("relationshipType") == sheet, f"{where}: wrong relationshipType")
                pair = (row.get("sourceCode"), row.get("targetCode"))
                require(all(text(x) for x in pair), f"{where}: missing relationship endpoint")
                require(pair not in pairs, f"{where}: duplicate edge {pair}")
                pairs.add(pair)
            for field in ("targetMastery", "minMastery", "outcomeMastery"):
                if field in row:
                    value = row[field]
                    require(type(value) in (float, int) and math.isfinite(value) and 0 <= value <= 1,
                            f"{where}: {field} must be a number in [0,1]")
                    row[field] = float(value)
            if sheet == "TEACHES":
                require(row.get("coverage") in COVERAGE, f"{where}: invalid coverage")
            if sheet == "Target Roles":
                require(valid_uuid(row.get("organizationId")),
                        f"{where}: organizationId is missing/invalid; fill the workbook or pass --organization-id")
                require(text(row.get("familyCode")), f"{where}: missing familyCode")
                grades = {"PROFESSIONAL": {f"P{i}" for i in range(1, 6)}, "MANAGEMENT": {"M3", "M4"}}
                require(row.get("seniority") in grades.get(row.get("track"), set()), f"{where}: seniority does not match track")
                if "responsibilities" in row:
                    require(isinstance(row["responsibilities"], list) and all(text(x) for x in row["responsibilities"]),
                            f"{where}: responsibilities must be a nonempty-text string array")
            if sheet == "Learning Modules":
                for field in ("provider", "platform", "sourceUrl"):
                    require(text(row.get(field)), f"{where}: missing {field}")
                url = parse.urlsplit(row["sourceUrl"])
                require(url.scheme in {"http", "https"} and bool(url.hostname) and not any(c.isspace() for c in row["sourceUrl"]),
                        f"{where}: invalid HTTP(S) sourceUrl")
                for field in ("durationHours", "priceAmount"):
                    value = row.get(field)
                    if value is not None:
                        require(type(value) in (int, float) and math.isfinite(value) and
                                (value > 0 if field == "durationHours" else value >= 0), f"{where}: invalid {field}")
                if row.get("priceAmount") is not None:
                    require(text(row.get("currency")), f"{where}: currency is required when price is present")
        if sheet in NODES:
            indexes[sheet] = {r["code"]: r for r in rows}
    for kind, (source, target, _) in RELS.items():
        for row in data[kind]:
            require(row["sourceCode"] in indexes[source] and row["targetCode"] in indexes[target],
                    f"{kind} row {row.get('_row', '?')}: missing endpoint")
    for kind, nodes, endpoint in [("HAS_ROLE", "Target Roles", "targetCode"), ("HAS_SKILL", "MicroSkills", "targetCode")]:
        counts = Counter(r[endpoint] for r in data[kind] if r["status"] == "ACTIVE")
        for row in data[nodes]:
            require(counts[row["code"]] == 1, f"{nodes} {row['code']}: expected exactly one active {kind}")
    for nodes, kind in [("Target Roles", "REQUIRES_SKILL"), ("Learning Modules", "TEACHES")]:
        target_sheet = RELS[kind][1]
        sources = {r["sourceCode"] for r in data[kind] if r["status"] == "ACTIVE" and indexes[target_sheet][r["targetCode"]]["status"] == "ACTIVE"}
        for row in data[nodes]:
            require(row["status"] != "ACTIVE" or row["code"] in sources, f"{nodes} {row['code']}: no active {kind} to an active skill")
    graph = defaultdict(set)
    indegree = {code: 0 for code in indexes["MicroSkills"]}
    for row in data["PREREQUISITE_OF"]:
        a, b = row["sourceCode"], row["targetCode"]
        require(a != b, f"PREREQUISITE_OF: self-loop {a}")
        graph[a].add(b)
    for neighbors in graph.values():
        for code in neighbors:
            indegree[code] += 1
    ready = deque(k for k, count in indegree.items() if count == 0)
    visited = 0
    while ready:
        current = ready.popleft()
        visited += 1
        for child in graph[current]:
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
    require(visited == len(indegree), "PREREQUISITE_OF: cycle detected (including non-ACTIVE edges)")


def load_catalog(xlsx_path: str) -> Dict[str, Any]:
    """Load current schema by named columns; validate before generating profiles."""
    data = prepare(read_xlsx(xlsx_path))
    roles = {r['code']: r for r in data['Target Roles'] if r['status'] == 'ACTIVE'}
    skills = {r['code']: r for r in data['MicroSkills'] if r['status'] == 'ACTIVE'}
    domains = {r['code'] for r in data['Job Domains'] if r['status'] == 'ACTIVE'}
    role_domain = {r['targetCode']: r['sourceCode'] for r in data['HAS_ROLE']
                   if r['status'] == 'ACTIVE' and r['targetCode'] in roles and r['sourceCode'] in domains}
    require(set(role_domain) == set(roles), 'Each generated role needs an active domain')
    require(set(role_domain.values()) == {'SE', 'DATA', 'AI'},
                  'This generator uses the proposed SE/DATA/AI 40/30/30 distribution')
    requirements = defaultdict(list)
    for r in data['REQUIRES_SKILL']:
        if r['status'] == 'ACTIVE' and r['sourceCode'] in roles and r['targetCode'] in skills:
            requirements[r['sourceCode']].append((r['targetCode'], float(r['targetMastery'])))
    require(set(requirements) == set(roles), 'Each role needs active skill requirements')
    pools = {d: set() for d in domains}
    for role, pairs in requirements.items():
        requirements[role] = sorted(pairs)
        pools[role_domain[role]].update(skill for skill, _ in pairs)
    return {'roles': dict(sorted(roles.items())), 'skills': dict(sorted(skills.items())),
            'role_requirements': dict(requirements), 'role_domain': role_domain, 'domain_skills': pools}

def allocate_counts(total_users: int) -> Dict[str, int]:
    if total_users <= 0:
        raise ValueError("total_users phải > 0")

    raw = {
        "SE": total_users * 0.40,
        "DATA": total_users * 0.30,
        "AI": total_users * 0.30,
    }

    counts = {d: int(raw[d]) for d in raw}
    remainder = total_users - sum(counts.values())

    order = sorted(
        raw,
        key=lambda d: (raw[d] - int(raw[d]), {"SE": 2, "DATA": 1, "AI": 0}[d]),
        reverse=True,
    )

    for i in range(remainder):
        counts[order[i % len(order)]] += 1

    if not (sum(counts.values()) == total_users):
        raise ValueError('RQ1 validation failed: sum(counts.values()) == total_users')
    return counts

def random_name(rng: random.Random) -> str:
    first = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Võ",
             "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"]
    middle = ["Văn", "Thị", "Hữu", "Đức", "Minh", "Quốc", "Tuấn", "Thanh",
              "Hoàng", "Phương", "Anh", "Đình"]
    last = ["Vinh", "Nam", "Hùng", "Dũng", "Sơn", "Hà", "Linh", "Trang",
            "Thảo", "Hương", "Trí", "Quang", "Phúc", "Lộc", "Thọ", "Khánh"]
    return f"{rng.choice(first)} {rng.choice(middle)} {rng.choice(last)}"

def build_role_quotas(
    counts: Dict[str, int],
    catalog: Dict[str, Any],
    rng: random.Random,
) -> Dict[str, int]:
    """Distribute each domain's learners as evenly as possible across its roles."""
    quotas: Dict[str, int] = {}
    for domain, domain_count in counts.items():
        roles = sorted(
            role for role, d in catalog["role_domain"].items()
            if d == domain
        )
        if not roles:
            raise ValueError(f"Domain {domain} không có TargetRole trong V5.")

        base, remainder = divmod(domain_count, len(roles))
        # Deterministic shuffle avoids always assigning the remainder to the
        # alphabetically first roles while keeping the distribution balanced.
        shuffled = roles[:]
        rng.shuffle(shuffled)
        for role in roles:
            quotas[role] = base
        for role in shuffled[:remainder]:
            quotas[role] += 1

    if sum(quotas.values()) != sum(counts.values()):
        raise AssertionError("Role quota không khớp tổng số user.")
    return quotas


def violations(state, edges):
    return [(a, b) for a, b, minimum in edges
            if state[b] is not None and state[b] >= .75
            and state[a] is not None and state[a] < minimum]


def generate_one(rng, role, catalog, edges, challenging, cross_enabled):
    skills = sorted(catalog['skills'])
    domain = catalog['role_domain'][role]
    required = dict(catalog['role_requirements'][role])
    cross_pool = set(skills) - catalog['domain_skills'][domain]
    # Retry only infeasible synthetic scenarios; bounded and reproducible.
    for _ in range(10000):
        null_count = rng.randint(math.ceil(.20 * len(skills)), math.floor(.30 * len(skills)))
        max_required = min(math.floor(.30 * len(required)), null_count)
        min_required = max(0, null_count - (len(skills) - len(required)))
        n = rng.randint(min_required, max_required)
        unknown = set(rng.sample(sorted(required), n))
        unknown.update(rng.sample(sorted(set(skills) - set(required)), null_count - n))
        observed_cross = sorted(cross_pool - unknown)
        if cross_enabled and len(observed_cross) < 2:
            continue
        strong_cross = set(rng.sample(observed_cross, min(rng.randint(2, 4), len(observed_cross)))) if cross_enabled else set()
        # Latent ability creates correlated within-domain evidence with variation.
        ability = rng.uniform(.25, .90)
        state = {s: None if s in unknown else round(max(.05, min(.95,
                 rng.gauss(ability, .16) if s in catalog['domain_skills'][domain]
                 else rng.uniform(.10, .74))), 2) for s in skills}
        for s in sorted(strong_cross):
            state[s] = round(rng.uniform(.75, .95), 2)
        # Raise observed prerequisite evidence until all observed chains agree.
        for _pass in range(len(skills)):
            changed = False
            for a, b, minimum in edges:
                if state[b] is not None and state[b] >= .75 and state[a] is not None and state[a] < minimum:
                    state[a] = round(minimum, 2)
                    changed = True
            if not changed:
                break
        if challenging:
            candidates = [(a, b, m) for a, b, m in edges
                          if a not in unknown and b not in unknown]
            if not candidates:
                continue
            a, b, minimum = rng.choice(candidates)
            state[a] = round(rng.uniform(.05, max(.05, minimum - .10)), 2)
            state[b] = round(rng.uniform(.75, .95), 2)
        cross = sorted(s for s in cross_pool if state[s] is not None and state[s] >= .75)
        if (cross_enabled and not 2 <= len(cross) <= 4) or (not cross_enabled and cross):
            continue
        observed = [s for s in required if state[s] is not None]
        if not any(state[s] >= required[s] for s in observed) or not any(state[s] < required[s] for s in observed):
            continue
        conflicts = violations(state, edges)
        if bool(conflicts) != challenging:
            continue
        # Positive shortfalls averaged over ALL observed required skills.
        mean_gap = sum(max(0, required[s] - state[s]) for s in observed) / len(observed)
        band = 'Small' if mean_gap < .20 else 'Medium' if mean_gap < .40 else 'Large'
        return state, {
            'profileType': 'CHALLENGING' if challenging else 'TYPICAL',
            'crossDomainStrengthEnabled': cross_enabled,
            'crossDomainStrengthSkills': cross,
            'meanObservedRequiredGap': round(mean_gap, 8),
            'gapBand': band,
            'requiredObservedCoverage': len(observed) / len(required),
            'unknownRatio': len(unknown) / len(skills),
            'prerequisiteConflicts': [list(x) for x in conflicts],
            'unknownPrerequisiteEdges': [[a, b] for a, b, _ in edges
                if state[b] is not None and state[b] >= .75 and state[a] is None],
        }
    raise ValueError(f'No feasible profile for {role}; review catalog and rules')


def select_sample(users, rng):
    """Cover every role; distribute remaining slots across scenario features.

    This is a coverage-oriented benchmark sample, not a population estimator.
    """
    chosen = []
    for domain, count in [('SE', 20), ('DATA', 15), ('AI', 15)]:
        pool = [u for u in users if u['domain'] == domain]
        rng.shuffle(pool)
        roles = sorted({u['targetRoleCode'] for u in pool})
        if len(roles) > count:
            raise ValueError('Sample cannot cover every role within domain quota')
        local = []
        def score(u):
            m = u['benchmarkMeta']
            cov = 'HIGH' if m['requiredObservedCoverage'] >= .90 else 'MID' if m['requiredObservedCoverage'] >= .80 else 'LOW'
            def category(v):
                vm = v['benchmarkMeta']
                return 'HIGH' if vm['requiredObservedCoverage'] >= .90 else 'MID' if vm['requiredObservedCoverage'] >= .80 else 'LOW'
            return (sum(v['benchmarkMeta']['gapBand'] == m['gapBand'] for v in local),
                    sum(category(v) == cov for v in local),
                    sum(v['benchmarkMeta']['profileType'] == m['profileType'] for v in local),
                    sum(v['benchmarkMeta']['crossDomainStrengthEnabled'] == m['crossDomainStrengthEnabled'] for v in local),
                    sum(v['targetRoleCode'] == u['targetRoleCode'] for v in local))
        hard_quota = {'SE': 4, 'DATA': 3, 'AI': 3}[domain]
        cross_quota = {'SE': 6, 'DATA': 4, 'AI': 5}[domain]
        for attempt in range(1000):
            local = []
            rng.shuffle(pool)
            def eligible(u):
                hard = sum(v['benchmarkMeta']['profileType'] == 'CHALLENGING' for v in local)
                cross = sum(v['benchmarkMeta']['crossDomainStrengthEnabled'] for v in local)
                h = u['benchmarkMeta']['profileType'] == 'CHALLENGING'
                c = u['benchmarkMeta']['crossDomainStrengthEnabled']
                slots = count - len(local)
                return (hard + h <= hard_quota and cross + c <= cross_quota
                        and hard + h + slots - 1 >= hard_quota
                        and cross + c + slots - 1 >= cross_quota)
            failed = False
            for role in roles:
                candidates = [u for u in pool if u['targetRoleCode'] == role and eligible(u)]
                if not candidates:
                    failed = True
                    break
                local.append(min(candidates, key=score))
            if failed:
                continue
            while len(local) < count:
                ids = {u['userId'] for u in local}
                candidates = [u for u in pool if u['userId'] not in ids and eligible(u)]
                if not candidates:
                    failed = True
                    break
                local.append(min(candidates, key=score))
            if not failed:
                break
        else:
            raise ValueError('No sample meets role, domain and scenario quotas')
        chosen.extend(local)
    return sorted(chosen, key=lambda u: u['userId'])


def summary(users):
    return {'totalUsers': len(users),
            'domainDistribution': dict(Counter(u['domain'] for u in users)),
            'targetRoleDistribution': dict(sorted(Counter(u['targetRoleCode'] for u in users).items())),
            'profileTypes': dict(Counter(u['benchmarkMeta']['profileType'] for u in users)),
            'crossDomainStrengthEnabled': sum(u['benchmarkMeta']['crossDomainStrengthEnabled'] for u in users),
            'gapBands': dict(Counter(u['benchmarkMeta']['gapBand'] for u in users)),
            'coverageRange': [min(u['benchmarkMeta']['requiredObservedCoverage'] for u in users),
                              max(u['benchmarkMeta']['requiredObservedCoverage'] for u in users)]}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=Path, default=DEFAULT_FILE)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output-dir', type=Path, default=BASE / 'outputs/rq1_v9')
    args = parser.parse_args()
    catalog = load_catalog(str(args.file))
    data = prepare(read_xlsx(args.file))
    edges = sorted((e['sourceCode'], e['targetCode'], float(e['minMastery']))
                   for e in data['PREREQUISITE_OF'] if e['status'] == 'ACTIVE'
                   and e['sourceCode'] in catalog['skills'] and e['targetCode'] in catalog['skills'])
    rng = random.Random(args.seed)
    quotas = build_role_quotas(allocate_counts(500), catalog, rng)
    users = []
    for domain, count in [('SE', 200), ('DATA', 150), ('AI', 150)]:
        flags = [i < count // 5 for i in range(count)]
        cross_flags = [i < count * 3 // 10 for i in range(count)]
        rng.shuffle(flags)
        rng.shuffle(cross_flags)
        roles = [role for role in sorted(quotas) if catalog['role_domain'][role] == domain
                 for _ in range(quotas[role])]
        for role, hard, cross in zip(roles, flags, cross_flags):
            state, meta = generate_one(rng, role, catalog, edges, hard, cross)
            uid = f'USR-{len(users)+1:03d}'
            users.append({'userId': uid, 'fullName': random_name(rng),
                          'email': f'{uid.lower()}@example.com', 'domain': domain,
                          'targetRoleCode': role, 'competencyState': state, 'benchmarkMeta': meta})
    sample = select_sample(users, random.Random(args.seed + 1))
    signatures = {tuple(u['competencyState'][s] for s in sorted(catalog['skills'])) for u in users}
    require(len(signatures) == 500, 'Duplicate competency vectors')
    payload = {'datasetVersion': 'RQ1_PROFILES_V9', 'purpose': 'SYNTHETIC_BENCHMARK_ONLY',
               'expertReferenceStatus': 'NOT_ANNOTATED', 'seed': args.seed,
               'sourceKnowledgeGraph': args.file.name,
               'sourceSha256': hashlib.sha256(args.file.read_bytes()).hexdigest(),
               'generationRules': {'domainRatio': {'SE': .4, 'DATA': .3, 'AI': .3},
                   'challengingRatio': .20, 'crossDomainStrengthRatio': .30,
                   'crossDomainStrengthCount': [2, 4], 'unknownRatio': [.20, .30],
                   'requiredObservedCoverage': [.70, 1.0],
                   'gapFormula': 'mean(max(0, targetMastery-currentMastery)) over all observed required skills; null excluded',
                   'gapBands': {'Small': '[0,.20)', 'Medium': '[.20,.40)', 'Large': '[.40,1]'},
                   'prerequisiteAssumption': 'Observed skill >=.75 requires observed direct prerequisites >= catalog minMastery; unknown prerequisites unresolved',
                   'sampling': 'Seed 43 by default; cover all roles within 20/15/15 domain quotas; preserve 40 typical/10 challenging and 15 cross-domain profiles; greedily diversify gap then coverage then type then cross-domain strength then role',
                   'samplingCaveat': 'Coverage sample; gap ratios need not match the 500-user population; report per-stratum outcomes'},
               'summary': summary(users), 'users': users}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {'rq1_profiles_500_v9.json': payload,
               'rq1_sample_50_v9.json': {**{k: v for k, v in payload.items() if k not in ('summary', 'users')},
                    'sampleSeed': args.seed + 1, 'summary': summary(sample), 'users': sample},
               'rq1_expert_reference_50_template_v9.json': {
                   'datasetVersion': 'RQ1_PROFILES_V9', 'sourceSha256': payload['sourceSha256'],
                   'expertReferenceStatus': 'NOT_ANNOTATED',
                   'instructions': 'Expert independently selects 5 distinct relevant module codes per profile, with rationale, without viewing algorithm rankings.',
                   'references': [{'userId': u['userId'], 'targetRoleCode': u['targetRoleCode'],
                       'relevantModuleCodes': [], 'rationale': '', 'annotatorId': '', 'annotationStatus': 'PENDING'} for u in sample]}}
    for name, value in outputs.items():
        (args.output_dir / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'population': summary(users), 'sample': summary(sample)}, indent=2))


if __name__ == '__main__':
    main()
