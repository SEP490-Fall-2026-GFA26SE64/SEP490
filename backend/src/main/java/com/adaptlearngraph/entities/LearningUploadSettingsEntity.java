package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.learning_upload_settings: singleton upload limits with optimistic version. */
@Entity
@Table(schema = "platform", name = "learning_upload_settings")
@DynamicInsert
@DynamicUpdate
public class LearningUploadSettingsEntity {
    @Id
    @Column(name = "singleton")
    private Boolean singleton;
    @Column(name = "video_bytes", nullable = false)
    private Long videoBytes;
    @Column(name = "image_bytes", nullable = false)
    private Long imageBytes;
    @Column(name = "zip_bytes", nullable = false)
    private Long zipBytes;
    @Column(name = "version")
    private Long version;
    @Column(name = "changed_by")
    private String changedBy;
    @Column(name = "changed_at")
    private Instant changedAt;

    protected LearningUploadSettingsEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningUploadSettingsEntity(Boolean singleton, Long videoBytes, Long imageBytes, Long zipBytes, Long version, String changedBy, Instant changedAt) {
        this.singleton = singleton;
        this.videoBytes = videoBytes;
        this.imageBytes = imageBytes;
        this.zipBytes = zipBytes;
        this.version = version;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
    }

    public Boolean getSingleton() { return singleton; }
    public Long getVideoBytes() { return videoBytes; }
    public Long getImageBytes() { return imageBytes; }
    public Long getZipBytes() { return zipBytes; }
    public Long getVersion() { return version; }
    public String getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
}
