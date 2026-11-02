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

/** platform.initial_pathway_dependency: readiness gates of an initial pathway revision (trigger initial_pathway_dependency_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_dependency")
@IdClass(InitialPathwayDependencyEntity.Key.class)
@DynamicInsert
public class InitialPathwayDependencyEntity {
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
    @Column(name = "dependent_skill_id")
    private String dependentSkillId;
    @Id
    @Column(name = "prerequisite_skill_id")
    private String prerequisiteSkillId;
    @Column(name = "provider_module_id")
    private String providerModuleId;
    @Column(name = "gate_definition_id", nullable = false)
    private String gateDefinitionId;
    @Column(name = "gate_version", nullable = false)
    private String gateVersion;
    @Column(name = "internal_gate_id")
    private String internalGateId;

    protected InitialPathwayDependencyEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayDependencyEntity(UUID requestId, Long revision, String moduleId, String dependentSkillId, String prerequisiteSkillId, String providerModuleId, String gateDefinitionId, String gateVersion, String internalGateId) {
        this.requestId = requestId;
        this.revision = revision;
        this.moduleId = moduleId;
        this.dependentSkillId = dependentSkillId;
        this.prerequisiteSkillId = prerequisiteSkillId;
        this.providerModuleId = providerModuleId;
        this.gateDefinitionId = gateDefinitionId;
        this.gateVersion = gateVersion;
        this.internalGateId = internalGateId;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public String getModuleId() { return moduleId; }
    public String getDependentSkillId() { return dependentSkillId; }
    public String getPrerequisiteSkillId() { return prerequisiteSkillId; }
    public String getProviderModuleId() { return providerModuleId; }
    public String getGateDefinitionId() { return gateDefinitionId; }
    public String getGateVersion() { return gateVersion; }
    public String getInternalGateId() { return internalGateId; }

    public record Key(UUID requestId, Long revision, String moduleId, String dependentSkillId, String prerequisiteSkillId) implements Serializable {
        public Key() {
            this(null, null, null, null, null);
        }
    }
}
