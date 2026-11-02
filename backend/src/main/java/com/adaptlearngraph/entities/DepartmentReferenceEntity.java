package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.department_reference: organization-owned department reference data. */
@Entity
@Table(schema = "platform", name = "department_reference")
@DynamicInsert
@DynamicUpdate
public class DepartmentReferenceEntity {
    @Id
    @Column(name = "department_id")
    private UUID departmentId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "active", nullable = false)
    private Boolean active;

    protected DepartmentReferenceEntity() {
    }

    public UUID getDepartmentId() { return departmentId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getName() { return name; }
    public Boolean getActive() { return active; }
}
