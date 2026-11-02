package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.CrossTenantWriteException;
import java.util.Map;
import java.util.Set;
import org.springframework.data.neo4j.core.Neo4jClient;

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

    /**
     * Rejects a write whose node id already exists under a different (or no) organization. The lookup joins the caller's
     * {@code neo4jTransactionManager} transaction, so the guard and the guarded write commit or roll back together.
     */
    public static void requireOwnedOrAbsent(Neo4jClient client, String label, String id, String organizationId) {
        if (!requiresLookup(label, id, organizationId)) return;
        boolean foreign = client.query(foreignOwnerQuery(label)).bindAll(Map.of("id", id, "organization", organizationId))
                .fetchAs(Boolean.class).mappedBy((types, row) -> row.get("foreign").asBoolean()).one().orElseThrow();
        if (foreign) throw new CrossTenantWriteException();
    }

    private static boolean requiresLookup(String label, String id, String organizationId) {
        if (!LABELS.contains(label)) throw new IllegalArgumentException("Unsupported catalog label");
        requireOrganization(organizationId);
        return id != null && !id.isBlank();
    }

    // The label is interpolated (Cypher cannot parameterize labels) but only after the allow-list check above.
    private static String foreignOwnerQuery(String label) {
        return "MATCH (n:" + label + " {id:$id}) WHERE coalesce(n.organizationId, '') <> $organization "
                + "RETURN count(n) > 0 AS foreign";
    }
}