package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Joins the F01 availability view with the published PostgreSQL catalog reference. */
public final class F01TargetRoleSelectionCatalogAdapter implements TargetRoleSelectionCatalogPort {
    private static final String FIND_REFERENCE_SQL = """
            SELECT reference.catalog_ref_id
            FROM platform.catalog_guard guard
            JOIN platform.catalog_reference reference
              ON reference.release_id = guard.release_id
            WHERE guard.guard_id = 1
              AND guard.state = 'OPEN'
              AND reference.kind = 'TARGET_ROLE'
              AND reference.entity_id = :roleId
            ORDER BY reference.confirmed_at DESC, reference.catalog_ref_id
            LIMIT 2
            """;

    private final TargetRoleCatalogPort catalog;
    private final NamedParameterJdbcTemplate jdbc;

    public F01TargetRoleSelectionCatalogAdapter(
            TargetRoleCatalogPort catalog,
            NamedParameterJdbcTemplate jdbc) {
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc must not be null");
    }

    @Override
    public Optional<SelectableTargetRole> findSelectableRole(UUID organizationId, UUID roleId) {
        Objects.requireNonNull(organizationId, "organizationId must not be null");
        Objects.requireNonNull(roleId, "roleId must not be null");

        TargetRoleDetail role;
        try {
            Optional<TargetRoleDetail> available =
                    catalog.findAvailableRole(organizationId.toString(), roleId.toString());
            if (available.isEmpty()) {
                return Optional.empty();
            }
            role = available.orElseThrow();
        } catch (TargetRoleQueryException unavailable) {
            throw unavailable("F01 target-role catalog is unavailable", unavailable);
        }

        TargetRoleSnapshot snapshot = mapSnapshot(roleId, role);
        UUID referenceId = resolveReference(roleId);
        return Optional.of(new SelectableTargetRole(referenceId, snapshot));
    }

    private UUID resolveReference(UUID roleId) {
        try {
            List<UUID> references = jdbc.query(
                    FIND_REFERENCE_SQL,
                    Map.of("roleId", roleId),
                    (resultSet, rowNumber) -> resultSet.getObject("catalog_ref_id", UUID.class));
            if (references.size() != 1) {
                throw unavailable(
                        "Published catalog reference does not uniquely match the available target role",
                        new IllegalStateException("Expected one TARGET_ROLE reference but found " + references.size()));
            }
            return references.getFirst();
        } catch (DataAccessException databaseFailure) {
            throw unavailable("PostgreSQL catalog reference is unavailable", databaseFailure);
        }
    }

    private static TargetRoleSnapshot mapSnapshot(UUID requestedRoleId, TargetRoleDetail role) {
        UUID actualRoleId;
        try {
            actualRoleId = UUID.fromString(role.id());
        } catch (IllegalArgumentException invalidId) {
            throw unavailable("F01 returned a malformed target-role identity", invalidId);
        }
        if (!requestedRoleId.equals(actualRoleId)) {
            throw unavailable(
                    "F01 returned a target role that does not match the requested identity",
                    new IllegalStateException("Target-role identity mismatch"));
        }

        try {
            return new TargetRoleSnapshot(
                    actualRoleId,
                    role.code(),
                    role.name(),
                    TargetRoleSnapshot.CareerTrack.valueOf(role.track().name()),
                    TargetRoleSnapshot.Seniority.valueOf(role.seniority().name()));
        } catch (IllegalArgumentException incompatibleCatalogValue) {
            throw unavailable("F01 target-role values are incompatible with F02", incompatibleCatalogValue);
        }
    }

    private static CatalogUnavailableException unavailable(String message, RuntimeException cause) {
        return new CatalogUnavailableException(message, cause);
    }
}
