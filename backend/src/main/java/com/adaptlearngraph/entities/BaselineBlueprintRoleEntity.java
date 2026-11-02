package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_blueprint_role: immutable role configuration of a fixed Blueprint version. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint_role")
@IdClass(BaselineBlueprintRoleEntity.Key.class)
@DynamicInsert
public class BaselineBlueprintRoleEntity {
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
    @Column(name = "enabled", nullable = false)
    private Boolean enabled;
    @Column(name = "total_question_count", nullable = false)
    private Integer totalQuestionCount;
    @Column(name = "easy_score_weight", nullable = false, columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal easyScoreWeight;
    @Column(name = "medium_score_weight", nullable = false, columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal mediumScoreWeight;
    @Column(name = "hard_score_weight", nullable = false, columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal hardScoreWeight;

    protected BaselineBlueprintRoleEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintRoleEntity(UUID blueprintId, Integer blueprintVersion, String roleId, String roleNameSnapshot, Boolean enabled, Integer totalQuestionCount, BigDecimal easyScoreWeight, BigDecimal mediumScoreWeight, BigDecimal hardScoreWeight) {
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.roleId = roleId;
        this.roleNameSnapshot = roleNameSnapshot;
        this.enabled = enabled;
        this.totalQuestionCount = totalQuestionCount;
        this.easyScoreWeight = easyScoreWeight;
        this.mediumScoreWeight = mediumScoreWeight;
        this.hardScoreWeight = hardScoreWeight;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getRoleId() { return roleId; }
    public String getRoleNameSnapshot() { return roleNameSnapshot; }
    public Boolean getEnabled() { return enabled; }
    public Integer getTotalQuestionCount() { return totalQuestionCount; }
    public BigDecimal getEasyScoreWeight() { return easyScoreWeight; }
    public BigDecimal getMediumScoreWeight() { return mediumScoreWeight; }
    public BigDecimal getHardScoreWeight() { return hardScoreWeight; }

    public record Key(UUID blueprintId, Integer blueprintVersion, String roleId) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
