package com.adaptlearngraph.catalog.domain;

import java.util.Objects;
import java.util.UUID;

public record TargetRoleId(UUID value) {
    public TargetRoleId {
        Objects.requireNonNull(value, "TargetRoleId value cannot be null");
    }

    public static TargetRoleId generate() {
        return new TargetRoleId(UUID.randomUUID());
    }

    public static TargetRoleId fromString(String id) {
        Objects.requireNonNull(id, "id string cannot be null");
        return new TargetRoleId(UUID.fromString(id));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
