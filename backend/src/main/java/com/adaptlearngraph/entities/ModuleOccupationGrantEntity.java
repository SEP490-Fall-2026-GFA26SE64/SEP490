package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.module_occupation_grant: Expert authoring grant per occupation within an organization. */
@Entity
@Table(schema = "platform", name = "module_occupation_grant")
@IdClass(ModuleOccupationGrantEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class ModuleOccupationGrantEntity {
    @Id
    @Column(name = "organization_id")
    private String organizationId;
    @Id
    @Column(name = "expert_id")
    private String expertId;
    @Id
    @Column(name = "occupation_id")
    private String occupationId;
    @Column(name = "active", nullable = false)
    private Boolean active;

    protected ModuleOccupationGrantEntity() {
    }

    @SuppressWarnings("java:S107")
    public ModuleOccupationGrantEntity(String organizationId, String expertId, String occupationId, Boolean active) {
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.occupationId = occupationId;
        this.active = active;
    }

    public String getOrganizationId() { return organizationId; }
    public String getExpertId() { return expertId; }
    public String getOccupationId() { return occupationId; }
    public Boolean getActive() { return active; }

    public record Key(String organizationId, String expertId, String occupationId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
