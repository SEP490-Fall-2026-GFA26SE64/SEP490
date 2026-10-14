package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.CoverageShortage;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogSkill;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CoverageKey;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.DependencyUnavailable;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class BaselineBlueprintDraftValidator {
    private final BaselineBlueprintValidationPort validation;

    BaselineBlueprintDraftValidator(BaselineBlueprintValidationPort validation) {
        this.validation = validation;
    }

    BlueprintDraft validateAndNormalize(Actor actor, BlueprintDraft draft) {
        try {
            List<RoleConfig> normalizedRoles = new ArrayList<>();
            Set<String> enabledSkillIds = new LinkedHashSet<>();
            for (RoleConfig role : draft.roles()) {
                normalizedRoles.add(role.enabled()
                        ? normalizeEnabledRole(actor, role, enabledSkillIds)
                        : role);
            }
            Map<CoverageKey, Integer> coverage = validation.findPublishedCoverage(enabledSkillIds);
            List<CoverageShortage> shortages = findShortages(normalizedRoles, coverage);
            if (!shortages.isEmpty()) {
                throw new Failure(
                        Code.INSUFFICIENT_QUESTION_COVERAGE,
                        "Published question coverage is insufficient", shortages);
            }
            return new BlueprintDraft(
                    draft.name(), draft.occupationId(), draft.occupationNameSnapshot(), normalizedRoles);
        } catch (DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    private RoleConfig normalizeEnabledRole(Actor actor, RoleConfig role, Set<String> enabledSkillIds) {
        var catalogRole = validation.findAvailableRole(actor.organizationId(), role.roleId())
                .orElseThrow(() -> failure(
                        "Target role is unavailable: " + role.roleId()));
        Map<String, CatalogSkill> catalogSkills = new HashMap<>();
        for (CatalogSkill skill : catalogRole.skills()) {
            if (catalogSkills.put(skill.id(), skill) != null) {
                throw failure("Target role has duplicate MicroSkill: " + skill.id());
            }
        }
        List<SkillConfig> normalizedSkills = role.skills().stream().map(skill -> {
            CatalogSkill catalogSkill = catalogSkills.get(skill.microSkillId());
            if (catalogSkill == null) {
                throw failure(
                        "MicroSkill is not active for role " + role.roleId() + ": " + skill.microSkillId());
            }
            enabledSkillIds.add(catalogSkill.id());
            return new SkillConfig(
                    catalogSkill.id(), catalogSkill.name(), skill.easyQuestionCount(),
                    skill.mediumQuestionCount(), skill.hardQuestionCount());
        }).toList();
        return new RoleConfig(
                catalogRole.id(), catalogRole.name(), true,
                role.easyScoreWeight(), role.mediumScoreWeight(), role.hardScoreWeight(),
                normalizedSkills);
    }

    private static List<CoverageShortage> findShortages(
            List<RoleConfig> roles, Map<CoverageKey, Integer> coverage) {
        return roles.stream()
                .filter(RoleConfig::enabled)
                .sorted(Comparator.comparing(RoleConfig::roleId))
                .flatMap(role -> role.skills().stream().flatMap(skill ->
                        Arrays.stream(Difficulty.values()).map(difficulty -> {
                            int required = required(skill, difficulty);
                            int available = coverage.getOrDefault(
                                    new CoverageKey(skill.microSkillId(), difficulty), 0);
                            return new CoverageShortage(
                                    role.roleId(), skill.microSkillId(), difficulty.name(), required,
                                    available, Math.max(0, required - available));
                        })))
                .filter(shortage -> shortage.missing() > 0)
                .toList();
    }

    private static int required(SkillConfig skill, Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> skill.easyQuestionCount();
            case MEDIUM -> skill.mediumQuestionCount();
            case HARD -> skill.hardQuestionCount();
        };
    }

    private static Failure failure(String message) {
        return new Failure(Code.CATALOG_REFERENCE_INVALID, message);
    }
}
