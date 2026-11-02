package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.manual_learning_pathway: insert-only Expert-confirmed learning pathway. */
@Entity
@Immutable
@Table(schema = "platform", name = "manual_learning_pathway")
@DynamicInsert
public class ManualLearningPathwayEntity {
    @Id
    @Column(name = "id")
    private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "expert_id", nullable = false)
    private UUID expertId;
    @Column(name = "title", nullable = false)
    private String title;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "module_ids", nullable = false, columnDefinition = "jsonb")
    private String moduleIds;
    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected ManualLearningPathwayEntity() {
    }

    @SuppressWarnings("java:S107")
    public ManualLearningPathwayEntity(UUID id, UUID organizationId, UUID learnerId, UUID expertId, String title, String moduleIds, Instant confirmedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.expertId = expertId;
        this.title = title;
        this.moduleIds = moduleIds;
        this.confirmedAt = confirmedAt;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getExpertId() { return expertId; }
    public String getTitle() { return title; }
    public String getModuleIds() { return moduleIds; }
    public Instant getConfirmedAt() { return confirmedAt; }
}
