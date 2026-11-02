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

/** platform.target_selection: a learner's target role selection; the open row has no ended_at. */
@Entity
@Table(schema = "platform", name = "target_selection")
@DynamicInsert
@DynamicUpdate
public class TargetSelectionEntity {
    @Id
    @Column(name = "selection_id")
    private UUID selectionId;
    @Column(name = "learner_id", nullable = false, updatable = false)
    private UUID learnerId;
    @Column(name = "role_ref_id", nullable = false)
    private UUID roleRefId;
    @Column(name = "role_kind", nullable = false)
    private String roleKind;
    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;
    @Column(name = "ended_at")
    private Instant endedAt;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "role_snapshot", columnDefinition = "jsonb")
    private String roleSnapshot;

    protected TargetSelectionEntity() {
    }

    @SuppressWarnings("java:S107")
    public TargetSelectionEntity(UUID selectionId, UUID learnerId, UUID roleRefId, String roleKind, Instant selectedAt, Instant endedAt, String roleSnapshot) {
        this.selectionId = selectionId;
        this.learnerId = learnerId;
        this.roleRefId = roleRefId;
        this.roleKind = roleKind;
        this.selectedAt = selectedAt;
        this.endedAt = endedAt;
        this.roleSnapshot = roleSnapshot;
    }

    public UUID getSelectionId() { return selectionId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getRoleRefId() { return roleRefId; }
    public String getRoleKind() { return roleKind; }
    public Instant getSelectedAt() { return selectedAt; }
    public Instant getEndedAt() { return endedAt; }
    public String getRoleSnapshot() { return roleSnapshot; }
}
