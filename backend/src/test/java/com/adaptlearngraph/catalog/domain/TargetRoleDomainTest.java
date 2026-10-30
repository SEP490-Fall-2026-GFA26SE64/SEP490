package com.adaptlearngraph.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class TargetRoleDomainTest {
    @Test
    void acceptsTrackCompatibleGradesAndNormalizesText() {
        var professional = new TargetRoleSummary(
                " role-p3 ", " JAVA_P3 ", " Java Developer ",
                CareerTrack.PROFESSIONAL, Seniority.P3, " Backend role ", 2);
        var management = new TargetRoleSummary(
                "role-m3", "ENG_MANAGER", "Engineering Manager",
                CareerTrack.MANAGEMENT, Seniority.M3, null, 1);

        assertThat(professional.id()).isEqualTo("role-p3");
        assertThat(professional.code()).isEqualTo("JAVA_P3");
        assertThat(professional.description()).isEqualTo("Backend role");
        assertThat(management.seniority().track()).isEqualTo(CareerTrack.MANAGEMENT);
    }

    @Test
    void rejectsGradeFromAnotherCareerTrack() {
        assertThatThrownBy(() -> new TargetRoleSummary(
                "role-1", "ROLE_1", "Role 1",
                CareerTrack.MANAGEMENT, Seniority.P3, null, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("seniority must match track");
    }

    @Test
    void detailCopiesCollectionsAndRequiresAtLeastOneSkill() {
        var responsibilities = new java.util.ArrayList<>(List.of(" Build APIs "));
        var requirement = new TargetRoleRequirement("skill-1", "JAVA", "Java", 0.7);
        var detail = new TargetRoleDetail(
                "role-1", "JAVA_P3", "Java Developer", "JAVA",
                CareerTrack.PROFESSIONAL, Seniority.P3, " ", responsibilities, List.of(requirement));

        responsibilities.add("Mutated later");

        assertThat(detail.description()).isNull();
        assertThat(detail.responsibilities()).containsExactly("Build APIs");
        assertThat(detail.requirements()).containsExactly(requirement);
        assertThatThrownBy(() -> new TargetRoleDetail(
                "role-1", "JAVA_P3", "Java Developer", "JAVA",
                CareerTrack.PROFESSIONAL, Seniority.P3, null, List.of(), List.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("requirements must not be empty");
    }

    @ParameterizedTest
    @ValueSource(doubles = {-0.01, 1.01, Double.NaN, Double.POSITIVE_INFINITY})
    void rejectsInvalidTargetMastery(double targetMastery) {
        assertThatThrownBy(() -> new TargetRoleRequirement("skill-1", "JAVA", "Java", targetMastery))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("targetMastery must be a finite value in [0,1]");
    }

    @Test
    void acceptsTargetMasteryBoundaries() {
        assertThat(new TargetRoleRequirement("skill-0", "S0", "Skill 0", 0.0).targetMastery())
                .isZero();
        assertThat(new TargetRoleRequirement("skill-1", "S1", "Skill 1", 1.0).targetMastery())
                .isEqualTo(1.0);
    }

    @Test
    void rejectsBlankRequiredFieldsAndEmptySummaryRequirements() {
        assertThatThrownBy(() -> new TargetRoleRequirement(" ", "JAVA", "Java", 0.5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("skillId must not be blank");
        assertThatThrownBy(() -> new TargetRoleSummary(
                "role-1", "ROLE_1", "Role 1",
                CareerTrack.PROFESSIONAL, Seniority.P1, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("requirementCount must be at least 1");
    }
}
