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

/** platform.employee_job_position_profile: initial job position mastery profile. */
@Entity
@Immutable
@Table(schema = "platform", name = "employee_job_position_profile")
@IdClass(EmployeeJobPositionProfileEntity.Key.class)
@DynamicInsert
public class EmployeeJobPositionProfileEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "learner_id")
    private UUID learnerId;
    @Id
    @Column(name = "job_position_id")
    private String jobPositionId;
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

    protected EmployeeJobPositionProfileEntity() {
    }

    @SuppressWarnings("java:S107")
    public EmployeeJobPositionProfileEntity(UUID organizationId, UUID learnerId, String jobPositionId, UUID attemptId, UUID blueprintId, Integer blueprintVersion, String catalogFingerprint, String requiredSkills, String mastery, Instant initializedAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.jobPositionId = jobPositionId;
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
    public String getJobPositionId() { return jobPositionId; }
    public UUID getAttemptId() { return attemptId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getCatalogFingerprint() { return catalogFingerprint; }
    public String getRequiredSkills() { return requiredSkills; }
    public String getMastery() { return mastery; }
    public Instant getInitializedAt() { return initializedAt; }

    public record Key(UUID organizationId, UUID learnerId, String jobPositionId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}

