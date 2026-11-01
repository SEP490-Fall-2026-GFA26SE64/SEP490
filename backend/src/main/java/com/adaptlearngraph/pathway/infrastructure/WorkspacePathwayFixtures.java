package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.learning.infrastructure.WorkspaceCatalogFixture;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.ReleaseAuthority;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Temporary owner inputs selected by trusted tenant. No planner, scores, approvals or learner state are fabricated. */
final class WorkspacePathwayFixtures {
    private record Key(UUID organization,String occupation) {}
    private final WorkspaceCatalogFixture fixture;
    private final ReleaseAuthority releases;
    private final Map<Key,List<Semantics>> semantics;
    private final Map<UUID,LocalSeedPlanning> planning;
    private final Map<UUID,LocalPathwayAssignments> assignments;
    WorkspacePathwayFixtures(WorkspaceCatalogFixture fixture,ReleaseAuthority releases,NamedParameterJdbcTemplate jdbc,
            ObjectMapper json,Profiles profiles,Environment env) {
        this.fixture=fixture;this.releases=releases;
        var semantics=new HashMap<Key,List<Semantics>>();var assignments=new HashMap<UUID,LocalPathwayAssignments>();
        var planning=new HashMap<UUID,LocalSeedPlanning>();
        try {
            byte[] seed=Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
            var root=json.readTree(seed);
            for(var bank:fixture.banks()) {
                boolean se="OCC-15-1252.00".equals(bank.occupationId());
                byte[] original=se?seed:Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.history-v08-file","/seed/baseline-history-v08.json")));
                byte[] questions=se?com.adaptlearngraph.assessment.infrastructure.SoftwareDevelopmentSeed.bankBytes():Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.bank-v08-file","/seed/baseline-bank-v08.json")));
                byte[] previous=se?seed:Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.history-v010-file","/seed/baseline-history-v010.json")));
                var metadata=fixture.workspaces().get(bank.organizationId()).nodeMetadata();
                var ownSource=LocalSeedSemantics.workspace(json,bank.organizationId(),seed,original,questions,previous,se,bank.bankId(),metadata);
                if(!fixture.matches(bank.organizationId(),bank.occupationId(),ownSource.fingerprint()))throw new IllegalStateException("Fixture provenance fingerprint mismatch");
                Semantics originalSource=LocalSeedSemantics.workspace(json,bank.organizationId(),seed,original,questions,previous,se,null,metadata);
                semantics.put(new Key(bank.organizationId(),bank.occupationId()),List.of(
                        ownSource,originalSource));
            }
            this.semantics=Map.copyOf(semantics);
            for(var entry:fixture.workspaces().entrySet()) {
                UUID org=entry.getKey();var roleIds=new HashSet<String>();
                for(var role:root.path("TargetRoles"))if(fixture.permits(org,role.path("occupationId").asText()))roleIds.add(role.path("id").asText());
                if(roleIds.isEmpty())throw new IllegalStateException("Workspace fixture has no exact Role membership");
                assignments.put(org,new LocalPathwayAssignments(jdbc,org,entry.getValue().expertId(),roleIds,
                        InitialPathwayComponents.integer(env,"local-assignment.max-pathways"),true));
                planning.put(org,new LocalSeedPlanning(json,seed,profiles,semantics(),true,org));
            }
        }catch(java.io.IOException invalid){throw new IllegalStateException("Workspace pathway source unavailable",invalid);}
        this.assignments=Map.copyOf(assignments);this.planning=Map.copyOf(planning);
    }
    private void require(Scope scope,Binding binding) {
        releases.assertCurrent(scope,com.adaptlearngraph.pathway.application.InitialCatalogPort.RoleReference.from(scope,binding));
        if(!fixture.permits(scope.organizationId(),binding.occupationId()))throw new Failure(403,"FORBIDDEN",false);
    }
    Semantics semantics() {
        return new Semantics() {
            public Compatibility resolve(Binding b,Profile p){throw new Failure(503,"TRUSTED_SEMANTIC_SCOPE_REQUIRED",false);}
            @Override public Compatibility resolve(Scope scope,Binding b,Profile p) {
                require(scope,b);var source=semantics.get(new Key(scope.organizationId(),b.occupationId()));
                if(source==null)throw new Failure(503,"SEMANTIC_COMPATIBILITY_NOT_CONFIGURED",false);
                for(var candidate:source) {
                    try{return candidate.resolve(b,p);}
                    catch(Failure unsupported){if(!"PROFILE_CATALOG_NOT_SUPPORTED".equals(unsupported.code()))throw unsupported;}
                }
                throw new Failure(503,"PROFILE_CATALOG_NOT_SUPPORTED",false);
            }
        };
    }
    private LocalSeedPlanning planning(Scope scope) {
        var input=planning.get(scope.organizationId());if(input==null)throw new Failure(503,"PLANNING_INPUTS_NOT_CONFIGURED",false);return input;
    }
    ReadinessDefinitions readiness() {
        return new ReadinessDefinitions() {
            public PrerequisiteNeed prerequisite(Scope scope,Binding b,Edge e){require(scope,b);return planning(scope).prerequisite(scope,b,e);}
            public Optional<GateDefinition> gate(Scope scope,Binding b,Provider p,Edge e){require(scope,b);return planning(scope).gate(scope,b,p,e);}
        };
    }
    Availability content(){return (scope,module,version)->planning(scope).available(scope,module,version);}
    private LocalPathwayAssignments assignments(UUID org) {
        var input=assignments.get(org);if(input==null)throw new Failure(503,"REVIEW_ASSIGNMENT_NOT_CONFIGURED",false);return input;
    }
    ReviewAssignments reviews() {
        return new ReviewAssignments() {
            public Assignment require(Actor actor,UUID id){return assignments(actor.organizationId()).require(actor,id);}
            public Set<UUID> assignedPathways(Actor actor){return assignments(actor.organizationId()).assignedPathways(actor);}
            public void requireApprovalValid(Scope scope,UUID id,long revision,String hash){assignments(scope.organizationId()).requireApprovalValid(scope,id,revision,hash);}
        };
    }
}
