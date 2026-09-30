package com.adaptlearngraph.competency.domain;

import java.time.Instant;
import java.util.Objects;

public final class MicroSkill {
    private final MicroSkillId id;
    private final String organizationId;
    private final String code;
    private final String name;
    private final String description;
    private final String macroCompetencyCode;
    private final SkillStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;

    public MicroSkill(
            MicroSkillId id,
            String organizationId,
            String code,
            String name,
            String description,
            String macroCompetencyCode,
            SkillStatus status,
            Instant createdAt,
            Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "MicroSkill id cannot be null");
        this.organizationId = requireNonBlank(organizationId, "organizationId cannot be blank");
        this.code = normalizeCode(code);
        this.name = requireNonBlank(name, "name cannot be blank").trim();
        this.description = description != null ? description.trim() : "";
        this.macroCompetencyCode = Objects.requireNonNullElse(macroCompetencyCode, "KNOWLEDGE").trim().toUpperCase();
        this.status = Objects.requireNonNullElse(status, SkillStatus.ACTIVE);
        this.createdAt = Objects.requireNonNullElseGet(createdAt, Instant::now);
        this.updatedAt = Objects.requireNonNullElseGet(updatedAt, Instant::now);
    }

    public static MicroSkill createNew(
            String organizationId,
            String code,
            String name,
            String description,
            String macroCompetencyCode) {
        Instant now = Instant.now();
        return new MicroSkill(
                MicroSkillId.generate(),
                organizationId,
                code,
                name,
                description,
                macroCompetencyCode,
                SkillStatus.ACTIVE,
                now,
                now);
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private static String normalizeCode(String code) {
        requireNonBlank(code, "code cannot be blank");
        return code.trim().toUpperCase();
    }

    public MicroSkillId getId() {
        return id;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getMacroCompetencyCode() {
        return macroCompetencyCode;
    }

    public SkillStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
