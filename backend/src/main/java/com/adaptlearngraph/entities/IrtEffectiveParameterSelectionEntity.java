package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** Effective promoted parameter set per organization, bank and model; revision-fenced updates only. */
@Entity
@Table(schema = "platform", name = "irt_effective_parameter_selection")
@IdClass(IrtEffectiveParameterSelectionEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class IrtEffectiveParameterSelectionEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "question_bank_id")
    private UUID questionBankId;
    @Id
    @Column(name = "model_version_id")
    private UUID modelVersionId;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Column(name = "selected_by", nullable = false)
    private UUID selectedBy;
    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;

    protected IrtEffectiveParameterSelectionEntity() {
    }

    @SuppressWarnings("java:S107")
    public IrtEffectiveParameterSelectionEntity(UUID organizationId, UUID questionBankId, UUID modelVersionId, UUID parameterSetId, Long selectionRevision, UUID selectedBy, Instant selectedAt) {
        this.organizationId = organizationId;
        this.questionBankId = questionBankId;
        this.modelVersionId = modelVersionId;
        this.parameterSetId = parameterSetId;
        this.selectionRevision = selectionRevision;
        this.selectedBy = selectedBy;
        this.selectedAt = selectedAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getQuestionBankId() { return questionBankId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public UUID getParameterSetId() { return parameterSetId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public UUID getSelectedBy() { return selectedBy; }
    public Instant getSelectedAt() { return selectedAt; }

    public record Key(UUID organizationId, UUID questionBankId, UUID modelVersionId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
