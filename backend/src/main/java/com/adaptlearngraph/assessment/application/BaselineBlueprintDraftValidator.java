package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogOccupation;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogRole;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.CatalogSkill;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.DependencyUnavailable;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

final class BaselineBlueprintDraftValidator {
    private static final BigDecimal MINIMUM_PARTICIPATING_WEIGHT = new BigDecimal("0.01");

    private final BaselineBlueprintValidationPort validation;
    private final BaselineBlueprintCoverageValidator coverage;

    BaselineBlueprintDraftValidator(BaselineBlueprintValidationPort validation) {
        this.validation = validation;
        this.coverage = new BaselineBlueprintCoverageValidator(validation);
    }

    BlueprintDraft validateAndNormalize(Actor actor, BlueprintDraft draft) {
        try {
            String occupationId = requireText(draft.occupationId(), "occupationId");
            CatalogOccupation occupation = validation.findAvailableOccupation(actor.organizationId(), occupationId)
                    .orElseThrow(() -> failure("Occupation is unavailable: " + occupationId));
            List<RoleConfig> roles = normalizeRoles(draft.roles(), occupation);
            if (roles.stream().noneMatch(RoleConfig::participates)) {
                throw invalid("At least one Occupation role must have questions");
            }
            coverage.validate(roles);
            return new BlueprintDraft(draft.name(), occupation.id(), occupation.name(), roles);
        } catch (DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, failure.getMessage());
        }
    }

    private List<RoleConfig> normalizeRoles(List<RoleConfig> submitted, CatalogOccupation occupation) {
        Map<String, CatalogRole> catalogRoles = uniqueById(occupation.roles(), CatalogRole::id, "catalog roles");
        if (catalogRoles.isEmpty()) {
            throw failure("Occupation has no available roles: " + occupation.id());
        }
        Map<String, RoleConfig> submittedRoles = uniqueById(submitted, RoleConfig::roleId, "submitted roles");
        requireExactIds("role", catalogRoles.keySet(), submittedRoles.keySet());
        return catalogRoles.values().stream()
                .sorted(Comparator.comparing(CatalogRole::id))
                .map(role -> normalizeRole(role, submittedRoles.get(role.id())))
                .toList();
    }

    private RoleConfig normalizeRole(CatalogRole catalogRole, RoleConfig submittedRole) {
        Map<String, CatalogSkill> catalogSkills = uniqueById(
                catalogRole.skills(), CatalogSkill::id, "catalog skills for role " + catalogRole.id());
        if (catalogSkills.isEmpty()) {
            throw failure("Target role has no resolvable MicroSkills: " + catalogRole.id());
        }
        Map<String, SkillConfig> submittedSkills = uniqueById(
                submittedRole.skills(), SkillConfig::microSkillId,
                "submitted skills for role " + catalogRole.id());
        requireExactIds("MicroSkill for role " + catalogRole.id(),
                catalogSkills.keySet(), submittedSkills.keySet());
        List<SkillConfig> normalizedSkills = catalogSkills.values().stream()
                .sorted(Comparator.comparing(CatalogSkill::id))
                .map(skill -> {
                    SkillConfig counts = submittedSkills.get(skill.id());
                    return new SkillConfig(skill.id(), skill.name(), counts.easyQuestionCount(),
                            counts.mediumQuestionCount(), counts.hardQuestionCount());
                })
                .toList();
        validateMinimumCounts(catalogRole.id(), normalizedSkills);
        RoleConfig normalized = new RoleConfig(
                catalogRole.id(), catalogRole.name(), hasQuestions(normalizedSkills),
                submittedRole.easyScoreWeight(), submittedRole.mediumScoreWeight(),
                submittedRole.hardScoreWeight(), normalizedSkills);
        validateWeights(normalized);
        return normalized;
    }

    private static void validateWeights(RoleConfig role) {
        if (!role.participates()) {
            return;
        }
        Map<Difficulty, Integer> counts = new EnumMap<>(Difficulty.class);
        for (Difficulty difficulty : Difficulty.values()) {
            counts.put(difficulty, role.skills().stream().mapToInt(skill -> required(skill, difficulty)).sum());
        }
        BigDecimal usedWeight = BigDecimal.ZERO;
        for (Difficulty difficulty : Difficulty.values()) {
            BigDecimal weight = weight(role, difficulty);
            if (counts.get(difficulty) == 0 && weight.signum() != 0) {
                throw invalid("Unused difficulty weight must be zero for role " + role.roleId()
                        + ": " + difficulty.name());
            }
            if (counts.get(difficulty) > 0) {
                usedWeight = usedWeight.add(weight);
            }
        }
        if (usedWeight.compareTo(BigDecimal.ONE) != 0) {
            throw invalid("Used difficulty weights must total one for role " + role.roleId());
        }
        if (role.easyScoreWeight().compareTo(MINIMUM_PARTICIPATING_WEIGHT) < 0
                || role.mediumScoreWeight().compareTo(role.easyScoreWeight()) <= 0
                || role.hardScoreWeight().compareTo(role.mediumScoreWeight()) <= 0) {
            throw invalid("Participating role weights must satisfy hard > medium > easy >= 0.01 for role "
                    + role.roleId());
        }
    }

    private static void validateMinimumCounts(String roleId, List<SkillConfig> skills) {
        if (skills.stream().noneMatch(skill -> skill.totalQuestionCount() > 0)) {
            return;
        }
        for (SkillConfig skill : skills) {
            if (skill.easyQuestionCount() < 1
                    || skill.mediumQuestionCount() < 1
                    || skill.hardQuestionCount() < 1) {
                throw invalid("Participating role requires at least one question per MicroSkill and difficulty: role="
                        + roleId + ", microSkill=" + skill.microSkillId());
            }
        }
    }

    private static BigDecimal weight(RoleConfig role, Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> role.easyScoreWeight();
            case MEDIUM -> role.mediumScoreWeight();
            case HARD -> role.hardScoreWeight();
        };
    }

    private static int required(SkillConfig skill, Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> skill.easyQuestionCount();
            case MEDIUM -> skill.mediumQuestionCount();
            case HARD -> skill.hardQuestionCount();
        };
    }

    private static boolean hasQuestions(List<SkillConfig> skills) {
        return skills.stream().anyMatch(skill -> skill.totalQuestionCount() > 0);
    }

    private static <T> Map<String, T> uniqueById(
            List<T> values, Function<T, String> id, String label) {
        Map<String, T> result = new LinkedHashMap<>();
        for (T value : values) {
            String key = id.apply(value);
            if (result.put(key, value) != null) {
                throw failure(label + " contain duplicate ID: " + key);
            }
        }
        return result;
    }

    private static void requireExactIds(String label, Set<String> expected, Set<String> actual) {
        Set<String> missing = new LinkedHashSet<>(expected);
        missing.removeAll(actual);
        Set<String> unexpected = new LinkedHashSet<>(actual);
        unexpected.removeAll(expected);
        if (!missing.isEmpty() || !unexpected.isEmpty()) {
            throw failure(label + " membership mismatch; missing=" + sorted(missing)
                    + ", unexpected=" + sorted(unexpected));
        }
    }

    private static List<String> sorted(Set<String> values) {
        return values.stream().sorted().toList();
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw invalid(field + " must not be blank");
        }
        return value.strip();
    }

    private static Failure failure(String message) {
        return new Failure(Code.CATALOG_REFERENCE_INVALID, message);
    }

    private static Failure invalid(String message) {
        return new Failure(Code.INVALID_REQUEST, message);
    }

}
