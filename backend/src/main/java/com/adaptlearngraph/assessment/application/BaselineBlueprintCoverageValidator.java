package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.CoverageShortage;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.RoleCoverageRequirement;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

final class BaselineBlueprintCoverageValidator {
    private final BaselineBlueprintValidationPort validation;

    BaselineBlueprintCoverageValidator(BaselineBlueprintValidationPort validation) {
        this.validation = validation;
    }

    void validate(List<RoleConfig> roles) {
        Map<CoverageKey, Demand> demands = aggregate(roles);
        Set<String> skillIds = demands.keySet().stream()
                .map(CoverageKey::microSkillId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<CoverageKey, Integer> coverage = validation.findPublishedCoverage(skillIds);
        List<CoverageShortage> shortages = demands.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator
                        .comparing(CoverageKey::microSkillId)
                        .thenComparing(CoverageKey::difficulty)))
                .map(entry -> shortage(entry.getKey(), entry.getValue(), coverage))
                .filter(shortage -> shortage.missing() > 0)
                .toList();
        if (!shortages.isEmpty()) {
            throw new Failure(
                    Code.INSUFFICIENT_QUESTION_COVERAGE,
                    "Published question coverage is insufficient for aggregate Occupation demand", shortages);
        }
    }

    private static Map<CoverageKey, Demand> aggregate(List<RoleConfig> roles) {
        Map<CoverageKey, Demand> demands = new HashMap<>();
        for (RoleConfig role : roles) {
            if (!role.participates()) {
                continue;
            }
            for (SkillConfig skill : role.skills()) {
                for (Difficulty difficulty : Difficulty.values()) {
                    int required = required(skill, difficulty);
                    if (required > 0) {
                        demands.computeIfAbsent(
                                        new CoverageKey(skill.microSkillId(), difficulty), ignored -> new Demand())
                                .add(role.roleId(), required);
                    }
                }
            }
        }
        return demands;
    }

    private static CoverageShortage shortage(
            CoverageKey key, Demand demand, Map<CoverageKey, Integer> coverage) {
        int available = coverage.getOrDefault(key, 0);
        List<RoleCoverageRequirement> contributions = demand.byRole.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new RoleCoverageRequirement(entry.getKey(), entry.getValue()))
                .toList();
        return new CoverageShortage(
                null, key.microSkillId(), key.difficulty().name(), demand.total,
                available, Math.max(0, demand.total - available), contributions);
    }

    private static int required(SkillConfig skill, Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> skill.easyQuestionCount();
            case MEDIUM -> skill.mediumQuestionCount();
            case HARD -> skill.hardQuestionCount();
        };
    }

    private static final class Demand {
        private int total;
        private final Map<String, Integer> byRole = new HashMap<>();

        private void add(String roleId, int required) {
            total = Math.addExact(total, required);
            byRole.merge(roleId, required, Math::addExact);
        }
    }
}
