package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import com.adaptlearngraph.assessment.infrastructure.LocalCatalogBootstrap;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialIdentity;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** TMP-REQ001-10: explicit planning-only local policy, never learning readiness PASS. */
final class LocalSeedPlanning implements ReadinessDefinitions, Availability {
    static final String VERSION="local-baseline-prerequisite-v1";
    private final Profiles profiles;
    private final Semantics semantics;
    private final Map<String,String> modules;
    private final Set<Edge> edges;

    LocalSeedPlanning(ObjectMapper json,byte[] seed,Profiles profiles,Semantics semantics) throws java.io.IOException {
        this(json,seed,profiles,semantics,false);
    }
    LocalSeedPlanning(ObjectMapper json,byte[] seed,Profiles profiles,Semantics semantics,boolean softwareDevelopment) throws java.io.IOException {
        // Constructor checks the exact source hash and catalog invariants; no DB mutation.
        new LocalCatalogBootstrap(seed);
        this.profiles=profiles;this.semantics=semantics;
        var root=json.readTree(seed);
        if(softwareDevelopment) for(var edge:com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed.supplement().path("relationships"))
            ((com.fasterxml.jackson.databind.node.ArrayNode)root.path("relationships")).add(edge);
        var inventory=new TreeMap<String,String>();var prerequisites=new HashSet<Edge>();
        for(var module:root.path("LearningModules"))if("ACTIVE".equals(module.path("status").asText()))
            inventory.put(module.path("id").asText(),module.path("contentVersion").asText());
        for(var relation:root.path("relationships"))if("HAS_SKILL_PREREQUISITE".equals(relation.path("type").asText())
                && "ACTIVE".equals(relation.path("status").asText()))
            prerequisites.add(new Edge(relation.path("fromId").asText(),relation.path("toId").asText(),relation.path("requiredScore").decimalValue()));
        modules=Map.copyOf(inventory);edges=Set.copyOf(prerequisites);
    }
    private void authorize(Scope scope) {
        if(!LocalDemoIdentity.ORG.equals(scope.organizationId()))throw new Failure(403,"FORBIDDEN",false);
    }
    private void require(Scope scope,Binding binding,Edge edge) {
        authorize(scope);
        if(!VERSION.equals(binding.versions().get("readiness")) || !LocalCatalogBootstrap.VERSION.equals(binding.versions().get("catalog")))
            throw new Failure(503,"LOCAL_PLANNING_VERSION_UNAVAILABLE",false);
        if(edges.stream().noneMatch(e->e.dependentSkillId().equals(edge.dependentSkillId())
                && e.prerequisiteSkillId().equals(edge.prerequisiteSkillId()) && e.requiredScore().compareTo(edge.requiredScore())==0))
            throw new Failure(503,"LOCAL_PREREQUISITE_SOURCE_MISMATCH",false);
    }
    @Override public boolean available(Scope scope,String moduleId,String contentVersion) {
        authorize(scope);return contentVersion!=null && contentVersion.equals(modules.get(moduleId));
    }
    @Override public PrerequisiteNeed prerequisite(Scope scope,Binding binding,Edge edge) {
        require(scope,binding,edge);
        var profile=profiles.require(scope,binding.occupationId());var compatible=semantics.resolve(binding,profile);
        var evidence=compatible.compatible().get(edge.prerequisiteSkillId());
        var mastery=evidence==null?null:evidence.mastery();
        String reason=mastery==null?compatible.unknownReasons().getOrDefault(edge.prerequisiteSkillId(),"NOT_IN_ORIGINAL_PROFILE"):null;
        String identity=InitialIdentity.hash("local-prerequisite-evidence-v1",Arrays.asList(scope.organizationId(),scope.learnerId(),
                profile.profileHash(),compatible.version(),edge.dependentSkillId(),edge.prerequisiteSkillId(),edge.requiredScore(),mastery,reason,VERSION));
        return new PrerequisiteNeed(mastery==null || mastery.compareTo(edge.requiredScore())<0,mastery==null,identity,mastery,reason);
    }
    @Override public Optional<GateDefinition> gate(Scope scope,Binding binding,Provider provider,Edge edge) {
        require(scope,binding,edge);
        if(!available(scope,provider.moduleId(),provider.contentVersion()) || !provider.skillId().equals(edge.dependentSkillId()))return Optional.empty();
        String id="local-planning:"+InitialIdentity.hash("local-external-gate-v1",List.of(LocalCatalogBootstrap.SOURCE_HASH,
                provider.moduleId(),provider.contentVersion(),edge.dependentSkillId(),edge.prerequisiteSkillId(),edge.requiredScore()));
        // Null internal gate deliberately makes a shared prerequisite/dependent module invalid.
        return Optional.of(new GateDefinition(provider.moduleId(),edge.dependentSkillId(),edge.prerequisiteSkillId(),id,VERSION,null));
    }
}
