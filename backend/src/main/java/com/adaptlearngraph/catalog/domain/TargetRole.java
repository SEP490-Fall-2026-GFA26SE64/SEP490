package com.adaptlearngraph.catalog.domain;

import java.time.Instant;
import java.util.Objects;

public final class TargetRole {
    private final TargetRoleId id;
    private final String organizationId;
    private final String code;
    private final String name;
    private final String domainCode;
    private final String familyCode;
    private final RoleTrack track;
    private final String assignedExpertId;
    private final String description;
    private final RoleStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TargetRole(
            TargetRoleId id,
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status,
            Instant createdAt,
            Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "TargetRole id cannot be null");
        this.organizationId = requireNonBlank(organizationId, "organizationId cannot be blank");
        this.code = normalizeCode(code);
        this.name = requireNonBlank(name, "name cannot be blank").trim();
        this.domainCode = domainCode != null ? domainCode.trim().toUpperCase() : "ICT";
        this.familyCode = familyCode != null ? familyCode.trim().toUpperCase() : "JAVA_BACKEND";
        this.track = Objects.requireNonNullElse(track, RoleTrack.PROFESSIONAL);
        this.assignedExpertId = assignedExpertId != null ? assignedExpertId.trim() : "";
        this.description = description != null ? description.trim() : "";
        this.status = Objects.requireNonNullElse(status, RoleStatus.DRAFT);
        this.createdAt = Objects.requireNonNullElseGet(createdAt, Instant::now);
        this.updatedAt = Objects.requireNonNullElseGet(updatedAt, Instant::now);
    }

    // Backward-compatible constructor
    public TargetRole(
            TargetRoleId id,
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description,
            RoleStatus status,
            Instant createdAt,
            Instant updatedAt) {
        this(id, organizationId, code, name, "ICT", familyCode, track, "", description, status, createdAt, updatedAt);
    }

    public static TargetRole createNew(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        Instant now = Instant.now();
        return new TargetRole(
                TargetRoleId.generate(),
                organizationId,
                code,
                name,
                domainCode,
                familyCode,
                track,
                assignedExpertId,
                description,
                RoleStatus.DRAFT,
                now,
                now);
    }

    public static TargetRole createNew(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description) {
        return createNew(organizationId, code, name, "ICT", familyCode, track, "", description);
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                name,
                domainCode,
                familyCode,
                track,
                assignedExpertId,
                description,
                this.status,
                this.createdAt,
                Instant.now());
    }

    public TargetRole markSent() {
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                this.name,
                this.domainCode,
                this.familyCode,
                this.track,
                this.assignedExpertId,
                this.description,
                RoleStatus.SENT,
                this.createdAt,
                Instant.now());
    }

    public TargetRole reject() {
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                this.name,
                this.domainCode,
                this.familyCode,
                this.track,
                this.assignedExpertId,
                this.description,
                RoleStatus.REJECTED,
                this.createdAt,
                Instant.now());
    }

    public TargetRole publish() {
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                this.name,
                this.domainCode,
                this.familyCode,
                this.track,
                this.assignedExpertId,
                this.description,
                RoleStatus.ACTIVE,
                this.createdAt,
                Instant.now());
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

    public TargetRoleId getId() {
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

    public String getDomainCode() {
        return domainCode;
    }

    public String getFamilyCode() {
        return familyCode;
    }

    public RoleTrack getTrack() {
        return track;
    }

    public String getAssignedExpertId() {
        return assignedExpertId;
    }

    public String getDescription() {
        return description;
    }

    public RoleStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

