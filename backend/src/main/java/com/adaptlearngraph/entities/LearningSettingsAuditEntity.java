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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.learning_settings_audit: append-only upload limit changes. */
@Entity
@Immutable
@Table(schema = "platform", name = "learning_settings_audit")
@DynamicInsert
public class LearningSettingsAuditEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    @Column(name = "actor_id", nullable = false)
    private String actorId;
    @Column(name = "occurred_at")
    private Instant occurredAt;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "previous_value", nullable = false, columnDefinition = "jsonb")
    private String previousValue;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "next_value", nullable = false, columnDefinition = "jsonb")
    private String nextValue;

    protected LearningSettingsAuditEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningSettingsAuditEntity(Long id, String actorId, Instant occurredAt, String previousValue, String nextValue) {
        this.id = id;
        this.actorId = actorId;
        this.occurredAt = occurredAt;
        this.previousValue = previousValue;
        this.nextValue = nextValue;
    }

    public Long getId() { return id; }
    public String getActorId() { return actorId; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getPreviousValue() { return previousValue; }
    public String getNextValue() { return nextValue; }
}
