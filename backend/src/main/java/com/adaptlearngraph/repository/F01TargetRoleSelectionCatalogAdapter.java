package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.TargetRoleQueryException;
import com.adaptlearngraph.entities.TargetRoleDetail;
import com.adaptlearngraph.entities.TargetRoleSnapshot;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.PageRequest;

/** Joins the F01 availability view with the published PostgreSQL catalog reference. */
public final class F01TargetRoleSelectionCatalogAdapter implements TargetRoleSelectionCatalogPort {
    private final TargetRoleCatalogPort catalog;
    private final CatalogGuardJpaRepository references;

    public F01TargetRoleSelectionCatalogAdapter(
            TargetRoleCatalogPort catalog,
            CatalogGuardJpaRepository references) {
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
        this.references = Objects.requireNonNull(references, "references must not be null");
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
            List<UUID> references = this.references.openTargetRoleReferences(roleId, PageRequest.of(0, 2));
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
                    TargetRoleSnapshot.CareerTrack.valueOf(role.track().name()));
        } catch (IllegalArgumentException incompatibleCatalogValue) {
            throw unavailable("F01 target-role values are incompatible with F02", incompatibleCatalogValue);
        }
    }

    private static CatalogUnavailableException unavailable(String message, RuntimeException cause) {
        return new CatalogUnavailableException(message, cause);
    }
}
