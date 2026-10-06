"""Generate reproducible, paired RQ3 learner/pathway scenarios.

This is a synthetic benchmark fixture. Successful module completion applies
the catalog TEACHES.outcomeMastery as simulated evidence; it is not an
empirical claim about real learner mastery.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import random

import generate_rq1_profiles_v9 as rq1


BASE = Path(__file__).resolve().parent
DEFAULT_FILE = BASE / "neo4j_dataset_schema_diagram_aligned.xlsx"
DEFAULT_OUTPUT = BASE / "outputs/rq3_v1"
SEED = 42
FAILURE_PROBABILITY = 0.20
DOMAIN_SHARE = {"SE": 0.40, "DATA": 0.30, "AI": 0.30}
STAMP = "2026-10-04T00:00:00Z"
STATUS_ACTIVE = "ACTIVE"
CORE_ORDER = {"CORE": 0, "ADVANCED": 1, "SUPPORTING": 2,
              "INTRODUCTION_OR_REVIEW": 3}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def active(rows):
    return [row for row in rows if row.get("status") == STATUS_ACTIVE]


def build_catalog(data, profile_catalog):
    roles = profile_catalog["roles"]
    skills = profile_catalog["skills"]
    modules = {row["code"]: row for row in active(data["Learning Modules"])}
    teaches = defaultdict(list)
    for edge in active(data["TEACHES"]):
        if edge["sourceCode"] in modules and edge["targetCode"] in skills:
            teaches[edge["sourceCode"]].append({
                "skillCode": edge["targetCode"],
                "outcomeMastery": float(edge["outcomeMastery"]),
                "coverage": edge["coverage"],
            })
    entry = defaultdict(list)
    for edge in active(data["HAS_ENTRY_REQUIREMENT"]):
        if edge["sourceCode"] in modules and edge["targetCode"] in skills:
            entry[edge["sourceCode"]].append({
                "skillCode": edge["targetCode"],
                "minMastery": float(edge["minMastery"]),
            })
    require(modules and teaches, "Active modules/TEACHES edges are required")
    return {"roles": roles, "skills": skills, "modules": modules,
            "role_requirements": profile_catalog["role_requirements"],
            "role_domain": profile_catalog["role_domain"],
            "teaches": dict(teaches), "entry": dict(entry)}


def module_is_eligible(module_code, state, catalog):
    return all(state.get(req["skillCode"]) is not None and
               state[req["skillCode"]] >= req["minMastery"]
               for req in catalog["entry"].get(module_code, []))


def apply_success(state, module_code, catalog):
    """Apply the synthetic transition: observed mastery rises to outcomeMastery."""
    for item in catalog["teaches"].get(module_code, []):
        skill = item["skillCode"]
        current = state.get(skill)
        state[skill] = max(current if current is not None else 0.0,
                           item["outcomeMastery"])


def uncovered_observed(state, requirements):
    return {skill for skill, target in requirements
            if state.get(skill) is not None and state[skill] < target}


def observed_gap_sum(state, requirements):
    return sum(max(0.0, target - state[skill]) for skill, target in requirements
               if state.get(skill) is not None)


def coverage_rank(module_code, catalog):
    kinds = [item["coverage"] for item in catalog["teaches"].get(module_code, [])]
    return min((CORE_ORDER.get(kind, 9) for kind in kinds), default=9)


def plan_static_curriculum(user, catalog):
    """Precompute a fixed route using initial deficits and optimistic successes.

    The route is frozen before failures are generated. Every selected module
    must be eligible from the initial profile, even after earlier failures.
    Optimistic successes are used only to score remaining competency gaps.
    """
    state = dict(user["competencyState"])
    initial_state = dict(state)
    requirements = catalog["role_requirements"][user["targetRoleCode"]]
    unmet = uncovered_observed(state, requirements)
    route = []
    candidate_codes = sorted(catalog["modules"])
    while unmet:
        candidates = []
        for code in candidate_codes:
            if code in route or not module_is_eligible(code, initial_state, catalog):
                continue
            before = observed_gap_sum(state, requirements)
            next_state = dict(state)
            apply_success(next_state, code, catalog)
            gain = before - observed_gap_sum(next_state, requirements)
            taught = {x["skillCode"] for x in catalog["teaches"].get(code, [])}
            contribution = len(unmet & taught)
            if gain > 1e-9:
                candidates.append((-gain, -contribution, coverage_rank(code, catalog), code))
        if not candidates:
            break
        _, _, _, selected = min(candidates)
        route.append(selected)
        apply_success(state, selected, catalog)
        unmet = uncovered_observed(state, requirements)
    return route, sorted(unmet)


def plan_static_fallbacks(user, curriculum, catalog):
    """Choose one fixed, entry-eligible substitute per route module, if possible."""
    state = dict(user["competencyState"])
    initial_state = dict(state)
    requirements = dict(catalog["role_requirements"][user["targetRoleCode"]])
    route_set = set(curriculum)
    fallbacks = {}
    for failed_module in curriculum:
        primary_taught = {x["skillCode"] for x in catalog["teaches"].get(failed_module, [])}
        still_relevant = {s for s in primary_taught if s in requirements and
                          state.get(s) is not None and state[s] < requirements[s]}
        candidates = []
        for code in sorted(catalog["modules"]):
            if code == failed_module or code in route_set or not module_is_eligible(code, initial_state, catalog):
                continue
            overlap = len(still_relevant & {x["skillCode"] for x in catalog["teaches"].get(code, [])})
            if overlap:
                candidates.append((-overlap, coverage_rank(code, catalog), code))
        if candidates:
            _, _, fallback_code = min(candidates)
            fallbacks[failed_module] = {
                "moduleCode": fallback_code,
                "reason": "PREAUTHORED_ALTERNATIVE_TEACHES_OVERLAPPING_REQUIRED_SKILL",
            }
        else:
            fallbacks[failed_module] = {
                "moduleCode": None,
                "reason": "NO_ELIGIBLE_ALTERNATIVE_OUTSIDE_FIXED_CURRICULUM",
            }
        # The route and fallback table are fixed before outcomes; advance only
        # the planning state optimistically for required-skill gap scoring.
        apply_success(state, failed_module, catalog)
    return fallbacks


def failure_outcome(seed, user_id, module_code):
    """Stable potential outcome shared by all pathway strategies."""
    rng = random.Random(f"rq3-v1/{seed}/{user_id}/{module_code}/attempt-1")
    return rng.random() < FAILURE_PROBABILITY


def metric_snapshot(state, role, catalog):
    requirements = catalog["role_requirements"][role]
    observed = [(skill, target, state.get(skill)) for skill, target in requirements
                if state.get(skill) is not None]
    unknown = [skill for skill, _ in requirements if state.get(skill) is None]
    gaps = [max(0.0, target - current) for _, target, current in observed]
    hit = [current >= target for _, target, current in observed]
    return {
        "observedRequiredSkillCount": len(observed),
        "unknownRequiredSkillCount": len(unknown),
        "meanPositiveGapObserved": round(sum(gaps) / len(gaps), 8) if gaps else None,
        "requiredSkillTargetHitRateObserved": round(sum(hit) / len(hit), 8) if hit else None,
        "unmetObservedRequiredSkillCount": sum(not x for x in hit),
        "unmetObservedRequiredSkillCodes": sorted(
            skill for skill, target, current in observed if current < target),
    }


def validate(users, catalog, scenarios):
    require(len(users) == 100, "Expected exactly 100 RQ3 learners")
    require(len({u["userId"] for u in users}) == 100, "Learner IDs must be unique")
    distribution = Counter(u["domain"] for u in users)
    require(distribution == Counter({"SE": 40, "DATA": 30, "AI": 30}),
            f"Unexpected domain distribution: {distribution}")
    require(len(scenarios) == len(users), "Each learner needs exactly one paired scenario")
    for user, scenario in zip(users, scenarios):
        route = scenario["staticPathway"]["curriculumModuleCodes"]
        require(len(route) == len(set(route)), f"{user['userId']}: duplicate route module")
        require(set(route) <= set(catalog["modules"]), f"{user['userId']}: unknown route module")
        require(set(scenario["modulePotentialOutcomes"]) == set(catalog["modules"]),
                f"{user['userId']}: potential outcomes must cover each active module exactly once")
        require(set(scenario["staticPathway"]["failureFallbacks"]) == set(route),
                f"{user['userId']}: each static module needs a pre-authored fallback decision")
        for module in route:
            fallback = scenario["staticPathway"]["failureFallbacks"][module]
            if fallback["moduleCode"] is not None:
                require(fallback["moduleCode"] not in route,
                        f"{user['userId']}: fallback must be outside the fixed route")
                require(module_is_eligible(fallback["moduleCode"],
                                           user["competencyState"], catalog),
                        f"{user['userId']}: fallback violates starting entry requirements")
            require(module_is_eligible(module, user["competencyState"], catalog),
                    f"{user['userId']}: fixed route violates starting entry requirements")


def generate(source_path, seed=SEED):
    raw = rq1.read_xlsx(source_path)
    data = rq1.prepare(raw)
    profile_catalog = rq1.load_catalog(str(source_path))
    catalog = build_catalog(data, profile_catalog)
    rng = random.Random(seed)
    quotas = rq1.build_role_quotas(rq1.allocate_counts(100), profile_catalog, rng)
    prerequisite_edges = sorted(
        (edge["sourceCode"], edge["targetCode"], float(edge["minMastery"]))
        for edge in active(data["PREREQUISITE_OF"])
        if edge["sourceCode"] in catalog["skills"] and edge["targetCode"] in catalog["skills"])

    users = []
    cross_flags_by_domain = {}
    for domain, count in (("SE", 40), ("DATA", 30), ("AI", 30)):
        flags = [i < count * 3 // 10 for i in range(count)]
        rng.shuffle(flags)
        cross_flags_by_domain[domain] = iter(flags)
        roles = [role for role in sorted(quotas)
                 if profile_catalog["role_domain"][role] == domain
                 for _ in range(quotas[role])]
        for role in roles:
            state, meta = rq1.generate_one(rng, role, profile_catalog,
                                           prerequisite_edges, False,
                                           next(cross_flags_by_domain[domain]))
            user_id = f"RQ3-USR-{len(users) + 1:03d}"
            users.append({"userId": user_id,
                          "fullName": rq1.random_name(rng),
                          "email": f"{user_id.lower()}@example.com",
                          "domain": domain,
                          "targetRoleCode": role,
                          "competencyState": state,
                          "profileMeta": meta})

    scenarios = []
    total_failures = 0
    for user in users:
        route, initially_uncovered = plan_static_curriculum(user, catalog)
        fallbacks = plan_static_fallbacks(user, route, catalog)
        outcomes = {module: {"attemptNumber": 1,
                             "failed": failure_outcome(seed, user["userId"], module),
                             "failureProbability": FAILURE_PROBABILITY}
                    for module in sorted(catalog["modules"])}
        total_failures += sum(outcome["failed"] for outcome in outcomes.values())
        scenarios.append({
            "scenarioId": f"RQ3-SC-{len(scenarios) + 1:03d}",
            "userId": user["userId"],
            "targetRoleCode": user["targetRoleCode"],
            "initialMetrics": metric_snapshot(user["competencyState"], user["targetRoleCode"], catalog),
            "staticPathway": {
                "curriculumModuleCodes": route,
                "failureFallbacks": fallbacks,
                "uncoveredInitialObservedGapSkills": initially_uncovered,
                "policy": "FIXED_ROUTE_WITH_ONE_PREAUTHORED_FALLBACK_ON_FAILURE",
            },
            "modulePotentialOutcomes": outcomes,
        })
    validate(users, catalog, scenarios)

    module_records = []
    for code, module in sorted(catalog["modules"].items()):
        module_records.append({
            "moduleCode": code,
            "title": module["title"],
            "teaches": sorted(catalog["teaches"].get(code, []), key=lambda x: x["skillCode"]),
            "entryRequirements": sorted(catalog["entry"].get(code, []), key=lambda x: x["skillCode"]),
        })
    role_records = []
    for code, role in sorted(catalog["roles"].items()):
        role_records.append({"targetRoleCode": code,
                             "domain": catalog["role_domain"][code],
                             "requiredSkills": [{"skillCode": skill, "targetMastery": target}
                                                for skill, target in catalog["role_requirements"][code]]})
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    failure_count = len(users) * len(catalog["modules"])
    payload = {
        "datasetVersion": "RQ3_SCENARIOS_V1",
        "purpose": "SYNTHETIC_PAIRED_PATHWAY_BENCHMARK_ONLY",
        "seed": seed,
        "sourceOntologyFile": source_path.name,
        "sourceOntologySha256": source_hash,
        "summary": {
            "learnerCount": len(users),
            "domainDistribution": dict(Counter(u["domain"] for u in users)),
            "targetRoleDistribution": dict(sorted(Counter(u["targetRoleCode"] for u in users).items())),
            "activeModuleCount": len(catalog["modules"]),
            "pairedLearnerModulePotentialOutcomeCount": failure_count,
            "potentialFailureCount": total_failures,
            "potentialFailureRateObserved": round(total_failures / failure_count, 8),
            "staticRouteLength": {
                "min": min(len(s["staticPathway"]["curriculumModuleCodes"]) for s in scenarios),
                "max": max(len(s["staticPathway"]["curriculumModuleCodes"]) for s in scenarios),
                "mean": round(sum(len(s["staticPathway"]["curriculumModuleCodes"]) for s in scenarios) / len(scenarios), 4),
            },
            "initiallyUncoveredGapSkillScenarioCount": sum(
                bool(s["staticPathway"]["uncoveredInitialObservedGapSkills"]) for s in scenarios),
        },
        "generationRules": {
            "separatePopulation": "100 new RQ3 profiles; generated from ontology and RQ1 V9 profile mechanism, not copied from RQ1's 500/50 files",
            "domainRatio": DOMAIN_SHARE,
            "targetRoleAllocation": "Balanced as evenly as possible within each domain across active roles",
            "profileRules": {
                "challengingProfiles": 0,
                "prerequisiteConsistency": "Observed advanced skill >= 0.75 has observed direct prerequisites raised to catalog minMastery; unknown prerequisites stay unknown",
                "crossDomainStrengthProfiles": "30% per domain; each enabled profile has 2-4 observed cross-domain strengths",
                "unknownSkillRatio": [0.20, 0.30],
                "requiredObservedCoverage": [0.70, 1.0],
                "startingMasteryIsSynthetic": True,
            },
            "failureScenario": {
                "probability": FAILURE_PROBABILITY,
                "sampling": "Independent potential outcome per learner, module, and first attempt using seed-derived stable key",
                "pairedComparison": "Both pathways use the same potential outcome if they select the same module for a learner",
                "outcomesProvidedFor": "Every active module for every learner, including modules outside the static route",
                "retryLimitPerLearnerModule": 1,
            },
            "masteryTransition": "On synthetic success only, each taught skill becomes max(current observed mastery, TEACHES.outcomeMastery); null becomes outcomeMastery. This transition is a benchmark assumption, not measured learning evidence.",
            "staticPathway": "A fixed per-learner module sequence is computed before failure outcomes. On failure, use the pre-authored single fallback (if one exists); do not adapt or select a new fallback from changed mastery. Continue the precomputed route after fallback. No nested fallback.",
            "staticCurriculumSelection": "Greedy positive-gap reduction for initially observed required skills; include only modules whose entry requirements are observed and met in the initial learner state. Stop when no eligible active module can further reduce a gap; report residual gaps. This keeps the fixed route and each fallback executable regardless of earlier failures.",
            "primaryGapMetric": "Mean positive shortfall max(0,targetMastery-currentMastery) across observed required skills; unknown required skills are excluded from the mean and reported separately.",
            "secondaryValidityMetrics": ["observed required-skill target hit rate", "unmet observed required-skill count and codes", "unknown required-skill count", "initially uncovered observed gap skills"],
            "moduleCountMetric": "Count module assignments, with primary and fallback/remedial assignments reported separately by the evaluator; do not interpret fewer modules alone as valid coverage.",
            "stoppingCondition": "Algorithm should stop when all observed required skills meet targets or no eligible candidate module remains; preserve unknown required skills as unknown and report them.",
            "limitations": ["Synthetic profiles, failures, and mastery transitions are not observed learner outcomes.", "A 20% probability does not guarantee exactly 20% failures in a finite generated sample.", "Module outcomes are first-attempt potential outcomes; no repeat-attempt model is provided."],
        },
        "activeTargetRoles": role_records,
        "activeModules": module_records,
        "users": users,
        "scenarios": scenarios,
    }
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = generate(args.file.resolve(), args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_path = args.output_dir / "rq3_scenarios_100_v1.json"
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
