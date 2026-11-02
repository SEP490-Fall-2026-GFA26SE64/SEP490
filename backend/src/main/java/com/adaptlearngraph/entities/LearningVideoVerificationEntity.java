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

/** platform.learning_video_verification: latest verified external video duration per actor. */
@Entity
@Table(schema = "platform", name = "learning_video_verification")
@IdClass(LearningVideoVerificationEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class LearningVideoVerificationEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "actor_id")
    private String actorId;
    @Id
    @Column(name = "video_url")
    private String videoUrl;
    @Column(name = "duration_seconds", nullable = false)
    private Double durationSeconds;
    @Column(name = "verified_at")
    private Instant verifiedAt;

    protected LearningVideoVerificationEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningVideoVerificationEntity(String organizationId, String actorId, String videoUrl, Double durationSeconds, Instant verifiedAt) {
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.videoUrl = videoUrl;
        this.durationSeconds = durationSeconds;
        this.verifiedAt = verifiedAt;
    }

    public String getOrganizationId() { return organizationId; }
    public String getActorId() { return actorId; }
    public String getVideoUrl() { return videoUrl; }
    public Double getDurationSeconds() { return durationSeconds; }
    public Instant getVerifiedAt() { return verifiedAt; }

    public record Key(String organizationId, String actorId, String videoUrl) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
