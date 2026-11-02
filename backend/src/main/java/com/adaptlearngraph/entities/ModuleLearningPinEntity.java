package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.module_learning_pin: learner's pinned module revision. */
@Entity
@Table(schema = "platform", name = "module_learning_pin")
@IdClass(ModuleLearningPinEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class ModuleLearningPinEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "learner_id")
    private String learnerId;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Column(name = "revision", nullable = false)
    private Integer revision;
    @Column(name = "started_at")
    private Instant startedAt;

    protected ModuleLearningPinEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleLearningPinEntity(String organizationId, String learnerId, String moduleId, Integer revision, Instant startedAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.moduleId = moduleId;
        this.revision = revision;
        this.startedAt = startedAt;
    }

    public String getOrganizationId() { return organizationId; }
    public String getLearnerId() { return learnerId; }
    public String getModuleId() { return moduleId; }
    public Integer getRevision() { return revision; }
    public Instant getStartedAt() { return startedAt; }

    public record Key(String organizationId, String learnerId, String moduleId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
