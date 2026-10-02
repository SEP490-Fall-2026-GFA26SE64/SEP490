package com.adaptlearngraph.pathway.infrastructure;

import java.util.UUID;

/**
 * Resolves human-readable names from the Neo4j catalog graph for pathway view
 * presentation.
 *
 * <p>The catalog is stored in Neo4j; this interface decouples the pathway JDBC adapter
 * from the Neo4j driver so the adapter stays testable without a running graph database.
 */
public interface CatalogNameResolver {

    /**
     * Returns the display name of a target role identified by its stable entity id.
     *
     * @param roleEntityId stable entity id of the TargetRole node.
     * @return human-readable role name, or {@code "Unknown Role"} if not found.
     */
    String resolveRoleName(UUID roleEntityId);

    /**
     * Returns the display title of a learning module identified by its catalog
     * reference id.
     *
     * @param moduleRefId catalog_ref_id of the LEARNING_MODULE catalog reference row.
     * @return human-readable module title, or {@code "Unknown Module"} if not found.
     */
    String resolveModuleTitle(UUID moduleRefId);
}
