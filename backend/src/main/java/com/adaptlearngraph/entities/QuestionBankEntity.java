package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.question_bank; owned by the organization of its creating account. */
@Entity
@Table(schema = "platform", name = "question_bank")
@DynamicInsert
@DynamicUpdate
public class QuestionBankEntity {
    @Id
    @Column(name = "question_bank_id")
    private UUID questionBankId;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "created_at")
    private Instant createdAt;

    protected QuestionBankEntity() {
    }

    public QuestionBankEntity(UUID questionBankId, String name, UUID createdBy) {
        this.questionBankId = questionBankId;
        this.name = name;
        this.createdBy = createdBy;
    }

    public UUID getQuestionBankId() { return questionBankId; }
    public String getName() { return name; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}