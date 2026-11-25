package com.adaptlearngraph.research;

import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RequirementPathway.Provision;
import com.adaptlearngraph.entities.domain.RequirementPathway.Requirement;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class Rq3DistanceTest {
    private static Requirement requirement(String skill, String version) {
        return new Requirement(skill, skill, KnowledgeLevel.FOUNDATION, version, List.of(), Provision.MODULE_ONLY);
    }

    @Test
    void onlyCompatibleOfficialEvidenceForTheFixedTargetReducesDistance() {
        var a = requirement("A", "v2");
        var b = requirement("B", "v2");
        var distance = new Rq3Distance(List.of(a, b, a));
        assertThat(distance.remaining(Set.of(requirement("A", "v1").proofKey(),
                requirement("external-prerequisite", "v2").proofKey()))).isEqualTo(1);
        assertThat(distance.remaining(Set.of(a.proofKey()))).isEqualTo(0.5);
        assertThat(distance.remaining(Set.of(a.proofKey(), b.proofKey()))).isZero();
    }

    @Test
    void emptyTargetCannotProduceAnExperimentScore() {
        assertThatIllegalArgumentException().isThrownBy(() -> new Rq3Distance(List.of()));
    }
}
