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

/** platform.baseline_attempt_item: item presented at one attempt position (trigger adaptive_attempt_child). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_item")
@IdClass(BaselineAttemptItemEntity.Key.class)
@DynamicInsert
public class BaselineAttemptItemEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Id
    @Column(name = "position")
    private Integer position;
    @Column(name = "item_version_id", nullable = false)
    private UUID itemVersionId;
    @Column(name = "micro_skill_id", nullable = false)
    private String microSkillId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "option_order", nullable = false, columnDefinition = "jsonb")
    private String optionOrder;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "selection_trace", nullable = false, columnDefinition = "jsonb")
    private String selectionTrace;
    @Column(name = "presented_at", nullable = false)
    private Instant presentedAt;

    protected BaselineAttemptItemEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptItemEntity(UUID attemptId, UUID organizationId, Integer position, UUID itemVersionId, String microSkillId, String optionOrder, String selectionTrace, Instant presentedAt) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.position = position;
        this.itemVersionId = itemVersionId;
        this.microSkillId = microSkillId;
        this.optionOrder = optionOrder;
        this.selectionTrace = selectionTrace;
        this.presentedAt = presentedAt;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public Integer getPosition() { return position; }
    public UUID getItemVersionId() { return itemVersionId; }
    public String getMicroSkillId() { return microSkillId; }
    public String getOptionOrder() { return optionOrder; }
    public String getSelectionTrace() { return selectionTrace; }
    public Instant getPresentedAt() { return presentedAt; }

    public record Key(UUID attemptId, Integer position) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
