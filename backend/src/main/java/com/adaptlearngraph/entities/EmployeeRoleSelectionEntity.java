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

/** platform.employee_role_selection: current-schema string-ID role selections; the open row has no ended_at. */
@Entity
@Table(schema = "platform", name = "employee_role_selection")
@DynamicInsert
@DynamicUpdate
public class EmployeeRoleSelectionEntity {
    @Id
    @Column(name = "selection_id")
    private UUID selectionId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false, updatable = false)
    private UUID learnerId;
    @Column(name = "role_id", nullable = false)
    private String roleId;
    @Column(name = "occupation_id", nullable = false)
    private String occupationId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "role_snapshot", nullable = false, columnDefinition = "jsonb")
    private String roleSnapshot;
    @Column(name = "target_revision", nullable = false)
    private Long targetRevision;
    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;
    @Column(name = "ended_at")
    private Instant endedAt;

    protected EmployeeRoleSelectionEntity() {
    }

    @SuppressWarnings("java:S107")
    public EmployeeRoleSelectionEntity(UUID selectionId, UUID organizationId, UUID learnerId, String roleId, String occupationId, String roleSnapshot, Long targetRevision, Instant selectedAt, Instant endedAt) {
        this.selectionId = selectionId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.roleId = roleId;
        this.occupationId = occupationId;
        this.roleSnapshot = roleSnapshot;
        this.targetRevision = targetRevision;
        this.selectedAt = selectedAt;
        this.endedAt = endedAt;
    }

    public UUID getSelectionId() { return selectionId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public String getRoleId() { return roleId; }
    public String getOccupationId() { return occupationId; }
    public String getRoleSnapshot() { return roleSnapshot; }
    public Long getTargetRevision() { return targetRevision; }
    public Instant getSelectedAt() { return selectedAt; }
    public Instant getEndedAt() { return endedAt; }
}
