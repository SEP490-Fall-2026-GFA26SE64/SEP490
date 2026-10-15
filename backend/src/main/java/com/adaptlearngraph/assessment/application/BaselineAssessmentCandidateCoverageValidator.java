package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.CoverageShortage;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.RoleCoverageRequirement;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.CandidateItem;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Aggregate no-repeat coverage policy applied before manifest selection. */
final class BaselineAssessmentCandidateCoverageValidator {
    private BaselineAssessmentCandidateCoverageValidator() {}

    static void requireCoverage(BaselineBlueprint blueprint, List<CandidateItem> candidates) {
        Map<CandidateKey, Set<UUID>> available = new HashMap<>();
        for (CandidateItem candidate : candidates) {
            available.computeIfAbsent(
                    new CandidateKey(candidate.microSkillId(), candidate.difficulty()),
                    ignored -> new HashSet<>())
                    .add(candidate.itemVersionId());
        }

        Map<CandidateKey, Demand> demands = new HashMap<>();
        for (BaselineBlueprint.RoleConfig role : blueprint.roles()) {
            if (!role.participates()) {
                continue;
            }
            for (BaselineBlueprint.SkillConfig skill : role.skills()) {
                addDemand(demands, role.roleId(), skill.microSkillId(), Difficulty.EASY,
                        skill.easyQuestionCount());
                addDemand(demands, role.roleId(), skill.microSkillId(), Difficulty.MEDIUM,
                        skill.mediumQuestionCount());
                addDemand(demands, role.roleId(), skill.microSkillId(), Difficulty.HARD,
                        skill.hardQuestionCount());
            }
        }

        List<CoverageShortage> shortages = demands.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator
                        .comparing(CandidateKey::microSkillId)
                        .thenComparing(CandidateKey::difficulty)))
                .map(entry -> shortage(entry.getKey(), entry.getValue(), available))
                .filter(shortage -> shortage.missing() > 0)
                .toList();
        if (!shortages.isEmpty()) {
            throw new Failure(
                    Code.INSUFFICIENT_QUESTION_COVERAGE,
                    "Published question coverage changed after the blueprint was saved", shortages);
        }
    }

    private static CoverageShortage shortage(
            CandidateKey key, Demand demand, Map<CandidateKey, Set<UUID>> available) {
        int availableCount = available.getOrDefault(key, Set.of()).size();
        List<RoleCoverageRequirement> contributions = demand.byRole.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(item -> new RoleCoverageRequirement(item.getKey(), item.getValue()))
                .toList();
        return new CoverageShortage(
                null, key.microSkillId(), key.difficulty().name(), demand.total,
                availableCount, Math.max(0, demand.total - availableCount), contributions);
    }

    private static void addDemand(
            Map<CandidateKey, Demand> demands, String roleId, String skillId,
            Difficulty difficulty, int required) {
        if (required > 0) {
            demands.computeIfAbsent(new CandidateKey(skillId, difficulty), ignored -> new Demand())
                    .add(roleId, required);
        }
    }

    private record CandidateKey(String microSkillId, Difficulty difficulty) {}

    private static final class Demand {
        private int total;
        private final Map<String, Integer> byRole = new HashMap<>();

        private void add(String roleId, int required) {
            total = Math.addExact(total, required);
            byRole.merge(roleId, required, Math::addExact);
        }
    }
}
