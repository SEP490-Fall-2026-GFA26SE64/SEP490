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

/** platform.initial_pathway_target: format-1 module skill targets (trigger initial_pathway_target_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_target")
@IdClass(InitialPathwayTargetEntity.Key.class)
@DynamicInsert
public class InitialPathwayTargetEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Id
    @Column(name = "revision")
    private Long revision;
    @Id
    @Column(name = "module_id")
    private String moduleId;
    @Id
    @Column(name = "skill_id")
    private String skillId;
    @Column(name = "instruction_level", nullable = false)
    private String instructionLevel;
    @Column(name = "suitability_version", nullable = false)
    private String suitabilityVersion;
    @Column(name = "reason", nullable = false)
    private String reason;

    protected InitialPathwayTargetEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayTargetEntity(UUID requestId, Long revision, String moduleId, String skillId, String instructionLevel, String suitabilityVersion, String reason) {
        this.requestId = requestId;
        this.revision = revision;
        this.moduleId = moduleId;
        this.skillId = skillId;
        this.instructionLevel = instructionLevel;
        this.suitabilityVersion = suitabilityVersion;
        this.reason = reason;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public String getModuleId() { return moduleId; }
    public String getSkillId() { return skillId; }
    public String getInstructionLevel() { return instructionLevel; }
    public String getSuitabilityVersion() { return suitabilityVersion; }
    public String getReason() { return reason; }

    public record Key(UUID requestId, Long revision, String moduleId, String skillId) implements Serializable {
        public Key() {
            this(null, null, null, null);
        }
    }
}
