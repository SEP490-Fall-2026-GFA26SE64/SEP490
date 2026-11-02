package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.occupation_department_reference: an organization occupation placed in one department. */
@Entity
@Table(schema = "platform", name = "occupation_department_reference")
@DynamicInsert
@DynamicUpdate
public class OccupationDepartmentReferenceEntity {
    @Id
    @Column(name = "occupation_reference_id")
    private UUID occupationReferenceId;
    @Column(name = "occupation_id", nullable = false)
    private UUID occupationId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "department_id", nullable = false)
    private UUID departmentId;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "active", nullable = false)
    private Boolean active;

    protected OccupationDepartmentReferenceEntity() {
    }

    public UUID getOccupationReferenceId() { return occupationReferenceId; }
    public UUID getOccupationId() { return occupationId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getDepartmentId() { return departmentId; }
    public String getName() { return name; }
    public Boolean getActive() { return active; }
}
