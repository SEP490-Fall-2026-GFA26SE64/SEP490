package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_attempt_pool_item: frozen item pool of one adaptive attempt (trigger adaptive_attempt_child). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_pool_item")
@IdClass(BaselineAttemptPoolItemEntity.Key.class)
@DynamicInsert
public class BaselineAttemptPoolItemEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Id
    @Column(name = "item_version_id")
    private UUID itemVersionId;
    @Column(name = "micro_skill_id", nullable = false)
    private String microSkillId;

    protected BaselineAttemptPoolItemEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptPoolItemEntity(UUID attemptId, UUID organizationId, UUID parameterSetId, UUID itemVersionId, String microSkillId) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.parameterSetId = parameterSetId;
        this.itemVersionId = itemVersionId;
        this.microSkillId = microSkillId;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getParameterSetId() { return parameterSetId; }
    public UUID getItemVersionId() { return itemVersionId; }
    public String getMicroSkillId() { return microSkillId; }

    public record Key(UUID attemptId, UUID itemVersionId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
