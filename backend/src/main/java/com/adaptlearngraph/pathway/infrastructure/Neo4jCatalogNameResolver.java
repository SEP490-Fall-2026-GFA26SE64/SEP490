package com.adaptlearngraph.pathway.infrastructure;

import org.neo4j.driver.Driver;

import java.util.Map;
import java.util.UUID;

/**
 * Neo4j-backed implementation of {@link CatalogNameResolver}.
 *
 * <p>Queries the Neo4j catalog graph for node display names. Returns safe fallback
 * strings when a node cannot be found (e.g. during a catalog migration).
 *
 * <p>Both queries use the {@code entity_id} property present on all catalog nodes as
 * a stable, cross-release identifier aligned with the {@code catalog_reference.entity_id}
 * column in PostgreSQL.
 */
public final class Neo4jCatalogNameResolver implements CatalogNameResolver {

    private final Driver driver;

    public Neo4jCatalogNameResolver(Driver driver) {
        this.driver = driver;
    }

    @Override
    public String resolveRoleName(UUID roleEntityId) {
        if (roleEntityId == null) return null;
        try (var session = driver.session()) {
            var result = session.run(
                    "MATCH (r:TargetRole {entity_id: $entityId}) RETURN r.name AS name LIMIT 1",
                    Map.of("entityId", roleEntityId.toString()));
            if (result.hasNext()) {
                var name = result.next().get("name");
                if (!name.isNull()) return name.asString();
            }
        }
        return "Unknown Role";
    }

    @Override
    public String resolveModuleTitle(UUID moduleRefId) {
        if (moduleRefId == null) return null;
        try (var session = driver.session()) {
            // The catalog_ref_id is stored as catalog_ref_id property on module nodes
            // to allow direct look up from the PostgreSQL ref without a JOIN.
            var result = session.run(
                    "MATCH (m:LearningModule {catalog_ref_id: $refId}) RETURN m.title AS title LIMIT 1",
                    Map.of("refId", moduleRefId.toString()));
            if (result.hasNext()) {
                var title = result.next().get("title");
                if (!title.isNull()) return title.asString();
            }
        }
        return "Unknown Module";
    }
}
