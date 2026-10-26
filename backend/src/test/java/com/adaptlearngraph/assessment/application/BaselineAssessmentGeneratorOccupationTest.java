package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.CandidateItem;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore.Difficulty;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** REQ-002-F02 R11/R13 aggregate generation and global no-repeat policy. */
class BaselineAssessmentGeneratorOccupationTest {
    private static final String SKILL = "skill-shared";

    @Test
    void ignoresZeroRoleAndAllocatesUniqueQuestionsAcrossParticipatingRoles() {
        var manifest = BaselineAssessmentGenerator.generate(blueprint(), 42L, List.of(
                candidate(1), candidate(2), candidate(3)));

        assertThat(manifest.items()).hasSize(2);
        assertThat(manifest.items()).extracting(item -> item.roleId())
                .containsExactly("role-a", "role-b");
        assertThat(manifest.items()).extracting(item -> item.candidate().itemVersionId())
                .doesNotHaveDuplicates();
        assertThat(manifest.items()).noneMatch(item -> item.roleId().equals("role-zero"));
        assertThat(manifest.contentHash()).matches("[0-9a-f]{64}");
    }

    @Test
    void reportsAggregateShortageWithEveryRoleContribution() {
        assertThatThrownBy(() -> BaselineAssessmentGenerator.generate(
                blueprint(), 42L, List.of(candidate(1))))
                .isInstanceOfSatisfying(Failure.class, failure -> {
                    assertThat(failure.code()).isEqualTo(Code.INSUFFICIENT_QUESTION_COVERAGE);
                    assertThat(failure.coverageShortages()).singleElement().satisfies(shortage -> {
                        assertThat(shortage.roleId()).isNull();
                        assertThat(shortage.required()).isEqualTo(2);
                        assertThat(shortage.available()).isOne();
                        assertThat(shortage.roleRequirements())
                                .extracting(item -> item.roleId() + ":" + item.required())
                                .containsExactly("role-a:1", "role-b:1");
                    });
                });
    }

    private static BaselineBlueprint blueprint() {
        return new BaselineBlueprint(
                new UUID(0, 10), 1, "Engineering baseline", "occupation-engineering",
                "Software Engineering", new UUID(0, 11), "key", "hash",
                Instant.parse("2026-10-15T10:00:00Z"),
                List.of(role("role-a", 1), role("role-b", 1), role("role-zero", 0)));
    }

    private static RoleConfig role(String id, int easy) {
        return new RoleConfig(id, id, easy > 0,
                easy > 0 ? BigDecimal.ONE : new BigDecimal("0.3"),
                easy > 0 ? BigDecimal.ZERO : new BigDecimal("0.4"),
                easy > 0 ? BigDecimal.ZERO : new BigDecimal("0.3"),
                List.of(new SkillConfig(SKILL, "Shared Engineering", easy, 0, 0)));
    }

    private static CandidateItem candidate(long id) {
        return new CandidateItem(new UUID(0, id), SKILL, "Shared Engineering", Difficulty.EASY,
                "hash-" + id, "Question " + id, "{\"type\":\"single-choice\"}");
    }
}
