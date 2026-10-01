package com.adaptlearngraph.competency.domain;

import java.util.Objects;
import java.util.UUID;

public record MicroSkillId(String value) {
    public MicroSkillId {
        Objects.requireNonNull(value, "MicroSkillId value cannot be null");
        if (value.isBlank()) {
            throw new IllegalArgumentException("MicroSkillId cannot be blank");
        }
    }

    public MicroSkillId(UUID uuid) {
        this(Objects.requireNonNull(uuid, "uuid cannot be null").toString());
    }

    public static MicroSkillId generate() {
        return new MicroSkillId(UUID.randomUUID().toString());
    }

    public static MicroSkillId fromString(String id) {
        Objects.requireNonNull(id, "id string cannot be null");
        return new MicroSkillId(id.trim());
    }

    public static MicroSkillId of(UUID uuid) {
        return new MicroSkillId(uuid);
    }

    @Override
    public String toString() {
        return value;
    }
}
