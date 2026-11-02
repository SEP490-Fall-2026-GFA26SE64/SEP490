package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.module_authoring_content: insert-only authoring content snapshot. */
@Entity
@Immutable
@Table(schema = "platform", name = "module_authoring_content")
@IdClass(ModuleAuthoringContentEntity.Key.class)
@DynamicInsert
public class ModuleAuthoringContentEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "content_id")
    private String contentId;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "document", nullable = false, columnDefinition = "jsonb")
    private String document;

    protected ModuleAuthoringContentEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleAuthoringContentEntity(String organizationId, String contentId, String document) {
        this.organizationId = organizationId;
        this.contentId = contentId;
        this.document = document;
    }

    public String getOrganizationId() { return organizationId; }
    public String getContentId() { return contentId; }
    public String getDocument() { return document; }

    public record Key(String organizationId, String contentId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
