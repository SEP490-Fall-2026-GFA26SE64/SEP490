package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.module_grant_audit: append-only history of authoring grant changes. */
@Entity
@Immutable
@Table(schema = "platform", name = "module_grant_audit")
@DynamicInsert
public class ModuleGrantAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @Column(name = "expert_id", nullable = false)
    private String expertId;
    @Column(name = "occupation_id", nullable = false)
    private String occupationId;
    @Column(name = "active", nullable = false)
    private Boolean active;
    @Column(name = "changed_by", nullable = false)
    private String changedBy;
    @Column(name = "changed_at")
    private Instant changedAt;

    protected ModuleGrantAuditEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleGrantAuditEntity(Long eventId, String organizationId, String expertId, String occupationId, Boolean active, String changedBy, Instant changedAt) {
        this.eventId = eventId;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.occupationId = occupationId;
        this.active = active;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
    }

    public Long getEventId() { return eventId; }
    public String getOrganizationId() { return organizationId; }
    public String getExpertId() { return expertId; }
    public String getOccupationId() { return occupationId; }
    public Boolean getActive() { return active; }
    public String getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
}
