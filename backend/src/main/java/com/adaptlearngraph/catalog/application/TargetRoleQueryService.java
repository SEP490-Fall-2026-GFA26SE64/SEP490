package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException.Code;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleQueryUseCase;
import com.adaptlearngraph.catalog.application.port.out.EmployeeContextPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort.Criteria;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public final class TargetRoleQueryService implements TargetRoleQueryUseCase {
    static final int MAX_SEARCH_LENGTH = 100;

    private static final Comparator<TargetRoleSummary> ROLE_ORDER = Comparator
            .comparing((TargetRoleSummary role) -> normalize(role.name()))
            .thenComparing(TargetRoleSummary::id);

    private final EmployeeContextPort employeeContext;
    private final TargetRoleCatalogPort catalog;

    public TargetRoleQueryService(EmployeeContextPort employeeContext, TargetRoleCatalogPort catalog) {
        this.employeeContext = Objects.requireNonNull(employeeContext, "employeeContext must not be null");
        this.catalog = Objects.requireNonNull(catalog, "catalog must not be null");
    }

    @Override
    public List<TargetRoleSummary> listTargetRoles(String search, Seniority seniority) {
        EmployeeActorContext actor = requireActiveEmployee();
        String normalizedSearch = normalizeSearch(search);
        List<TargetRoleSummary> roles = catalog.findAvailableRoles(
                actor.organizationId(), new Criteria(normalizedSearch, seniority));

        if (roles == null) {
            throw new IllegalStateException("catalog must not return null");
        }
        return roles.stream()
                .map(role -> Objects.requireNonNull(role, "catalog role must not be null"))
                .sorted(ROLE_ORDER)
                .toList();
    }

    @Override
    public TargetRoleDetail getTargetRole(String roleId) {
        EmployeeActorContext actor = requireActiveEmployee();
        String validatedRoleId = requireRoleId(roleId);
        return catalog.findAvailableRole(actor.organizationId(), validatedRoleId)
                .orElseThrow(() -> new TargetRoleQueryException(
                        Code.ROLE_NOT_AVAILABLE, "Target role is not available"));
    }

    private EmployeeActorContext requireActiveEmployee() {
        EmployeeActorContext actor = employeeContext.currentActor()
                .orElseThrow(() -> new TargetRoleQueryException(Code.UNAUTHENTICATED, "Authentication is required"));
        if (!actor.isActiveEmployee()) {
            throw new TargetRoleQueryException(Code.FORBIDDEN, "An active employee context is required");
        }
        return actor;
    }

    private static String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String normalized = normalize(search);
        if (normalized.length() > MAX_SEARCH_LENGTH) {
            throw new TargetRoleQueryException(Code.INVALID_REQUEST, "search must not exceed 100 characters");
        }
        return normalized;
    }

    private static String requireRoleId(String roleId) {
        if (roleId == null || roleId.isBlank()) {
            throw new TargetRoleQueryException(Code.INVALID_REQUEST, "roleId must not be blank");
        }
        return roleId.strip();
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value.strip(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    }
}
