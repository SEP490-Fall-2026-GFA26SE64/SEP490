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

/** platform.initial_pathway_revision: immutable initial pathway revision content (trigger initial_pathway_revision_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_revision")
@IdClass(InitialPathwayRevisionEntity.Key.class)
@DynamicInsert
public class InitialPathwayRevisionEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Id
    @Column(name = "revision")
    private Long revision;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Column(name = "run_id", nullable = false)
    private UUID runId;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @Column(name = "validation_status", nullable = false)
    private String validationStatus;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", nullable = false, columnDefinition = "jsonb")
    private String content;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "format_version", nullable = false)
    private Short formatVersion;

    protected InitialPathwayRevisionEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayRevisionEntity(UUID requestId, Long revision, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, UUID runId, String contentHash, String validationStatus, String content, Instant createdAt, Short formatVersion) {
        this.requestId = requestId;
        this.revision = revision;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.selectionRevision = selectionRevision;
        this.runId = runId;
        this.contentHash = contentHash;
        this.validationStatus = validationStatus;
        this.content = content;
        this.createdAt = createdAt;
        this.formatVersion = formatVersion;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public UUID getRunId() { return runId; }
    public String getContentHash() { return contentHash; }
    public String getValidationStatus() { return validationStatus; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
    public Short getFormatVersion() { return formatVersion; }

    public record Key(UUID requestId, Long revision) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
