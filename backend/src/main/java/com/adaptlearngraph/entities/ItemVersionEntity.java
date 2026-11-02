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

/**
 * platform.item_version: an assessment item definition. protected_key holds the answer key and must never be mapped
 * to any DTO. Published definitions are frozen by trigger item_publication_guard; only DRAFT rows change, through
 * conditional updates.
 */
@Entity
@Table(schema = "platform", name = "item_version")
@DynamicInsert
@DynamicUpdate
public class ItemVersionEntity {
    @Id
    @Column(name = "item_version_id")
    private UUID itemVersionId;
    @Column(name = "item_id", nullable = false, updatable = false)
    private UUID itemId;
    @Column(name = "version", nullable = false, updatable = false)
    private Integer version;
    @Column(name = "question_bank_id", nullable = false, updatable = false)
    private UUID questionBankId;
    @Column(name = "prompt", nullable = false)
    private String prompt;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_schema", nullable = false, columnDefinition = "jsonb")
    private String responseSchema;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "protected_key", nullable = false, columnDefinition = "jsonb")
    private String protectedKey;
    @Column(name = "publication_state")
    private String publicationState;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @Column(name = "micro_skill_id")
    private String microSkillId;
    @Column(name = "micro_skill_name_snapshot")
    private String microSkillNameSnapshot;
    @Column(name = "difficulty")
    private String difficulty;

    protected ItemVersionEntity() {
    }

    @SuppressWarnings("java:S107")
    public ItemVersionEntity(UUID itemVersionId, UUID itemId, int version, UUID questionBankId, String prompt,
            String responseSchema, String protectedKey, String publicationState, String contentHash, String microSkillId,
            String microSkillNameSnapshot, String difficulty) {
        this.itemVersionId = itemVersionId;
        this.itemId = itemId;
        this.version = version;
        this.questionBankId = questionBankId;
        this.prompt = prompt;
        this.responseSchema = responseSchema;
        this.protectedKey = protectedKey;
        this.publicationState = publicationState;
        this.contentHash = contentHash;
        this.microSkillId = microSkillId;
        this.microSkillNameSnapshot = microSkillNameSnapshot;
        this.difficulty = difficulty;
    }

    public UUID getItemVersionId() { return itemVersionId; }
    public UUID getItemId() { return itemId; }
    public Integer getVersion() { return version; }
    public UUID getQuestionBankId() { return questionBankId; }
    public String getPrompt() { return prompt; }
    public String getResponseSchema() { return responseSchema; }
    public String getProtectedKey() { return protectedKey; }
    public String getPublicationState() { return publicationState; }
    public String getContentHash() { return contentHash; }
    public String getMicroSkillId() { return microSkillId; }
    public String getMicroSkillNameSnapshot() { return microSkillNameSnapshot; }
    public String getDifficulty() { return difficulty; }
}