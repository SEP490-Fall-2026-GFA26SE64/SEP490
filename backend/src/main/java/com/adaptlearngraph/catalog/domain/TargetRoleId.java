package com.adaptlearngraph.catalog.domain;

import java.util.Objects;
import java.util.UUID;

public record TargetRoleId(String value) {
    public TargetRoleId {
        Objects.requireNonNull(value, "TargetRoleId value cannot be null");
    }

    public TargetRoleId(UUID uuid) {
        this(Objects.requireNonNull(uuid, "UUID cannot be null").toString());
    }

    public static TargetRoleId generate() {
        return new TargetRoleId(UUID.randomUUID().toString());
    }

    public static TargetRoleId fromString(String id) {
        Objects.requireNonNull(id, "id string cannot be null");
        return new TargetRoleId(id);
    }

    @Override
    public String toString() {
        return value;
    }
}
