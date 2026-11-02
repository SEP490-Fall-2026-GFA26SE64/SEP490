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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.learning_lesson_progress: learner progress per lesson of a module revision. */
@Entity
@Table(schema = "platform", name = "learning_lesson_progress")
@IdClass(LearningLessonProgressEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class LearningLessonProgressEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "learner_id")
    private String learnerId;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Id
    @Column(name = "revision")
    private Integer revision;
    @Id
    @Column(name = "lesson_id")
    private String lessonId;
    @Column(name = "position_seconds")
    private Double positionSeconds;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "watched_intervals", columnDefinition = "jsonb")
    private String watchedIntervals;
    @Column(name = "reached_end")
    private Boolean reachedEnd;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
    @Column(name = "coverage_updated_at")
    private Instant coverageUpdatedAt;

    protected LearningLessonProgressEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningLessonProgressEntity(String organizationId, String learnerId, String moduleId, Integer revision, String lessonId, Double positionSeconds, String watchedIntervals, Boolean reachedEnd, Instant completedAt, Instant updatedAt, Instant coverageUpdatedAt) {
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.moduleId = moduleId;
        this.revision = revision;
        this.lessonId = lessonId;
        this.positionSeconds = positionSeconds;
        this.watchedIntervals = watchedIntervals;
        this.reachedEnd = reachedEnd;
        this.completedAt = completedAt;
        this.updatedAt = updatedAt;
        this.coverageUpdatedAt = coverageUpdatedAt;
    }

    public String getOrganizationId() { return organizationId; }
    public String getLearnerId() { return learnerId; }
    public String getModuleId() { return moduleId; }
    public Integer getRevision() { return revision; }
    public String getLessonId() { return lessonId; }
    public Double getPositionSeconds() { return positionSeconds; }
    public String getWatchedIntervals() { return watchedIntervals; }
    public Boolean getReachedEnd() { return reachedEnd; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCoverageUpdatedAt() { return coverageUpdatedAt; }

    public record Key(String organizationId, String learnerId, String moduleId, Integer revision, String lessonId) implements Serializable {
        public Key() {
            this(null, null, null, null, null);
        }
    }
}
