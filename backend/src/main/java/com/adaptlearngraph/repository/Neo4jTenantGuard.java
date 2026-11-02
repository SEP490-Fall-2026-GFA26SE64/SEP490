package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.CrossTenantWriteException;
import java.util.Map;
import java.util.Set;
import org.neo4j.driver.SimpleQueryRunner;

/** Organization ownership checks shared by Neo4j catalog writers. */
public final class Neo4jTenantGuard {
    private static final Set<String> LABELS = Set.of(
            "Occupation", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule", "MacroCompetency");

    private Neo4jTenantGuard() {
    }

    public static String requireOrganization(String organizationId) {
        if (organizationId == null || organizationId.isBlank()) throw new CrossTenantWriteException();
        return organizationId;
    }

    /** Rejects a write whose node id already exists under a different (or no) organization. */
    public static void requireOwnedOrAbsent(SimpleQueryRunner runner, String label, String id, String organizationId) {
        if (!LABELS.contains(label)) throw new IllegalArgumentException("Unsupported catalog label");
        requireOrganization(organizationId);
        if (id == null || id.isBlank()) return;
        boolean foreign = runner.run("MATCH (n:" + label + " {id:$id}) WHERE coalesce(n.organizationId, '') <> $organization "
                        + "RETURN count(n) > 0 AS foreign", Map.of("id", id, "organization", organizationId))
                .single().get("foreign").asBoolean();
        if (foreign) throw new CrossTenantWriteException();
    }
}
