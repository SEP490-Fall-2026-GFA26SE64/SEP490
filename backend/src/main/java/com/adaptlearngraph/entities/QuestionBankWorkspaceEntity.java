package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.question_bank_workspace: the organization's authoring document (jsonb), one per organization. */
@Entity
@Table(schema = "platform", name = "question_bank_workspace")
@DynamicInsert
@DynamicUpdate
public class QuestionBankWorkspaceEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "question_bank_id", nullable = false, updatable = false)
    private UUID questionBankId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document", nullable = false, columnDefinition = "jsonb")
    private String document;

    protected QuestionBankWorkspaceEntity() {
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getQuestionBankId() { return questionBankId; }
    public String getDocument() { return document; }
}