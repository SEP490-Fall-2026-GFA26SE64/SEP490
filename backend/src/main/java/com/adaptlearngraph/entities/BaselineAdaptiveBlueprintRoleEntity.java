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

/** platform.baseline_adaptive_blueprint_role: immutable role snapshot of an adaptive Blueprint version. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_adaptive_blueprint_role")
@IdClass(BaselineAdaptiveBlueprintRoleEntity.Key.class)
@DynamicInsert
public class BaselineAdaptiveBlueprintRoleEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Id
    @Column(name = "blueprint_version")
    private Integer blueprintVersion;
    @Id
    @Column(name = "role_id")
    private String roleId;
    @Column(name = "role_name_snapshot", nullable = false)
    private String roleNameSnapshot;
    @Column(name = "catalog_version", nullable = false)
    private String catalogVersion;
    @Column(name = "max_questions")
    private Integer maxQuestions;
    @Column(name = "time_limit_seconds")
    private Integer timeLimitSeconds;

    protected BaselineAdaptiveBlueprintRoleEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAdaptiveBlueprintRoleEntity(UUID blueprintId, Integer blueprintVersion, String roleId, String roleNameSnapshot, String catalogVersion, Integer maxQuestions, Integer timeLimitSeconds) {
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.roleId = roleId;
        this.roleNameSnapshot = roleNameSnapshot;
        this.catalogVersion = catalogVersion;
        this.maxQuestions = maxQuestions;
        this.timeLimitSeconds = timeLimitSeconds;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getRoleId() { return roleId; }
    public String getRoleNameSnapshot() { return roleNameSnapshot; }
    public String getCatalogVersion() { return catalogVersion; }
    public Integer getMaxQuestions() { return maxQuestions; }
    public Integer getTimeLimitSeconds() { return timeLimitSeconds; }

    public record Key(UUID blueprintId, Integer blueprintVersion, String roleId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
