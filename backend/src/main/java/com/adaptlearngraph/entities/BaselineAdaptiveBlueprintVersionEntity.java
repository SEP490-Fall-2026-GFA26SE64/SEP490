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

/** platform.baseline_adaptive_blueprint_version: immutable finalized adaptive Blueprint version. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_adaptive_blueprint_version")
@IdClass(BaselineAdaptiveBlueprintVersionEntity.Key.class)
@DynamicInsert
public class BaselineAdaptiveBlueprintVersionEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Id
    @Column(name = "version")
    private Integer version;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "occupation_id", nullable = false)
    private String occupationId;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "occupation_name_snapshot", nullable = false)
    private String occupationNameSnapshot;
    @Column(name = "catalog_fingerprint", nullable = false)
    private String catalogFingerprint;
    @Column(name = "exploration_max_questions")
    private Integer explorationMaxQuestions;
    @Column(name = "exploration_time_limit_seconds")
    private Integer explorationTimeLimitSeconds;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "mastery_mapping_version_id", nullable = false)
    private UUID masteryMappingVersionId;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "scope_policy")
    private String scopePolicy;
    @Column(name = "occupation_max_questions")
    private Integer occupationMaxQuestions;
    @Column(name = "occupation_time_limit_seconds")
    private Integer occupationTimeLimitSeconds;

    protected BaselineAdaptiveBlueprintVersionEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAdaptiveBlueprintVersionEntity(UUID blueprintId, Integer version, UUID organizationId, String occupationId, String name, String occupationNameSnapshot, String catalogFingerprint, Integer explorationMaxQuestions, Integer explorationTimeLimitSeconds, UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId, UUID createdBy, Instant createdAt, String scopePolicy, Integer occupationMaxQuestions, Integer occupationTimeLimitSeconds) {
        this.blueprintId = blueprintId;
        this.version = version;
        this.organizationId = organizationId;
        this.occupationId = occupationId;
        this.name = name;
        this.occupationNameSnapshot = occupationNameSnapshot;
        this.catalogFingerprint = catalogFingerprint;
        this.explorationMaxQuestions = explorationMaxQuestions;
        this.explorationTimeLimitSeconds = explorationTimeLimitSeconds;
        this.modelVersionId = modelVersionId;
        this.masteryMappingVersionId = masteryMappingVersionId;
        this.parameterSetId = parameterSetId;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.scopePolicy = scopePolicy;
        this.occupationMaxQuestions = occupationMaxQuestions;
        this.occupationTimeLimitSeconds = occupationTimeLimitSeconds;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getVersion() { return version; }
    public UUID getOrganizationId() { return organizationId; }
    public String getOccupationId() { return occupationId; }
    public String getName() { return name; }
    public String getOccupationNameSnapshot() { return occupationNameSnapshot; }
    public String getCatalogFingerprint() { return catalogFingerprint; }
    public Integer getExplorationMaxQuestions() { return explorationMaxQuestions; }
    public Integer getExplorationTimeLimitSeconds() { return explorationTimeLimitSeconds; }
    public UUID getModelVersionId() { return modelVersionId; }
    public UUID getMasteryMappingVersionId() { return masteryMappingVersionId; }
    public UUID getParameterSetId() { return parameterSetId; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public String getScopePolicy() { return scopePolicy; }
    public Integer getOccupationMaxQuestions() { return occupationMaxQuestions; }
    public Integer getOccupationTimeLimitSeconds() { return occupationTimeLimitSeconds; }

    public record Key(UUID blueprintId, Integer version) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
