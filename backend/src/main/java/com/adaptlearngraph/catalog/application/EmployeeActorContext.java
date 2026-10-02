package com.adaptlearngraph.catalog.application;

import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** Trusted actor data supplied by the identity boundary, never by the client request. */
public record EmployeeActorContext(
        String accountId,
        String organizationId,
        boolean active,
        Set<String> roles) {

    public EmployeeActorContext {
        accountId = requireText(accountId, "accountId");
        organizationId = requireText(organizationId, "organizationId");
        Objects.requireNonNull(roles, "roles must not be null");
        roles = roles.stream()
                .map(role -> requireText(role, "role").toUpperCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isActiveEmployee() {
        return active && roles.contains("EMPLOYEE");
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }
}
