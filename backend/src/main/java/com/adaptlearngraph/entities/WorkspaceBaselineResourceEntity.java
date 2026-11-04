package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.workspace_baseline_resource: the organization's binding of a graph jobPosition to its baseline question bank, model and mastery mapping (bank ownership is enforced by trigger baseline_bank_tenant_guard). */
@Entity
@Table(schema = "platform", name = "workspace_baseline_resource")
@IdClass(WorkspaceBaselineResourceEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class WorkspaceBaselineResourceEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "job_position_reference_id")
    private UUID jobPositionReferenceId;
    @Id
    @Column(name = "graph_job_position_id")
    private String graphJobPositionId;
    @Column(name = "question_bank_id")
    private UUID questionBankId;
    @Column(name = "model_version_id")
    private UUID modelVersionId;
    @Column(name = "mastery_mapping_version_id")
    private UUID masteryMappingVersionId;

    protected WorkspaceBaselineResourceEntity() {
    }

    @SuppressWarnings("java:S107")
    public WorkspaceBaselineResourceEntity(UUID organizationId, UUID jobPositionReferenceId, String graphJobPositionId, UUID questionBankId, UUID modelVersionId, UUID masteryMappingVersionId) {
        this.organizationId = organizationId;
        this.jobPositionReferenceId = jobPositionReferenceId;
        this.graphJobPositionId = graphJobPositionId;
        this.questionBankId = questionBankId;
        this.modelVersionId = modelVersionId;
        this.masteryMappingVersionId = masteryMappingVersionId;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getJobPositionReferenceId() { return jobPositionReferenceId; }
    public String getGraphJobPositionId() { return graphJobPositionId; }
    public UUID getQuestionBankId() { return questionBankId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public UUID getMasteryMappingVersionId() { return masteryMappingVersionId; }

    public record Key(UUID organizationId, String graphJobPositionId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
