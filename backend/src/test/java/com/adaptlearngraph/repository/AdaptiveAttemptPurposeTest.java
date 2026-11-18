package com.adaptlearngraph.repository;
import com.adaptlearngraph.entities.domain.AdaptiveAttemptSnapshot.Purpose;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class AdaptiveAttemptPurposeTest {
    @Test void renamedExplorationKeepsHistoricalDatabaseCodeAndCurrentPublicName() {
        assertEquals("OCCUPATION_EXPLORATION", AdaptiveAttemptRows.storedPurpose(Purpose.JOB_POSITION_EXPLORATION));
        assertEquals(Purpose.JOB_POSITION_EXPLORATION, AdaptiveAttemptRows.publicPurpose("OCCUPATION_EXPLORATION"));
        assertEquals(Purpose.JOB_POSITION_EXPLORATION, AdaptiveAttemptRows.publicPurpose("JOB_POSITION_EXPLORATION"));
        assertEquals(Purpose.ROLE_REQUIREMENT, AdaptiveAttemptRows.publicPurpose("ROLE_REQUIREMENT"));
        assertThrows(IllegalArgumentException.class, () -> AdaptiveAttemptRows.publicPurpose("unknown"));
    }
}
