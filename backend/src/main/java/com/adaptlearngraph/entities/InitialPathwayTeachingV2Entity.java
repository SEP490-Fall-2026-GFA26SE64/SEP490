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

/** platform.initial_pathway_teaching_v2: format-2 module teaching assignments (trigger initial_teaching_v2_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_teaching_v2")
@IdClass(InitialPathwayTeachingV2Entity.Key.class)
@DynamicInsert
public class InitialPathwayTeachingV2Entity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Id
    @Column(name = "revision")
    private Long revision;
    @Column(name = "format_version", nullable = false)
    private Short formatVersion;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Id
    @Column(name = "skill_id")
    private String skillId;
    @Column(name = "teaching_focus", nullable = false)
    private String teachingFocus;
    @Column(name = "difficulty_level", nullable = false)
    private String difficultyLevel;
    @Column(name = "coverage_role", nullable = false)
    private String coverageRole;
    @Column(name = "preferred_difficulty")
    private String preferredDifficulty;
    @Column(name = "difficulty_fallback_rank")
    private Short difficultyFallbackRank;
    @Column(name = "expert_attention", nullable = false)
    private Boolean expertAttention;
    @Column(name = "attention_reason")
    private String attentionReason;
    @Column(name = "suitability_version", nullable = false)
    private String suitabilityVersion;
    @Column(name = "reason", nullable = false)
    private String reason;

    protected InitialPathwayTeachingV2Entity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayTeachingV2Entity(UUID requestId, Long revision, Short formatVersion, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, String moduleId, String skillId, String teachingFocus, String difficultyLevel, String coverageRole, String preferredDifficulty, Short difficultyFallbackRank, Boolean expertAttention, String attentionReason, String suitabilityVersion, String reason) {
        this.requestId = requestId;
        this.revision = revision;
        this.formatVersion = formatVersion;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.selectionRevision = selectionRevision;
        this.moduleId = moduleId;
        this.skillId = skillId;
        this.teachingFocus = teachingFocus;
        this.difficultyLevel = difficultyLevel;
        this.coverageRole = coverageRole;
        this.preferredDifficulty = preferredDifficulty;
        this.difficultyFallbackRank = difficultyFallbackRank;
        this.expertAttention = expertAttention;
        this.attentionReason = attentionReason;
        this.suitabilityVersion = suitabilityVersion;
        this.reason = reason;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public Short getFormatVersion() { return formatVersion; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public String getModuleId() { return moduleId; }
    public String getSkillId() { return skillId; }
    public String getTeachingFocus() { return teachingFocus; }
    public String getDifficultyLevel() { return difficultyLevel; }
    public String getCoverageRole() { return coverageRole; }
    public String getPreferredDifficulty() { return preferredDifficulty; }
    public Short getDifficultyFallbackRank() { return difficultyFallbackRank; }
    public Boolean getExpertAttention() { return expertAttention; }
    public String getAttentionReason() { return attentionReason; }
    public String getSuitabilityVersion() { return suitabilityVersion; }
    public String getReason() { return reason; }

    public record Key(UUID requestId, Long revision, String moduleId, String skillId) implements Serializable {
        public Key() {
            this(null, null, null, null);
        }
    }
}
