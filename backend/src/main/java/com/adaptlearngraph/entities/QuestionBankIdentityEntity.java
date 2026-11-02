package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.question_bank_identity: stable question code within one bank. */
@Entity
@Table(schema = "platform", name = "question_bank_identity")
@DynamicInsert
@DynamicUpdate
public class QuestionBankIdentityEntity {
    @Id
    @Column(name = "question_id")
    private UUID questionId;
    @Column(name = "question_bank_id", nullable = false, updatable = false)
    private UUID questionBankId;
    @Column(name = "code", nullable = false, updatable = false)
    private String code;
    @Column(name = "retired")
    private Boolean retired;

    protected QuestionBankIdentityEntity() {
    }

    public UUID getQuestionId() { return questionId; }
    public UUID getQuestionBankId() { return questionBankId; }
    public String getCode() { return code; }
    public Boolean getRetired() { return retired; }
}