package com.adaptlearngraph.competency.domain;

import java.util.Objects;
import java.util.UUID;

public record MicroSkillId(UUID value) {
    public MicroSkillId {
        Objects.requireNonNull(value, "MicroSkillId value cannot be null");
    }

    public static MicroSkillId generate() {
        return new MicroSkillId(UUID.randomUUID());
    }

    public static MicroSkillId fromString(String id) {
        Objects.requireNonNull(id, "id string cannot be null");
        return new MicroSkillId(UUID.fromString(id));
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
