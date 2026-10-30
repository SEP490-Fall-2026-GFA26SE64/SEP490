package com.adaptlearngraph.learning.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.CareerTrack;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.Seniority;
import com.adaptlearngraph.learning.domain.TargetSelectionDecision.Kind;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TargetRoleSelectionDomainTest {
    private static final UUID LEARNER_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID ROLE_REFERENCE_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID ROLE_A_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final UUID ROLE_B_ID = UUID.fromString("30000000-0000-0000-0000-000000000002");
    private static final UUID SELECTION_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");
    private static final Instant SELECTED_AT = Instant.parse("2026-10-01T01:00:00Z");

    @Test
    void snapshotNormalizesTextAndRequiresTrackCompatibleSeniority() {
        var snapshot = new TargetRoleSnapshot(
                ROLE_A_ID, " JAVA_P3 ", " Java Developer ", CareerTrack.PROFESSIONAL, Seniority.P3);

        assertThat(snapshot.code()).isEqualTo("JAVA_P3");
        assertThat(snapshot.name()).isEqualTo("Java Developer");
        assertThatThrownBy(() -> new TargetRoleSnapshot(
                ROLE_A_ID, "JAVA_P3", "Java Developer", CareerTrack.MANAGEMENT, Seniority.P3))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("seniority must match track");
    }

    @Test
    void selectionRequiresValidIdentityRevisionAndChronology() {
        assertThatThrownBy(() -> new TargetRoleSelection(
                new UUID(0L, 0L), LEARNER_ID, ROLE_REFERENCE_ID, role(ROLE_A_ID),
                SELECTED_AT, null, 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("selectionId must not be the nil UUID");
        assertThatThrownBy(() -> new TargetRoleSelection(
                SELECTION_ID, LEARNER_ID, ROLE_REFERENCE_ID, role(ROLE_A_ID),
                SELECTED_AT, null, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("targetRevision must be positive");
        assertThatThrownBy(() -> new TargetRoleSelection(
                SELECTION_ID, LEARNER_ID, ROLE_REFERENCE_ID, role(ROLE_A_ID),
                SELECTED_AT, SELECTED_AT.minusSeconds(1), 1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("endedAt must not be before selectedAt");
    }

    @Test
    void activeSelectionCanEndOnceWithoutChangingItsSnapshotOrRevision() {
        var active = activeSelection();
        var endedAt = SELECTED_AT.plusSeconds(60);

        var ended = active.endAt(endedAt);

        assertThat(active.isActive()).isTrue();
        assertThat(ended.isActive()).isFalse();
        assertThat(ended.endedAt()).isEqualTo(endedAt);
        assertThat(ended.roleSnapshot()).isSameAs(active.roleSnapshot());
        assertThat(ended.targetRevision()).isEqualTo(1);
        assertThatThrownBy(() -> ended.endAt(endedAt.plusSeconds(1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("selection has already ended");
    }

    @Test
    void decisionDistinguishesInitialNoOpAndChange() {
        var current = activeSelection();

        var initial = TargetSelectionDecision.decide(null, role(ROLE_A_ID));
        var noOp = TargetSelectionDecision.decide(current, role(ROLE_A_ID));
        var change = TargetSelectionDecision.decide(current, role(ROLE_B_ID));

        assertThat(initial.kind()).isEqualTo(Kind.INITIAL);
        assertThat(initial.changesState()).isTrue();
        assertThat(noOp.kind()).isEqualTo(Kind.NO_OP);
        assertThat(noOp.changesState()).isFalse();
        assertThat(change.kind()).isEqualTo(Kind.CHANGE);
        assertThat(change.changesState()).isTrue();
    }

    @Test
    void decisionRejectsAnEndedCurrentSelection() {
        var ended = activeSelection().endAt(SELECTED_AT.plusSeconds(1));

        assertThatThrownBy(() -> TargetSelectionDecision.decide(ended, role(ROLE_B_ID)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("currentSelection must be active");
    }

    private static TargetRoleSelection activeSelection() {
        return new TargetRoleSelection(
                SELECTION_ID, LEARNER_ID, ROLE_REFERENCE_ID, role(ROLE_A_ID),
                SELECTED_AT, null, 1);
    }

    private static TargetRoleSnapshot role(UUID roleId) {
        return new TargetRoleSnapshot(
                roleId, "JAVA_P3", "Java Developer", CareerTrack.PROFESSIONAL, Seniority.P3);
    }
}
