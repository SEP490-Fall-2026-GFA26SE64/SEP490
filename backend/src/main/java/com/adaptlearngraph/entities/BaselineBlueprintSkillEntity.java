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

/** platform.baseline_blueprint_skill: immutable micro-skill quota of a fixed Blueprint role. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint_skill")
@IdClass(BaselineBlueprintSkillEntity.Key.class)
@DynamicInsert
public class BaselineBlueprintSkillEntity {
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
    @Column(name = "easy_question_count", nullable = false)
    private Integer easyQuestionCount;
    @Column(name = "medium_question_count", nullable = false)
    private Integer mediumQuestionCount;
    @Column(name = "hard_question_count", nullable = false)
    private Integer hardQuestionCount;

    protected BaselineBlueprintSkillEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintSkillEntity(UUID blueprintId, Integer blueprintVersion, String roleId, String microSkillId, String microSkillNameSnapshot, Integer easyQuestionCount, Integer mediumQuestionCount, Integer hardQuestionCount) {
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.roleId = roleId;
        this.microSkillId = microSkillId;
        this.microSkillNameSnapshot = microSkillNameSnapshot;
        this.easyQuestionCount = easyQuestionCount;
        this.mediumQuestionCount = mediumQuestionCount;
        this.hardQuestionCount = hardQuestionCount;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getRoleId() { return roleId; }
    public String getMicroSkillId() { return microSkillId; }
    public String getMicroSkillNameSnapshot() { return microSkillNameSnapshot; }
    public Integer getEasyQuestionCount() { return easyQuestionCount; }
    public Integer getMediumQuestionCount() { return mediumQuestionCount; }
    public Integer getHardQuestionCount() { return hardQuestionCount; }

    public record Key(UUID blueprintId, Integer blueprintVersion, String roleId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null, null, null);
        }
    }
}
