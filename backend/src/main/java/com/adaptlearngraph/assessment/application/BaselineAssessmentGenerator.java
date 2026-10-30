package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.CoverageShortage;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.CandidateItem;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.Difficulty;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.NewItem;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Pure selection policy for a generated baseline manifest. */
final class BaselineAssessmentGenerator {
    private BaselineAssessmentGenerator() {}

    static Manifest generate(BaselineBlueprint blueprint, long seed, List<CandidateItem> candidates) {
        Map<CandidateKey, List<CandidateItem>> byRequirement = new HashMap<>();
        for (CandidateItem candidate : candidates) {
            byRequirement.computeIfAbsent(
                    new CandidateKey(candidate.microSkillId(), candidate.difficulty()), ignored -> new ArrayList<>())
                    .add(candidate);
        }
        BaselineAssessmentCandidateCoverageValidator.requireCoverage(blueprint, candidates);
        Set<UUID> used = new HashSet<>();
        List<NewItem> selected = new ArrayList<>();
        List<CoverageShortage> shortages = new ArrayList<>();
        for (BaselineBlueprint.RoleConfig role : blueprint.roles()) {
            if (!role.participates()) {
                continue;
            }
            for (BaselineBlueprint.SkillConfig skill : role.skills()) {
                add(role, skill, Difficulty.EASY, skill.easyQuestionCount(),
                        role.easyScoreWeight(), seed, byRequirement, used, selected, shortages);
                add(role, skill, Difficulty.MEDIUM, skill.mediumQuestionCount(),
                        role.mediumScoreWeight(), seed, byRequirement, used, selected, shortages);
                add(role, skill, Difficulty.HARD, skill.hardQuestionCount(),
                        role.hardScoreWeight(), seed, byRequirement, used, selected, shortages);
            }
        }
        if (!shortages.isEmpty()) {
            throw new Failure(Code.INSUFFICIENT_QUESTION_COVERAGE,
                    "Published question coverage changed after the blueprint was saved", shortages);
        }
        List<NewItem> items = List.copyOf(selected);
        return new Manifest(contentHash(blueprint, items), items);
    }

    private static void add(
            BaselineBlueprint.RoleConfig role,
            BaselineBlueprint.SkillConfig skill,
            Difficulty difficulty,
            int required,
            BigDecimal difficultyWeight,
            long seed,
            Map<CandidateKey, List<CandidateItem>> byRequirement,
            Set<UUID> used,
            List<NewItem> selected,
            List<CoverageShortage> shortages) {
        if (required == 0) {
            return;
        }
        List<CandidateItem> available = byRequirement
                .getOrDefault(new CandidateKey(skill.microSkillId(), difficulty), List.of()).stream()
                .filter(candidate -> !used.contains(candidate.itemVersionId()))
                .sorted(Comparator.comparing(candidate -> hash(
                        seed, role.roleId(), skill.microSkillId(), difficulty, candidate.itemVersionId())))
                .toList();
        if (available.size() < required) {
            shortages.add(new CoverageShortage(
                    role.roleId(), skill.microSkillId(), difficulty.name(), required,
                    available.size(), required - available.size()));
            return;
        }
        List<BigDecimal> weights = distribute(difficultyWeight, required);
        for (int index = 0; index < required; index++) {
            CandidateItem candidate = available.get(index);
            used.add(candidate.itemVersionId());
            selected.add(new NewItem(candidate, role.roleId(), role.roleNameSnapshot(), weights.get(index)));
        }
    }

    private static List<BigDecimal> distribute(BigDecimal total, int count) {
        if (total.signum() == 0) {
            return java.util.Collections.nCopies(count, BigDecimal.ZERO);
        }
        BigDecimal regular = total.divide(BigDecimal.valueOf(count), 12, RoundingMode.HALF_UP);
        List<BigDecimal> weights = new ArrayList<>(java.util.Collections.nCopies(count, regular));
        weights.set(count - 1, total.subtract(regular.multiply(BigDecimal.valueOf(count - 1))));
        return List.copyOf(weights);
    }

    private static String contentHash(BaselineBlueprint blueprint, List<NewItem> items) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, blueprint.blueprintId());
        append(canonical, blueprint.version());
        append(canonical, blueprint.name());
        if (blueprint.occupationId() != null) {
            append(canonical, blueprint.occupationId());
            append(canonical, blueprint.occupationNameSnapshot());
        }
        append(canonical, "BASELINE_BLUEPRINT_WEIGHT_V1");
        int position = 1;
        for (NewItem item : items) {
            append(canonical, position++);
            append(canonical, item.candidate().itemVersionId());
            append(canonical, item.candidate().itemContentHash());
            append(canonical, item.roleId());
            append(canonical, item.roleNameSnapshot());
            append(canonical, item.scoringWeight().stripTrailingZeros().toPlainString());
        }
        return digest(canonical.toString());
    }

    private static String hash(Object... parts) {
        StringBuilder canonical = new StringBuilder();
        for (Object part : parts) {
            append(canonical, part);
        }
        return digest(canonical.toString());
    }

    private static void append(StringBuilder target, Object value) {
        String text = Objects.toString(value, "").strip();
        target.append(text.length()).append(':').append(text).append('|');
    }

    private static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    record Manifest(String contentHash, List<NewItem> items) {}

    private record CandidateKey(String microSkillId, Difficulty difficulty) {}

}
