package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.learning_version_switch: append-only learner revision switches. */
@Entity
@Immutable
@Table(schema = "platform", name = "learning_version_switch")
@DynamicInsert
public class LearningVersionSwitchEntity {
    @Id
    @Column(name = "id")
    private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @Column(name = "learner_id", nullable = false)
    private String learnerId;
    @Column(name = "module_id", nullable = false)
    private String moduleId;
    @Column(name = "from_revision", nullable = false)
    private Integer fromRevision;
    @Column(name = "to_revision", nullable = false)
    private Integer toRevision;
    @Column(name = "switched_at")
    private Instant switchedAt;

    protected LearningVersionSwitchEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningVersionSwitchEntity(UUID id, String organizationId, String learnerId, String moduleId, Integer fromRevision, Integer toRevision, Instant switchedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.moduleId = moduleId;
        this.fromRevision = fromRevision;
        this.toRevision = toRevision;
        this.switchedAt = switchedAt;
    }

    public UUID getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getLearnerId() { return learnerId; }
    public String getModuleId() { return moduleId; }
    public Integer getFromRevision() { return fromRevision; }
    public Integer getToRevision() { return toRevision; }
    public Instant getSwitchedAt() { return switchedAt; }
}
