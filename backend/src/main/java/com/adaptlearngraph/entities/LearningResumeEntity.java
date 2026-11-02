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

/** platform.learning_resume: last active lesson per learner module. */
@Entity
@Table(schema = "platform", name = "learning_resume")
@IdClass(LearningResumeEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class LearningResumeEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "learner_id")
    private String learnerId;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Column(name = "lesson_id", nullable = false)
    private String lessonId;
    @Column(name = "updated_at")
    private Instant updatedAt;

    protected LearningResumeEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningResumeEntity(String organizationId, String learnerId, String moduleId, String lessonId, Instant updatedAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.moduleId = moduleId;
        this.lessonId = lessonId;
        this.updatedAt = updatedAt;
    }

    public String getOrganizationId() { return organizationId; }
    public String getLearnerId() { return learnerId; }
    public String getModuleId() { return moduleId; }
    public String getLessonId() { return lessonId; }
    public Instant getUpdatedAt() { return updatedAt; }

    public record Key(String organizationId, String learnerId, String moduleId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
