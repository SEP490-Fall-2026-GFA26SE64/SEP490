package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_adaptive_blueprint_skill: immutable micro-skill snapshot of an adaptive Blueprint role. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_adaptive_blueprint_skill")
@IdClass(BaselineAdaptiveBlueprintSkillEntity.Key.class)
@DynamicInsert
public class BaselineAdaptiveBlueprintSkillEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Id
    @Column(name = "blueprint_version")
    private Integer blueprintVersion;
    @Id
    @Column(name = "role_id")
    private String roleId;
    @Id
    @Column(name = "micro_skill_id")
    private String microSkillId;
    @Column(name = "micro_skill_name_snapshot", nullable = false)
    private String microSkillNameSnapshot;
    @Column(name = "catalog_version", nullable = false)
    private String catalogVersion;

    protected BaselineAdaptiveBlueprintSkillEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAdaptiveBlueprintSkillEntity(UUID blueprintId, Integer blueprintVersion, String roleId, String microSkillId, String microSkillNameSnapshot, String catalogVersion) {
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.roleId = roleId;
        this.microSkillId = microSkillId;
        this.microSkillNameSnapshot = microSkillNameSnapshot;
        this.catalogVersion = catalogVersion;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getRoleId() { return roleId; }
    public String getMicroSkillId() { return microSkillId; }
    public String getMicroSkillNameSnapshot() { return microSkillNameSnapshot; }
    public String getCatalogVersion() { return catalogVersion; }

    public record Key(UUID blueprintId, Integer blueprintVersion, String roleId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null, null, null);
        }
    }
}
