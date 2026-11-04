package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.module_job_position_grant: Expert authoring grant per job position within an organization. */
@Entity
@Table(schema = "platform", name = "module_job_position_grant")
@IdClass(ModuleJobPositionGrantEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class ModuleJobPositionGrantEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "expert_id")
    private String expertId;
    @Id
    @Column(name = "job_position_id")
    private String jobPositionId;
    @Column(name = "active", nullable = false)
    private Boolean active;

    protected ModuleJobPositionGrantEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleJobPositionGrantEntity(String organizationId, String expertId, String jobPositionId, Boolean active) {
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.jobPositionId = jobPositionId;
        this.active = active;
    }

    public String getOrganizationId() { return organizationId; }
    public String getExpertId() { return expertId; }
    public String getJobPositionId() { return jobPositionId; }
    public Boolean getActive() { return active; }

    public record Key(String organizationId, String expertId, String jobPositionId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}

