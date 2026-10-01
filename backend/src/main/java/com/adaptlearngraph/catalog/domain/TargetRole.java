package com.adaptlearngraph.catalog.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

public final class TargetRole {
    private final TargetRoleId id;
    private final String organizationId;
    private final String code;
    private final String name;
    private final String domainCode;
    private final String familyCode;
    private final RoleTrack track;
    private final Seniority seniority;
    private final String assignedExpertId;
    private final String description;
    private final List<String> responsibilities;
    private final RoleStatus status;
    private final String version;
    private final String skillTargets;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final String rejectionReason;

    public TargetRole(
            TargetRoleId id,
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            Seniority seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason) {
        this.id = Objects.requireNonNull(id, "TargetRole id cannot be null");
        this.organizationId = requireNonBlank(organizationId, "organizationId cannot be blank");
        this.code = normalizeCode(code);
        this.name = requireNonBlank(name, "name cannot be blank").trim();
        this.domainCode = domainCode != null ? domainCode.trim().toUpperCase() : "ICT";
        this.familyCode = familyCode != null ? familyCode.trim().toUpperCase() : "JAVA_BACKEND";
        this.track = Objects.requireNonNullElse(track, RoleTrack.PROFESSIONAL);
        if (seniority != null && !seniority.supportsTrack(this.track)) {
            throw new IllegalArgumentException("Seniority " + seniority + " is not valid for track " + this.track);
        }
        this.seniority = seniority;
        this.assignedExpertId = assignedExpertId != null ? assignedExpertId.trim() : "";
        this.description = description != null ? description.trim() : "";
        this.responsibilities = responsibilities != null ? List.copyOf(responsibilities) : List.of();
        this.status = Objects.requireNonNullElse(status, RoleStatus.DRAFT);
        this.version = (version != null && !version.isBlank()) ? version.trim() : "1.0";
        this.skillTargets = (skillTargets != null && !skillTargets.isBlank()) ? skillTargets.trim() : "[]";
        this.createdAt = Objects.requireNonNullElseGet(createdAt, Instant::now);
        this.updatedAt = Objects.requireNonNullElseGet(updatedAt, Instant::now);
        this.rejectionReason = (rejectionReason != null && !rejectionReason.isBlank()) ? rejectionReason.trim() : null;
    }

    // Backward-compatible constructor with 15 parameters
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
            String version,
            String skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason) {
        this(id, organizationId, code, name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), status, version, skillTargets, createdAt, updatedAt, rejectionReason);
    }

    // Backward-compatible constructor with 14 parameters
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
            String version,
            String skillTargets,
            Instant createdAt,
            Instant updatedAt) {
        this(id, organizationId, code, name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), status, version, skillTargets, createdAt, updatedAt, null);
    }

    // Backward-compatible constructor with 12 parameters
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
        this(id, organizationId, code, name, domainCode, familyCode, track, assignedExpertId, description, status, "1.0", "[]", createdAt, updatedAt, null);
    }

    // Backward-compatible constructor with 10 parameters
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
            Seniority seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            RoleStatus status,
            String skillTargets) {
        Instant now = Instant.now();
        return new TargetRole(
                TargetRoleId.generate(),
                organizationId,
                code,
                name,
                domainCode,
                familyCode,
                track,
                seniority,
                assignedExpertId,
                description,
                responsibilities,
                status != null ? status : RoleStatus.DRAFT,
                version != null && !version.isBlank() ? version.trim() : "1.0",
                skillTargets != null && !skillTargets.isBlank() ? skillTargets.trim() : "[]",
                now,
                now,
                null);
    }

    public static TargetRole createNew(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            String version,
            RoleStatus status,
            String skillTargets) {
        return createNew(organizationId, code, name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), version, status, skillTargets);
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
        return createNew(organizationId, code, name, domainCode, familyCode, track, assignedExpertId, description, "1.0", RoleStatus.DRAFT, "[]");
    }

    public static TargetRole createNew(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description) {
        return createNew(organizationId, code, name, "ICT", familyCode, track, "", description, "1.0", RoleStatus.DRAFT, "[]");
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            Seniority seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        RoleTrack targetTrack = track != null ? track : this.track;
        Seniority targetSeniority = seniority != null ? seniority : this.seniority;
        if (targetSeniority != null && !targetSeniority.supportsTrack(targetTrack)) {
            throw new IllegalArgumentException("Seniority " + targetSeniority + " is not valid for track " + targetTrack);
        }
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                name != null && !name.isBlank() ? name.trim() : this.name,
                domainCode != null && !domainCode.isBlank() ? domainCode.trim().toUpperCase() : this.domainCode,
                familyCode != null && !familyCode.isBlank() ? familyCode.trim().toUpperCase() : this.familyCode,
                targetTrack,
                targetSeniority,
                assignedExpertId != null ? assignedExpertId.trim() : this.assignedExpertId,
                description != null ? description.trim() : this.description,
                responsibilities != null ? List.copyOf(responsibilities) : this.responsibilities,
                status != null ? status : this.status,
                version != null && !version.isBlank() ? version.trim() : this.version,
                skillTargets != null && !skillTargets.isBlank() ? skillTargets.trim() : this.skillTargets,
                this.createdAt,
                Instant.now(),
                rejectionReason != null ? rejectionReason.trim() : this.rejectionReason);
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        return updateDetails(name, domainCode, familyCode, track, this.seniority, assignedExpertId, description, this.responsibilities, status, version, skillTargets, rejectionReason);
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status,
            String version,
            String skillTargets) {
        return updateDetails(name, domainCode, familyCode, track, assignedExpertId, description, status, version, skillTargets, this.rejectionReason);
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status) {
        return updateDetails(name, domainCode, familyCode, track, assignedExpertId, description, status, this.version, this.skillTargets, this.rejectionReason);
    }

    public TargetRole updateDetails(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        return updateDetails(name, domainCode, familyCode, track, assignedExpertId, description, this.status, this.version, this.skillTargets, this.rejectionReason);
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
                this.seniority,
                this.assignedExpertId,
                this.description,
                this.responsibilities,
                RoleStatus.SENT,
                this.version,
                this.skillTargets,
                this.createdAt,
                Instant.now(),
                this.rejectionReason);
    }

    public TargetRole reject(String reason) {
        return new TargetRole(
                this.id,
                this.organizationId,
                this.code,
                this.name,
                this.domainCode,
                this.familyCode,
                this.track,
                this.seniority,
                this.assignedExpertId,
                this.description,
                this.responsibilities,
                RoleStatus.REJECTED,
                this.version,
                this.skillTargets,
                this.createdAt,
                Instant.now(),
                reason);
    }

    public TargetRole reject() {
        return reject(this.rejectionReason);
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
                this.seniority,
                this.assignedExpertId,
                this.description,
                this.responsibilities,
                RoleStatus.ACTIVE,
                this.version,
                this.skillTargets,
                this.createdAt,
                Instant.now(),
                this.rejectionReason);
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

    public Seniority getSeniority() {
        return seniority;
    }

    public String getAssignedExpertId() {
        return assignedExpertId;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getResponsibilities() {
        return responsibilities;
    }

    public RoleStatus getStatus() {
        return status;
    }

    public String getVersion() {
        return version;
    }

    public String getSkillTargets() {
        return skillTargets;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}

