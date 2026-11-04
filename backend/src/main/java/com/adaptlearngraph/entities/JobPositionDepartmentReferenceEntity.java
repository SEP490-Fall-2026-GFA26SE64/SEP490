package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.job_position_department_reference: an organization job position placed in one department. */
@Entity
@Table(schema = "platform", name = "job_position_department_reference")
@DynamicInsert
@DynamicUpdate
public class JobPositionDepartmentReferenceEntity {
    @Id
    @Column(name = "job_position_reference_id")
    private UUID jobPositionReferenceId;
    @Column(name = "job_position_id", nullable = false)
    private UUID jobPositionId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "department_id", nullable = false)
    private UUID departmentId;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "active", nullable = false)
    private Boolean active;

    protected JobPositionDepartmentReferenceEntity() {
    }

    public UUID getJobPositionReferenceId() { return jobPositionReferenceId; }
    public UUID getJobPositionId() { return jobPositionId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getDepartmentId() { return departmentId; }
    public String getName() { return name; }
    public Boolean getActive() { return active; }
}

