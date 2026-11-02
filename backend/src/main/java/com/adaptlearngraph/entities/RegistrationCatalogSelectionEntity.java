package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.registration_catalog_selection; selected_node_ids is a PostgreSQL text[]. */
@Entity
@Table(schema = "platform", name = "registration_catalog_selection")
@DynamicInsert
@DynamicUpdate
public class RegistrationCatalogSelectionEntity {
    @Id
    @Column(name = "registration_id")
    private UUID registrationId;
    @Column(name = "template_version", nullable = false)
    private String templateVersion;
    @Column(name = "template_sha256", nullable = false)
    private String templateSha256;
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "selected_node_ids", nullable = false, columnDefinition = "text[]")
    private List<String> selectedNodeIds;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RegistrationCatalogSelectionEntity() {
    }

    public RegistrationCatalogSelectionEntity(UUID registrationId, String templateVersion, String templateSha256,
            List<String> selectedNodeIds, Instant createdAt) {
        this.registrationId = registrationId;
        this.templateVersion = templateVersion;
        this.templateSha256 = templateSha256;
        this.selectedNodeIds = List.copyOf(selectedNodeIds);
        this.createdAt = createdAt;
    }

    public UUID getRegistrationId() { return registrationId; }
    public String getTemplateVersion() { return templateVersion; }
    public String getTemplateSha256() { return templateSha256; }
    public List<String> getSelectedNodeIds() { return selectedNodeIds; }
    public Instant getCreatedAt() { return createdAt; }
}
