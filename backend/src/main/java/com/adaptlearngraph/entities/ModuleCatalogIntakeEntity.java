package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.module_catalog_intake: catalog module assigned for authoring intake (module_id is globally unique). */
@Entity
@Table(schema = "platform", name = "module_catalog_intake")
@DynamicInsert
@DynamicUpdate
public class ModuleCatalogIntakeEntity {
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document", nullable = false, columnDefinition = "jsonb")
    private String document;

    protected ModuleCatalogIntakeEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleCatalogIntakeEntity(String moduleId, String organizationId, String document) {
        this.moduleId = moduleId;
        this.organizationId = organizationId;
        this.document = document;
    }

    public String getModuleId() { return moduleId; }
    public String getOrganizationId() { return organizationId; }
    public String getDocument() { return document; }
}
