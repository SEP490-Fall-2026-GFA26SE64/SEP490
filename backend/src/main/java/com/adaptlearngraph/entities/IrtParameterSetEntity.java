package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.irt_parameter_set: IRT item-parameter set of a model version; promotion state changes only through guarded statements (trigger normalizes NEW). */
@Entity
@Table(schema = "platform", name = "irt_parameter_set")
@DynamicInsert
@DynamicUpdate
public class IrtParameterSetEntity {
    @Id
    @Column(name = "parameter_set_id")
    private UUID parameterSetId;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "source", nullable = false)
    private String source;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "parameter_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String parameterHash;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "activated_by")
    private UUID activatedBy;
    @Column(name = "activated_at")
    private Instant activatedAt;

    protected IrtParameterSetEntity() {
    }

    @SuppressWarnings("java:S107")
    public IrtParameterSetEntity(UUID parameterSetId, UUID modelVersionId, String source, String status, String parameterHash, Instant createdAt, UUID activatedBy, Instant activatedAt) {
        this.parameterSetId = parameterSetId;
        this.modelVersionId = modelVersionId;
        this.source = source;
        this.status = status;
        this.parameterHash = parameterHash;
        this.createdAt = createdAt;
        this.activatedBy = activatedBy;
        this.activatedAt = activatedAt;
    }

    public UUID getParameterSetId() { return parameterSetId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public String getSource() { return source; }
    public String getStatus() { return status; }
    public String getParameterHash() { return parameterHash; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getActivatedBy() { return activatedBy; }
    public Instant getActivatedAt() { return activatedAt; }
}
