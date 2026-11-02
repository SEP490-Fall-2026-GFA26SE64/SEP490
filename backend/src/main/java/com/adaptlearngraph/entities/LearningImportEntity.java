package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.learning_import: Excel/ZIP import preview and its committed state. */
@Entity
@Table(schema = "platform", name = "learning_import")
@DynamicInsert
@DynamicUpdate
public class LearningImportEntity {
    @Id
    @Column(name = "id")
    private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @Column(name = "actor_id", nullable = false)
    private String actorId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document", nullable = false, columnDefinition = "jsonb")
    private String document;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "committed_at")
    private Instant committedAt;

    protected LearningImportEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningImportEntity(UUID id, String organizationId, String actorId, String document, String state, Instant createdAt, Instant committedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.document = document;
        this.state = state;
        this.createdAt = createdAt;
        this.committedAt = committedAt;
    }

    public UUID getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getActorId() { return actorId; }
    public String getDocument() { return document; }
    public String getState() { return state; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCommittedAt() { return committedAt; }
}
