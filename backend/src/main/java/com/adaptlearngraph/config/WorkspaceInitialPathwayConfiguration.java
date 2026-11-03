package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.CatalogRoleReviewAssignments;
import com.adaptlearngraph.repository.CurrentCatalogRoleReferences;
import com.adaptlearngraph.repository.InitialPathwayRepositories;
import com.adaptlearngraph.repository.LocalSeedPlanning;
import com.adaptlearngraph.repository.MainDevelopmentCatalogRelease;
import com.adaptlearngraph.repository.Neo4jInitialBindings;
import com.adaptlearngraph.repository.Neo4jInitialGraph;
import com.adaptlearngraph.repository.WorkspaceFixtureCatalogRelease;
import com.adaptlearngraph.repository.WorkspacePathwayActors;
import com.adaptlearngraph.repository.InitialPathwayPorts.Actors;
import com.adaptlearngraph.repository.InitialPathwayPorts.Bindings;
import com.adaptlearngraph.repository.InitialPathwayPorts.Profiles;
import com.adaptlearngraph.repository.InitialPathwayPorts.Semantics;
import com.adaptlearngraph.repository.InitialPathwayPorts.ReviewAssignments;
import com.adaptlearngraph.repository.InitialPathwayPorts.Actor;
import com.adaptlearngraph.repository.InitialPathwayPorts.Assignment;
import com.adaptlearngraph.repository.InitialPathwayPorts.Scope;
import com.adaptlearngraph.repository.InitialPathwayPorts.Binding;
import com.adaptlearngraph.repository.InitialPlanningPorts.Provider;
import com.adaptlearngraph.repository.InitialPlanningPorts.PrerequisiteNeed;
import com.adaptlearngraph.repository.InitialCatalogPort.*;
import com.adaptlearngraph.repository.InitialPlanningPorts.Graphs;
import com.adaptlearngraph.repository.InitialPlanningPorts.ReadinessDefinitions;
import com.adaptlearngraph.repository.InitialPlanningPorts.Availability;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import com.adaptlearngraph.repository.Neo4jCypher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;

/** Real workspace identity only. Local persona configuration is mutually excluded. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
@Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
public class WorkspaceInitialPathwayConfiguration extends InitialPathwayComponents {
    private final WorkspaceCatalogFixture fixture;
    @Autowired private ObjectProvider<WorkspacePathwayFixtures> fixtureInputs;
    @Autowired private com.adaptlearngraph.repository.AuthoredCatalogPort authoredCatalog;
    @Autowired private ObjectMapper catalogJson;
    @Autowired private ObjectProvider<ReleaseAuthority> releaseInputs;
    @Autowired private Neo4jCypher catalogGraph;
    public WorkspaceInitialPathwayConfiguration(WorkspaceCatalogFixture fixture){this.fixture=fixture;}
    @Bean @Override @ConditionalOnMissingBean(RoleReferences.class)
    RoleReferences initialRoleReferences(com.adaptlearngraph.services.RoleBaselineFlow.Catalog catalog,ReleaseAuthority releases){
        return new CurrentCatalogRoleReferences(catalog,releases,authoredCatalog);
    }
    @Bean @Override @ConditionalOnMissingBean(ReleaseAuthority.class)
    ReleaseAuthority initialReleaseAuthority(Neo4jCypher graph,Environment env) {
        if(!fixture.active() && com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(env)
                && env.getProperty("pathway.initial.catalog.allow-review-seed",Boolean.class,false))
            return new MainDevelopmentCatalogRelease(graph,catalogJson,env);
        if(!fixture.active())return new ReleaseAuthority(){
            public Release require(Scope scope){throw missing("CATALOG_RELEASE_NOT_CONFIGURED");}
            public void assertCurrent(Scope scope,RoleReference ref){throw missing("CATALOG_COHERENCE_NOT_CONFIGURED");}
        };
        try{return new WorkspaceFixtureCatalogRelease(graph,fixture,java.nio.file.Files.readAllBytes(java.nio.file.Path.of(
                env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))),
                env.getProperty("pathway.initial.readiness.version"));}
        catch(java.io.IOException invalid){throw new IllegalStateException("Workspace fixture catalog unavailable",invalid);}
    }
    @Bean @Override @ConditionalOnMissingBean(Neo4jInitialGraph.PublishedSessions.class)
    Neo4jInitialGraph.PublishedSessions initialPublishedSessions(ReleaseAuthority releases) {
        if(releases instanceof MainDevelopmentCatalogRelease main)return new MainDevelopmentCatalogRelease.Sessions(main);
        return releases instanceof WorkspaceFixtureCatalogRelease workspace ? new WorkspaceFixtureCatalogRelease.Sessions(workspace)
                :(scope,reference)->{throw missing("CATALOG_RELEASE_NOT_CONFIGURED");};
    }
    @Bean @Override @ConditionalOnMissingBean(Bindings.class)
    Bindings initialCatalogBindings(RoleReferences refs,Neo4jInitialGraph.PublishedSessions sessions,Environment env) {
        return new Neo4jInitialBindings(refs,sessions,()->{
            try{return integer(env,"catalog.max-requirement-rows");}
            catch(RuntimeException invalid){throw missing("CATALOG_READ_LIMIT_NOT_CONFIGURED");}
        },sessions instanceof WorkspaceFixtureCatalogRelease.Sessions || sessions instanceof MainDevelopmentCatalogRelease.Sessions,authoredCatalog);
    }
    @Bean @Override @ConditionalOnMissingBean(Graphs.class)
    Graphs initialCatalogGraph(Neo4jInitialGraph.PublishedSessions sessions) {
        return new Neo4jInitialGraph(sessions,sessions instanceof WorkspaceFixtureCatalogRelease.Sessions || sessions instanceof MainDevelopmentCatalogRelease.Sessions);
    }
    @Bean @ConditionalOnProperty(name="pathway.initial.workspace-fixture.enabled",havingValue="true")
    WorkspacePathwayFixtures workspacePathwayFixtures(ReleaseAuthority releases,InitialPathwayRepositories data,ObjectMapper json,Profiles profiles,Environment env) {
        return new WorkspacePathwayFixtures(fixture,releases,data,json,profiles,env);
    }
    @Bean @Override @ConditionalOnMissingBean(Semantics.class)
    Semantics initialSemantics(ReleaseAuthority releases,ObjectMapper json,Environment env) {
        if(releases instanceof MainDevelopmentCatalogRelease main)return main.semantics();
        return fixture.active()?fixtureInputs.getObject().semantics():(binding,profile)->{throw missing("SEMANTIC_COMPATIBILITY_NOT_CONFIGURED");};
    }
    @Bean @Override @ConditionalOnMissingBean(ReadinessDefinitions.class)
    ReadinessDefinitions initialReadinessDefinitions(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env) {
        if(fixture.active())return fixtureInputs.getObject().readiness();
        if(mainPlanningEnabled(env)) {
            var planning=mainPlanning(json,profiles,semantics,env);
            return new ReadinessDefinitions() {
                public PrerequisiteNeed prerequisite(Scope scope,Binding binding,com.adaptlearngraph.entities.domain.InitialPlanning.Edge edge){return planning.prerequisite(scope,binding,edge);}
                public java.util.Optional<com.adaptlearngraph.entities.domain.InitialPlanning.GateDefinition> gate(Scope scope,Binding binding,Provider provider,com.adaptlearngraph.entities.domain.InitialPlanning.Edge edge){return planning.gate(scope,binding,provider,edge);}
            };
        }
        return new ReadinessDefinitions(){
            public PrerequisiteNeed prerequisite(Scope scope,Binding binding,com.adaptlearngraph.entities.domain.InitialPlanning.Edge edge){throw missing("READINESS_DEFINITIONS_NOT_CONFIGURED");}
            public java.util.Optional<com.adaptlearngraph.entities.domain.InitialPlanning.GateDefinition> gate(Scope scope,Binding binding,Provider provider,com.adaptlearngraph.entities.domain.InitialPlanning.Edge edge){throw missing("READINESS_DEFINITIONS_NOT_CONFIGURED");}
        };
    }
    @Bean @Override @ConditionalOnMissingBean(Availability.class)
    Availability initialContent(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env) {
        if(!fixture.active() && mainPlanningEnabled(env)) {
            var planning=mainPlanning(json,profiles,semantics,env);
            return planning::available;
        }
        return fixture.active()?fixtureInputs.getObject().content():(scope,module,version)->{throw missing("CONTENT_AVAILABILITY_NOT_CONFIGURED");};
    }
    private boolean mainPlanningEnabled(Environment env) {
        return releaseInputs.getObject() instanceof MainDevelopmentCatalogRelease
                && env.getProperty("pathway.initial.local-planning.enabled",Boolean.class,false);
    }
    private LocalSeedPlanning mainPlanning(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env) {
        if(!LocalSeedPlanning.VERSION.equals(env.getProperty("pathway.initial.readiness.version")))throw missing("READINESS_DEFINITIONS_NOT_CONFIGURED");
        try {return new LocalSeedPlanning(json,java.nio.file.Files.readAllBytes(java.nio.file.Path.of(
                env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))),profiles,semantics,true,
                com.adaptlearngraph.config.MainDevelopmentBankSeed.ORGANIZATION);}
        catch(java.io.IOException invalid){throw new IllegalStateException("Main development planning source unavailable",invalid);}
    }
    @Bean @Override @ConditionalOnMissingBean(ReviewAssignments.class)
    ReviewAssignments initialAssignments(InitialPathwayRepositories data,Environment env) {
        if(fixture.active())return fixtureInputs.getObject().reviews();
        if(releaseInputs.getObject() instanceof MainDevelopmentCatalogRelease
                && env.getProperty("pathway.initial.local-assignment.enabled",Boolean.class,false)) {
            var roles=java.util.Arrays.stream(env.getProperty("pathway.initial.local-assignment.role-ids","").split(","))
                    .map(String::strip).filter(value->!value.isEmpty()).collect(java.util.stream.Collectors.toSet());
            return new CatalogRoleReviewAssignments(catalogGraph,data,integer(env,"local-assignment.max-pathways"),roles);
        }
        return new ReviewAssignments(){
            public Assignment require(Actor actor,java.util.UUID id){throw missing("REVIEW_ASSIGNMENT_NOT_CONFIGURED");}
            public java.util.Set<java.util.UUID> assignedPathways(Actor actor){throw missing("REVIEW_ASSIGNMENT_NOT_CONFIGURED");}
            public void requireApprovalValid(Scope scope,java.util.UUID id,long revision,String hash){throw missing("APPROVAL_VALIDITY_NOT_CONFIGURED");}
        };
    }
    @Bean Actors workspacePathwayActors(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces) {
        return new WorkspacePathwayActors(identity,workspaces);
    }
}
