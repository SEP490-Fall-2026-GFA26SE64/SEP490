package com.adaptlearngraph.learning.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Provisional assessment dependency contract; does not require Docker or prove owner integration. */
class ConfiguredAssessmentActivityGuardAdapterTest {
    private static final UUID LEARNER_ID = UUID.fromString(
            "00000000-0000-0000-0000-000000000003");

    @Test
    void hasExplicitAllowBlockAndInvalidIdentityBehavior() {
        assertThat(new ConfiguredAssessmentActivityGuardAdapter(false)
                .hasBlockingAssessment(LEARNER_ID)).isFalse();
        assertThat(new ConfiguredAssessmentActivityGuardAdapter(true)
                .hasBlockingAssessment(LEARNER_ID)).isTrue();
        assertThatThrownBy(() -> new ConfiguredAssessmentActivityGuardAdapter(false)
                .hasBlockingAssessment(new UUID(0L, 0L)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
