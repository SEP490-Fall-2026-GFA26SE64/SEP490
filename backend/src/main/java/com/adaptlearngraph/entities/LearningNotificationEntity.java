package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.learning_notification: in-app learning notification with durable mail delivery state. */
@Entity
@Table(schema = "platform", name = "learning_notification")
@DynamicInsert
@DynamicUpdate
public class LearningNotificationEntity {
    @Id
    @Column(name = "id")
    private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @Column(name = "recipient_id", nullable = false)
    private String recipientId;
    @Column(name = "event_key", nullable = false)
    private String eventKey;
    @Column(name = "kind", nullable = false)
    private String kind;
    @Column(name = "module_id", nullable = false)
    private String moduleId;
    @Column(name = "title", nullable = false)
    private String title;
    @Column(name = "body", nullable = false)
    private String body;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "read_at")
    private Instant readAt;
    @Column(name = "mail_sent_at")
    private Instant mailSentAt;
    @Column(name = "mail_attempts")
    private Integer mailAttempts;
    @Column(name = "mail_next_attempt")
    private Instant mailNextAttempt;
    @Column(name = "mail_error")
    private String mailError;

    protected LearningNotificationEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningNotificationEntity(UUID id, String organizationId, String recipientId, String eventKey, String kind, String moduleId, String title, String body, Instant createdAt, Instant readAt, Instant mailSentAt, Integer mailAttempts, Instant mailNextAttempt, String mailError) {
        this.id = id;
        this.organizationId = organizationId;
        this.recipientId = recipientId;
        this.eventKey = eventKey;
        this.kind = kind;
        this.moduleId = moduleId;
        this.title = title;
        this.body = body;
        this.createdAt = createdAt;
        this.readAt = readAt;
        this.mailSentAt = mailSentAt;
        this.mailAttempts = mailAttempts;
        this.mailNextAttempt = mailNextAttempt;
        this.mailError = mailError;
    }

    public UUID getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getRecipientId() { return recipientId; }
    public String getEventKey() { return eventKey; }
    public String getKind() { return kind; }
    public String getModuleId() { return moduleId; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadAt() { return readAt; }
    public Instant getMailSentAt() { return mailSentAt; }
    public Integer getMailAttempts() { return mailAttempts; }
    public Instant getMailNextAttempt() { return mailNextAttempt; }
    public String getMailError() { return mailError; }
}
