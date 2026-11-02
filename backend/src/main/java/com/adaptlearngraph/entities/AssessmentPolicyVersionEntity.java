package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_assessment_policy_version: immutable organization policy versions (trigger-enforced). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_assessment_policy_version")
@DynamicInsert
public class AssessmentPolicyVersionEntity {
    @Id
    @Column(name = "policy_version_id")
    private UUID policyVersionId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "version", nullable = false)
    private Long version;
    @Column(name = "schema_version", nullable = false)
    private String schemaVersion;
    @Column(name = "stop_se", nullable = false)
    private Double stopSe;
    @Column(name = "high_confidence_se", nullable = false)
    private Double highConfidenceSe;
    @Column(name = "medium_confidence_se", nullable = false)
    private Double mediumConfidenceSe;
    @Column(name = "k", nullable = false)
    private Double k;
    @Column(name = "configuration_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String configurationHash;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    @Column(name = "created_at")
    private Instant createdAt;

    protected AssessmentPolicyVersionEntity() {
    }

    @SuppressWarnings("java:S107")
    public AssessmentPolicyVersionEntity(UUID policyVersionId, UUID organizationId, long version, String schemaVersion, double stopSe,
            double highConfidenceSe, double mediumConfidenceSe, double k, String configurationHash, UUID createdBy) {
        this.policyVersionId = policyVersionId;
        this.organizationId = organizationId;
        this.version = version;
        this.schemaVersion = schemaVersion;
        this.stopSe = stopSe;
        this.highConfidenceSe = highConfidenceSe;
        this.mediumConfidenceSe = mediumConfidenceSe;
        this.k = k;
        this.configurationHash = configurationHash;
        this.createdBy = createdBy;
    }

    public UUID getPolicyVersionId() { return policyVersionId; }
    public UUID getOrganizationId() { return organizationId; }
    public Long getVersion() { return version; }
    public String getSchemaVersion() { return schemaVersion; }
    public Double getStopSe() { return stopSe; }
    public Double getHighConfidenceSe() { return highConfidenceSe; }
    public Double getMediumConfidenceSe() { return mediumConfidenceSe; }
    public Double getK() { return k; }
    public String getConfigurationHash() { return configurationHash; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}