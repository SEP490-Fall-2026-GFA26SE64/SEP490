package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.module_authoring: one JSON authoring document per organization module (module_id is globally unique). */
@Entity
@Table(schema = "platform", name = "module_authoring")
@IdClass(ModuleAuthoringEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class ModuleAuthoringEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document", nullable = false, columnDefinition = "jsonb")
    private String document;

    protected ModuleAuthoringEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleAuthoringEntity(String organizationId, String moduleId, String document) {
        this.organizationId = organizationId;
        this.moduleId = moduleId;
        this.document = document;
    }

    public String getOrganizationId() { return organizationId; }
    public String getModuleId() { return moduleId; }
    public String getDocument() { return document; }

    public record Key(String organizationId, String moduleId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
