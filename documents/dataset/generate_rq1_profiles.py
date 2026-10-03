"""Adapted from the user-provided generate_users_v7_rq1.py; synthetic profiles only.
V8: stable ordering, current catalog validation, observed cross-domain noise, explicit checks.
"""
import argparse
import json
import math
import os
import random
from collections import defaultdict
from typing import Any, Dict, List, Tuple

import hashlib
from pathlib import Path
import import_neo4j_dataset as graph


# ============================================================
# RQ1 Synthetic Learner Generator
# Source of truth: current neo4j_dataset_schema_diagram_aligned.xlsx
#
# Rules:
# - 500 users by default: 40% SE / 30% DATA / 30% AI
# - Target roles and skills MUST come from V5
# - Every profile MUST have observed strengths AND observed gaps
# - Gaps are derived ONLY from the selected role's REQUIRES_SKILL
# - Cross-domain high scores are allowed
# - Some currentMastery values are null = Unknown
# - null is NEVER converted to 0
# - 0.0 <= currentMastery <= 1.0
# ============================================================



def load_v5_catalog(xlsx_path: str) -> Dict[str, Any]:
    """Load current schema by named columns; validate before generating profiles."""
    data = graph.prepare(graph.read_xlsx(xlsx_path))
    roles = {r['code']: r for r in data['Target Roles'] if r['status'] == 'ACTIVE'}
    skills = {r['code']: r for r in data['MicroSkills'] if r['status'] == 'ACTIVE'}
    domains = {r['code'] for r in data['Job Domains'] if r['status'] == 'ACTIVE'}
    role_domain = {r['targetCode']: r['sourceCode'] for r in data['HAS_ROLE']
                   if r['status'] == 'ACTIVE' and r['targetCode'] in roles and r['sourceCode'] in domains}
    graph.require(set(role_domain) == set(roles), 'Each generated role needs an active domain')
    graph.require(set(role_domain.values()) == {'SE', 'DATA', 'AI'},
                  'This generator uses the proposed SE/DATA/AI 40/30/30 distribution')
    requirements = defaultdict(list)
    for r in data['REQUIRES_SKILL']:
        if r['status'] == 'ACTIVE' and r['sourceCode'] in roles and r['targetCode'] in skills:
            requirements[r['sourceCode']].append((r['targetCode'], float(r['targetMastery'])))
    graph.require(set(requirements) == set(roles), 'Each role needs active skill requirements')
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


def choose_unknown_skills(
    rng: random.Random,
    all_skills: List[str],
    required_skills: set,
) -> set:
    # UNKNOWN must represent 20-30% of the current skill catalog.
    # For 66 skills this means 14-19 UNKNOWN values.
    unknown_count = rng.randint(math.ceil(0.20 * len(all_skills)), math.floor(0.30 * len(all_skills)))

    # Required-skill observed coverage must be >= 70%.
    # Therefore at most floor(30% of required skills) may be UNKNOWN.
    max_unknown_required = math.floor(0.30 * len(required_skills))

    required_unknown_candidates = sorted(required_skills)
    non_required_candidates = [
        s for s in all_skills if s not in required_skills
    ]

    required_unknown_count = min(
        max_unknown_required,
        len(required_unknown_candidates),
        unknown_count,
    )

    # Sample required UNKNOWN values first, then fill the remaining UNKNOWN
    # values from non-required skills. This guarantees the coverage rule.
    unknown = set()
    if required_unknown_count > 0:
        unknown.update(
            rng.sample(required_unknown_candidates, required_unknown_count)
        )

    remaining = unknown_count - len(unknown)
    if remaining > len(non_required_candidates):
        raise ValueError(
            f"Không đủ non-required skills để tạo {unknown_count} UNKNOWN "
            f"mà vẫn giữ required-skill coverage >= 70%."
        )
    unknown.update(rng.sample(non_required_candidates, remaining))

    return unknown


def choose_gap_severity(rng: random.Random, required_pairs: List[Tuple[str, float]]) -> str:
    # Dataset-level target distribution for the deliberately forced gap:
    # Small 40%, Medium 40%, Large 20%.
    # The generator selects the severity per learner using these weights.
    eligible = {
        "Small": [x for x in required_pairs if x[1] >= 0.15],
        "Medium": [x for x in required_pairs if x[1] >= 0.20],
        "Large": [x for x in required_pairs if x[1] >= 0.40],
    }
    # Prefer the requested distribution, but only among severities that can
    # actually be represented by at least one required skill in this role.
    weights = {"Small": 0.40, "Medium": 0.40, "Large": 0.20}
    available = [k for k, skills in eligible.items() if skills]
    if not available:
        raise ValueError("Không có required skill đủ điều kiện để tạo Gap severity.")

    total = sum(weights[k] for k in available)
    draw = rng.random() * total
    cumulative = 0.0
    for k in available:
        cumulative += weights[k]
        if draw <= cumulative:
            return k
    return available[-1]


def generate_gap_value(
    rng: random.Random,
    target: float,
    severity: str,
) -> float:
    # Severity is defined as gap = requiredMastery - currentMastery.
    # Small: 0.05-0.19, Medium: 0.20-0.39, Large: >= 0.40.
    ranges = {
        "Small": (0.05, 0.19),
        "Medium": (0.20, 0.39),
        "Large": (0.40, 0.70),
    }
    min_gap, max_gap = ranges[severity]

    # A skill with target T can only realize a gap up to T because mastery >= 0.
    max_realizable_gap = min(max_gap, target)
    if max_realizable_gap < min_gap:
        raise ValueError(
            f"Target mastery {target:.2f} không đủ để tạo {severity} gap."
        )

    gap = rng.uniform(min_gap, max_realizable_gap)
    mastery = target - gap
    mastery = max(0.0, min(1.0, mastery))
    return round(mastery, 2)


def generate_mastery(
    rng: random.Random,
    domain: str,
    target_role: str,
    catalog: Dict[str, Any],
) -> Tuple[Dict[str, Any], set, set, set, str]:
    all_skills = list(catalog["skills"].keys())
    required_pairs = catalog["role_requirements"][target_role]
    required = {skill for skill, _ in required_pairs}
    target_by_skill = {skill: target for skill, target in required_pairs}

    domain_skill_pool = catalog["domain_skills"][domain]
    cross_pool = set(all_skills) - domain_skill_pool

    # Cross-domain noise: 2-4 skills outside the learner's target domain
    # are intentionally strong.

    # Unknown evidence. Null is never interpreted as zero.
    unknown = choose_unknown_skills(rng, all_skills, required)
    observed_cross = sorted(cross_pool - unknown)
    graph.require(bool(observed_cross), 'No observed cross-domain skill remains; change generation settings')
    cross_count = min(rng.randint(2, 4), len(observed_cross))
    cross_strengths = set(rng.sample(observed_cross, cross_count))

    # Explicitly choose observed required strengths and gaps.
    observed_required = sorted(required - unknown)
    if len(observed_required) < 2:
        raise ValueError(f"Role {target_role} có quá ít required skills quan sát được.")

    feasible_pairs = [(skill, target) for skill, target in required_pairs
                      if skill in observed_required and any(other != skill and target_by_skill[other] < 0.99
                                                            for other in observed_required)]
    gap_severity = choose_gap_severity(rng, feasible_pairs)
    gap_candidates = [
        s for s, target in required_pairs
        if (s, target) in feasible_pairs and target >= {
            "Small": 0.15,
            "Medium": 0.20,
            "Large": 0.40,
        }[gap_severity]
    ]
    if not gap_candidates:
        # Fallback: choose any observed required skill and let the validator
        # reject an impossible severity rather than silently changing rules.
        raise ValueError(
            f"Role {target_role} không có observed required skill phù hợp với {gap_severity} gap."
        )
    gap_skill = rng.choice(gap_candidates)
    strength_skill = rng.choice([s for s in observed_required if s != gap_skill and target_by_skill[s] < 0.99])

    # For reproducibility and validation, we guarantee:
    # - one observed required strength above its V5 target
    # - one observed required gap with a controlled severity
    forced_strength = {strength_skill}
    forced_gap = {gap_skill}

    state: Dict[str, Any] = {}

    for skill in all_skills:
        if skill in unknown:
            state[skill] = None
            continue

        if skill in forced_strength:
            target = target_by_skill[skill]
            low = max(target + 0.05, 0.70)
            high = min(0.99, max(low, target + 0.15))
            if low > 0.99:
                low = 0.99
            if high < low:
                high = low
            state[skill] = round(rng.uniform(low, high), 2)
            continue

        if skill in forced_gap:
            target = target_by_skill[skill]
            state[skill] = generate_gap_value(rng, target, gap_severity)
            continue

        if skill in cross_strengths:
            state[skill] = round(rng.uniform(0.75, 0.95), 2)
            continue

        # Other observed skills: neutral-to-variable evidence.
        state[skill] = round(rng.uniform(0.15, 0.85), 2)

    return state, forced_strength, forced_gap, cross_strengths, gap_severity


def validate_profile(profile: Dict[str, Any], catalog: Dict[str, Any]) -> None:
    domain = profile["domain"]
    role = profile["targetRoleCode"]
    state = profile["competencyState"]

    if not (domain in {'SE', 'DATA', 'AI'}):
        raise ValueError("RQ1 validation failed: domain in {'SE', 'DATA', 'AI'}")
    if not (role in catalog['roles']):
        raise ValueError("RQ1 validation failed: role in catalog['roles']")
    if not (catalog['role_domain'][role] == domain):
        raise ValueError("RQ1 validation failed: catalog['role_domain'][role] == domain")
    if not (set(state.keys()) == set(catalog['skills'].keys())):
        raise ValueError("RQ1 validation failed: set(state.keys()) == set(catalog['skills'].keys())")

    required = {
        skill: target
        for skill, target in catalog["role_requirements"][role]
    }

    strengths = [
        skill for skill, target in required.items()
        if state[skill] is not None and state[skill] >= target
    ]
    gaps = [
        skill for skill, target in required.items()
        if state[skill] is not None and state[skill] < target
    ]
    unknown_required = [
        skill for skill in required
        if state[skill] is None
    ]

    # Stronger RQ1 constraints.
    required_observed_coverage = (
        (len(required) - len(unknown_required)) / len(required)
    )
    if not (required_observed_coverage >= 0.7):
        raise ValueError(f'{profile['userId']} required-skill observed coverage {required_observed_coverage:.2%} < 70%')

    null_count = sum(value is None for value in state.values())
    null_ratio = null_count / len(state)
    if not (0.2 <= null_ratio <= 0.3):
        raise ValueError(f'{profile['userId']} UNKNOWN ratio {null_ratio:.2%} ngoài 20-30%')

    # Hard RQ1 constraints:
    if not (strengths):
        raise ValueError(f'{profile['userId']} không có observed Strength')
    if not (gaps):
        raise ValueError(f'{profile['userId']} không có observed Gap')
    if not (unknown_required or any((v is None for v in state.values()))):
        raise ValueError('RQ1 validation failed: unknown_required or any((v is None for v in state.values()))')

    # Null must stay null; non-null mastery must stay in [0, 1].
    for skill, value in state.items():
        if value is None:
            continue
        if not (isinstance(value, (int, float))):
            raise ValueError('RQ1 validation failed: isinstance(value, (int, float))')
        if not (0.0 <= value <= 1.0):
            raise ValueError('RQ1 validation failed: 0.0 <= value <= 1.0')

    # Cross-domain noise: at least one strong non-domain skill.
    domain_skills = catalog["domain_skills"][domain]
    cross_strengths = [
        skill for skill, value in state.items()
        if skill not in domain_skills and value is not None and value >= 0.75
    ]
    if not (cross_strengths):
        raise ValueError(f'{profile['userId']} thiếu Cross-domain Noise')


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


def generate_users(
    total_users: int = 500,
    seed: int = 42,
    v5_xlsx: str = str(graph.DEFAULT_FILE),
) -> List[Dict[str, Any]]:
    catalog = load_v5_catalog(v5_xlsx)
    rng = random.Random(seed)

    counts = allocate_counts(total_users)
    domains = ["SE", "DATA", "AI"]
    role_quotas = build_role_quotas(counts, catalog, rng)

    profiles: List[Dict[str, Any]] = []
    next_id = 1

    for domain in domains:
        role_candidates = [
            role for role, d in catalog["role_domain"].items()
            if d == domain
        ]

        for target_role in sorted(role_candidates):
            for _ in range(role_quotas[target_role]):
                user_id = f"USR-{next_id:03d}"
                next_id += 1

                state, strengths, gaps, cross_strengths, gap_severity = generate_mastery(
                    rng, domain, target_role, catalog
                )

                profile = {
                    "userId": user_id,
                    "fullName": random_name(rng),
                    "email": f"user-{next_id-1:03d}@rq1.example.invalid",
                    "domain": domain,
                    "targetRoleCode": target_role,
                    "status": "ACTIVE",
                    "competencyState": state,
                    "_generationMeta": {
                        "forcedGapSeverity": gap_severity,
                    },
                }

                validate_profile(profile, catalog)
                profiles.append(profile)

    # Final distribution validation
    final_counts = {
        d: sum(1 for p in profiles if p["domain"] == d)
        for d in domains
    }
    if not (final_counts['SE'] == counts['SE']):
        raise ValueError("RQ1 validation failed: final_counts['SE'] == counts['SE']")
    if not (final_counts['DATA'] == counts['DATA']):
        raise ValueError("RQ1 validation failed: final_counts['DATA'] == counts['DATA']")
    if not (final_counts['AI'] == counts['AI']):
        raise ValueError("RQ1 validation failed: final_counts['AI'] == counts['AI']")

    # TargetRole distribution must match the generated quotas exactly.
    final_role_counts = {
        role: sum(1 for p in profiles if p["targetRoleCode"] == role)
        for role in catalog["roles"]
    }
    if not (final_role_counts == role_quotas):
        raise ValueError('TargetRole distribution không khớp role quotas.')

    # No two learners may have the exact same 66-skill competency vector.
    competency_signatures = []
    for p in profiles:
        signature = tuple(
            p["competencyState"][skill]
            for skill in sorted(catalog["skills"])
        )
        competency_signatures.append(signature)
    if not (len(competency_signatures) == len(set(competency_signatures))):
        raise ValueError('Phát hiện duplicate competency profile.')

    return profiles


def summarize(users: List[Dict[str, Any]], catalog: Dict[str, Any]) -> Dict[str, Any]:
    summary = {
        "totalUsers": len(users),
        "domainDistribution": {},
        "targetRoleDistribution": {},
        "nullEvidence": {
            "profilesWithNull": 0,
            "totalNullValues": 0,
            "totalMasteryValues": 0,
        },
        "rq1Constraints": {
            "profilesWithObservedStrength": 0,
            "profilesWithObservedGap": 0,
            "profilesWithCrossDomainNoise": 0,
            "profilesWithRequiredSkillCoverageGte70": 0,
            "profilesWithUnknownRatio20to30": 0,
            "duplicateCompetencyProfiles": 0,
        },
        "gapSeverity": {
            "forcedGapSeverityDistribution": {
                "Small": 0,
                "Medium": 0,
                "Large": 0,
            },
            "definitions": {
                "Small": "0.05 <= gap < 0.20",
                "Medium": "0.20 <= gap < 0.40",
                "Large": "gap >= 0.40",
            },
        },
    }

    for domain in ["SE", "DATA", "AI"]:
        summary["domainDistribution"][domain] = sum(
            1 for p in users if p["domain"] == domain
        )

    for role in catalog["roles"]:
        summary["targetRoleDistribution"][role] = sum(
            1 for p in users if p["targetRoleCode"] == role
        )

    signatures = []
    for p in users:
        state = p["competencyState"]
        signatures.append(tuple(state[s] for s in sorted(catalog["skills"])))

    summary["rq1Constraints"]["duplicateCompetencyProfiles"] = (
        len(signatures) - len(set(signatures))
    )

    for p in users:
        state = p["competencyState"]
        nulls = sum(v is None for v in state.values())
        summary["nullEvidence"]["totalNullValues"] += nulls
        summary["nullEvidence"]["totalMasteryValues"] += len(state)
        null_ratio = nulls / len(state)
        if nulls:
            summary["nullEvidence"]["profilesWithNull"] += 1
        if 0.20 <= null_ratio <= 0.30:
            summary["rq1Constraints"]["profilesWithUnknownRatio20to30"] += 1

        required = dict(catalog["role_requirements"][p["targetRoleCode"]])
        strengths = any(
            state[s] is not None and state[s] >= target
            for s, target in required.items()
        )
        gaps = any(
            state[s] is not None and state[s] < target
            for s, target in required.items()
        )
        required_observed = sum(1 for s in required if state[s] is not None)
        if required_observed / len(required) >= 0.70:
            summary["rq1Constraints"]["profilesWithRequiredSkillCoverageGte70"] += 1

        forced_severity = p.get("_generationMeta", {}).get("forcedGapSeverity")
        if forced_severity in summary["gapSeverity"]["forcedGapSeverityDistribution"]:
            summary["gapSeverity"]["forcedGapSeverityDistribution"][forced_severity] += 1

        domain_skills = catalog["domain_skills"][p["domain"]]
        cross_noise = any(
            s not in domain_skills and v is not None and v >= 0.75
            for s, v in state.items()
        )

        summary["rq1Constraints"]["profilesWithObservedStrength"] += int(strengths)
        summary["rq1Constraints"]["profilesWithObservedGap"] += int(gaps)
        summary["rq1Constraints"]["profilesWithCrossDomainNoise"] += int(cross_noise)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("total", nargs="?", type=int, default=500)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--file", "--v5", dest="v5",
        type=str,
        default=str(graph.DEFAULT_FILE),
        help="Path to the current catalog workbook.",
    )
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    if args.total <= 10:
        raise ValueError("total phải > 10")

    users = generate_users(args.total, args.seed, args.v5)
    catalog = load_v5_catalog(args.v5)
    summary = summarize(users, catalog)

    # Internal generation metadata is used for validation/summary only; do not
    # expose it as learner-facing competency data.
    for user in users:
        user.pop("_generationMeta", None)

    output = args.output or str(graph.BASE.parent.parent / 'local/benchmarks/rq1/rq1_profiles_v8.json')
    Path(output).parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "datasetVersion": "RQ1_PROFILES_V8",
        "purpose": "SYNTHETIC_BENCHMARK_ONLY",
        "expertReferenceStatus": "NOT_ANNOTATED",
        "sourceSha256": hashlib.sha256(Path(args.v5).read_bytes()).hexdigest(),
        "sourceOrganizationIds": sorted({r['organizationId'] for r in catalog['roles'].values()}),
        "sourceKnowledgeGraph": os.path.basename(args.v5),
        "seed": args.seed,
        "generationRules": {
            "domainRatio": {"SE": 0.40, "DATA": 0.30, "AI": 0.30},
            "targetRoleDistribution": {
                "rule": "Balanced within each domain; role quotas differ by at most 1 within a domain",
                "actualQuotas": summary["targetRoleDistribution"],
            },
            "profileMustHaveStrength": True,
            "profileMustHaveGap": True,
            "crossDomainNoise": True,
            "unknownEvidenceUsesNull": True,
            "nullIsNotZero": True,
            "masteryRange": [0.0, 1.0],
            "requiredSkillObservedCoverageMin": 0.70,
            "unknownRatio": [0.20, 0.30],
            "gapSeverity": {
                "Small": "0.05 <= requiredMastery-currentMastery < 0.20",
                "Medium": "0.20 <= requiredMastery-currentMastery < 0.40",
                "Large": "requiredMastery-currentMastery >= 0.40",
                "samplingWeights": {"Small": 0.40, "Medium": 0.40, "Large": 0.20},
            },
            "noDuplicateCompetencyProfile": True,
            "roleRequirementsSource": "current ACTIVE REQUIRES_SKILL",
            "skillSource": "current ACTIVE MicroSkills",
            "roleSource": "current ACTIVE Target Roles",
        },
        "summary": summary,
        "users": users,
    }

    with open(output, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(users)} users successfully.")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Saved: {output}")


if __name__ == "__main__":
    main()
