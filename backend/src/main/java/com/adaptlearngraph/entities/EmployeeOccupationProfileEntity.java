package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.employee_occupation_profile: initial occupation mastery profile (trigger employee_occupation_profile_initial_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "employee_occupation_profile")
@IdClass(EmployeeOccupationProfileEntity.Key.class)
@DynamicInsert
public class EmployeeOccupationProfileEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "learner_id")
    private UUID learnerId;
    @Id
    @Column(name = "occupation_id")
    private String occupationId;
    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;
    @Column(name = "blueprint_id", nullable = false)
    private UUID blueprintId;
    @Column(name = "blueprint_version", nullable = false)
    private Integer blueprintVersion;
    @Column(name = "catalog_fingerprint", nullable = false)
    private String catalogFingerprint;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_skills", nullable = false, columnDefinition = "jsonb")
    private String requiredSkills;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "mastery", nullable = false, columnDefinition = "jsonb")
    private String mastery;
    @Column(name = "initialized_at", nullable = false)
    private Instant initializedAt;

    protected EmployeeOccupationProfileEntity() {
    }

    @SuppressWarnings("java:S107")
    public EmployeeOccupationProfileEntity(UUID organizationId, UUID learnerId, String occupationId, UUID attemptId, UUID blueprintId, Integer blueprintVersion, String catalogFingerprint, String requiredSkills, String mastery, Instant initializedAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.occupationId = occupationId;
        this.attemptId = attemptId;
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.catalogFingerprint = catalogFingerprint;
        this.requiredSkills = requiredSkills;
        this.mastery = mastery;
        this.initializedAt = initializedAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public String getOccupationId() { return occupationId; }
    public UUID getAttemptId() { return attemptId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getCatalogFingerprint() { return catalogFingerprint; }
    public String getRequiredSkills() { return requiredSkills; }
    public String getMastery() { return mastery; }
    public Instant getInitializedAt() { return initializedAt; }

    public record Key(UUID organizationId, UUID learnerId, String occupationId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
