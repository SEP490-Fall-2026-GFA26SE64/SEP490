package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.Codec;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.RoleReferences;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.ReleaseAuthority;
import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import com.adaptlearngraph.learning.infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Shared factories; only concrete profile configurations activate these beans. */
abstract class InitialPathwayComponents {
    @Bean Codec initialCodec(ObjectMapper mapper) {
        return new InitialRevisionCodec(mapper);
    }
    @Bean Coordination initialCoordination(CurrentRoleSelectionStore store,com.adaptlearngraph.learning.application.RoleBaselineFlow.Catalog catalog) { return new CurrentSelectionCoordination(store,catalog); }
    @Bean Profiles initialProfiles(DataSource source,ObjectMapper mapper) { return new JdbcInitialProfiles(new NamedParameterJdbcTemplate(source),mapper); }
    @Bean InitialPathwayStore initialStore(DataSource source,Codec codec,PlatformTransactionManager manager,Environment environment) {
        return new JdbcInitialPathways(new NamedParameterJdbcTemplate(source),codec,new TransactionTemplate(manager),
                environment.acceptsProfiles(org.springframework.core.env.Profiles.of("workspace-baseline & !local-baseline-demo & !prod")));
    }
    @Bean Receipts initialReceipts(DataSource source) { return new JdbcInitialReceipts(new NamedParameterJdbcTemplate(source)); }
    @Bean @ConditionalOnMissingBean(ReleaseAuthority.class) ReleaseAuthority initialReleaseAuthority(org.neo4j.driver.Driver driver,Environment env) {
        if(localFixtures(env) && env.getProperty("pathway.initial.catalog.allow-review-seed",Boolean.class,false)) {
            try{return new LocalReviewCatalogRelease(driver,LocalDemoIdentity.ORG,java.nio.file.Files.readAllBytes(
                    java.nio.file.Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))),
                    env.getProperty("pathway.initial.readiness.version"));}
            catch(java.io.IOException invalid){throw new IllegalStateException("Local review seed unavailable",invalid);}
        }
        return new ReleaseAuthority() {
            public InitialCatalogPort.Release require(Scope scope){throw missing("CATALOG_RELEASE_NOT_CONFIGURED");}
            public void assertCurrent(Scope s,InitialCatalogPort.RoleReference ref){throw missing("CATALOG_COHERENCE_NOT_CONFIGURED");}
        };
    }
    @Bean @ConditionalOnMissingBean(RoleReferences.class)
    RoleReferences initialRoleReferences(com.adaptlearngraph.learning.application.RoleBaselineFlow.Catalog catalog,ReleaseAuthority releases){return new CurrentCatalogRoleReferences(catalog,releases);}
    @Bean @ConditionalOnMissingBean(Neo4jInitialGraph.PublishedSessions.class)
    Neo4jInitialGraph.PublishedSessions initialPublishedSessions(ReleaseAuthority releases){
        if(releases instanceof LocalReviewCatalogRelease local)return new LocalReviewSessions(local);
        return (s,r)->{throw missing("CATALOG_RELEASE_NOT_CONFIGURED");};
    }
    private record LocalReviewSessions(LocalReviewCatalogRelease release) implements Neo4jInitialGraph.PublishedSessions {
        public org.neo4j.driver.Session open(Scope scope,InitialCatalogPort.RoleReference ref){return release.open(scope,ref);}
    }
    @Bean @ConditionalOnMissingBean(Bindings.class)
    Bindings initialCatalogBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,Environment env) {
        return new Neo4jInitialBindings(references,sessions,()->{
            try{return integer(env,"catalog.max-requirement-rows");}
            catch(RuntimeException invalid){throw missing("CATALOG_READ_LIMIT_NOT_CONFIGURED");}
        },sessions instanceof LocalReviewSessions);
    }
    @Bean @ConditionalOnMissingBean(Semantics.class) Semantics initialSemantics(ReleaseAuthority releases,ObjectMapper json,Environment env) {
        if(releases instanceof LocalReviewCatalogRelease) {
            try{return new LocalSeedSemantics(json,LocalDemoIdentity.ORG,
                    java.nio.file.Files.readAllBytes(java.nio.file.Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))),
                    java.nio.file.Files.readAllBytes(java.nio.file.Path.of(env.getProperty("pathway.initial.catalog.history-v08-file","/seed/baseline-history-v08.json"))),
                    java.nio.file.Files.readAllBytes(java.nio.file.Path.of(env.getProperty("pathway.initial.catalog.bank-v08-file","/seed/baseline-bank-v08.json"))),
                    java.nio.file.Files.readAllBytes(java.nio.file.Path.of(env.getProperty("pathway.initial.catalog.history-v010-file","/seed/baseline-history-v010.json"))));}
            catch(java.io.IOException invalid){throw new IllegalStateException("Local compatibility source unavailable",invalid);}
        }
        return (b,p)->{throw missing("SEMANTIC_COMPATIBILITY_NOT_CONFIGURED");};
    }
    @Bean @ConditionalOnMissingBean(Graphs.class) Graphs initialCatalogGraph(Neo4jInitialGraph.PublishedSessions sessions){return new Neo4jInitialGraph(sessions,sessions instanceof LocalReviewSessions);}
    @Bean @ConditionalOnMissingBean(SuitabilityPolicy.class) SuitabilityPolicy initialSuitability(){return new MasterySuitabilityPolicy();}
    private LocalSeedPlanning localPlanning(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env) {
        if(!LocalSeedPlanning.VERSION.equals(env.getProperty("pathway.initial.readiness.version")))
            throw new IllegalStateException("Local planning requires its exact policy version");
        try{return new LocalSeedPlanning(json,java.nio.file.Files.readAllBytes(java.nio.file.Path.of(
                env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json"))),profiles,semantics);}
        catch(java.io.IOException invalid){throw new IllegalStateException("Local planning source unavailable",invalid);}
    }
    @Bean @ConditionalOnMissingBean(ReadinessDefinitions.class) ReadinessDefinitions initialReadinessDefinitions(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env){
        if(localFixtures(env) && env.getProperty("pathway.initial.local-planning.enabled",Boolean.class,false)) {
            var policy=localPlanning(json,profiles,semantics,env);
            return new ReadinessDefinitions() {
                public PrerequisiteNeed prerequisite(Scope s,Binding b,com.adaptlearngraph.recommendation.domain.InitialPlanning.Edge e){return policy.prerequisite(s,b,e);}
                public Optional<com.adaptlearngraph.recommendation.domain.InitialPlanning.GateDefinition> gate(Scope s,Binding b,Provider p,com.adaptlearngraph.recommendation.domain.InitialPlanning.Edge e){return policy.gate(s,b,p,e);}
            };
        }
        return new ReadinessDefinitions(){
            public PrerequisiteNeed prerequisite(Scope s,Binding b,com.adaptlearngraph.recommendation.domain.InitialPlanning.Edge e){throw missing("READINESS_DEFINITIONS_NOT_CONFIGURED");}
            public Optional<com.adaptlearngraph.recommendation.domain.InitialPlanning.GateDefinition> gate(Scope s,Binding b,Provider p,com.adaptlearngraph.recommendation.domain.InitialPlanning.Edge e){throw missing("READINESS_DEFINITIONS_NOT_CONFIGURED");}
        };
    }
    @Bean @ConditionalOnMissingBean(ReviewAssignments.class) ReviewAssignments initialAssignments(DataSource source,Environment env){
        if(localFixtures(env) && env.getProperty("pathway.initial.local-assignment.enabled",Boolean.class,false)) {
            try {
                boolean workspace=com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace.enabled(env);
                UUID expert=workspace ? com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace.id("expert")
                        : UUID.fromString(env.getRequiredProperty("pathway.local-auth-bypass.expert-account-id"));
                var roles=new TreeSet<String>();
                for(String role:env.getProperty("pathway.initial.local-assignment.role-ids","").split(","))if(!role.isBlank())roles.add(role.trim());
                return new LocalPathwayAssignments(new NamedParameterJdbcTemplate(source),LocalDemoIdentity.ORG,expert,roles,integer(env,"local-assignment.max-pathways"),workspace);
            }catch(IllegalArgumentException invalid){throw new IllegalStateException("Local pathway assignment configuration invalid",invalid);}
        }
        return new ReviewAssignments(){
            public Assignment require(Actor a,UUID id){throw missing("REVIEW_ASSIGNMENT_NOT_CONFIGURED");}
            public Set<UUID> assignedPathways(Actor a){throw missing("REVIEW_ASSIGNMENT_NOT_CONFIGURED");}
            public void requireApprovalValid(Scope s,UUID id,long revision,String hash){throw missing("APPROVAL_VALIDITY_NOT_CONFIGURED");}
        };
    }
    @Bean @ConditionalOnMissingBean(Availability.class) Availability initialContent(ObjectMapper json,Profiles profiles,Semantics semantics,Environment env){
        if(localFixtures(env) && env.getProperty("pathway.initial.local-planning.enabled",Boolean.class,false))return localPlanning(json,profiles,semantics,env)::available;
        return (s,m,v)->{throw missing("CONTENT_AVAILABILITY_NOT_CONFIGURED");};
    }
    @Bean @ConditionalOnMissingBean(LiveReadiness.class) LiveReadiness unavailableInitialReadiness(){return (s,g)->{throw missing("LIVE_READINESS_NOT_CONFIGURED");};}
    @Bean @ConditionalOnMissingBean(ContentAccess.class) ContentAccess unavailableInitialEntry(){return (s,m,v,g)->{throw missing("CONTENT_ACCESS_NOT_CONFIGURED");};}
    static Failure missing(String code){return new Failure(503,code,false);}
    private static boolean localFixtures(Environment env) {
        return com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace.enabled(env)
                || env.acceptsProfiles(org.springframework.core.env.Profiles.of("local-baseline-demo & !workspace-baseline & !prod"))
                && env.getProperty("pathway.local-auth-bypass.enabled",Boolean.class,false)
                && env.getProperty("assessment.baseline.local-demo.enabled",Boolean.class,false);
    }
    static Limits limits(Environment env) {
        try{return new Limits(required(env,"search.version"),integer(env,"search.max-closure-nodes"),integer(env,"search.max-closure-edges"),
                integer(env,"search.max-providers"),integer(env,"search.batch-size"),Long.parseLong(required(env,"search.max-states")));}
        catch(RuntimeException invalid){throw missing("PATHWAY_CONFIGURATION_NOT_CONFIGURED");}
    }
    static String required(Environment env,String name){String value=env.getProperty("pathway.initial."+name);if(value==null || value.isBlank())throw new IllegalArgumentException("Missing pathway configuration");return value;}
    static int integer(Environment env,String name){return Integer.parseInt(required(env,name));}
    @Bean RoleGapPreview initialGapPreview(Actors a,Bindings b,Profiles p,Semantics s,Coordination c){return new RoleGapPreview(a,b,p,s,c);}
    @Bean InitialProblemBuilder initialProblemBuilder(Graphs g,SuitabilityPolicy p,ReadinessDefinitions r,Availability a,Environment env){
        // Delayed limits keep read-only gap preview available when dispatch configuration is absent.
        return new InitialProblemBuilder(g,p,r,a,()->limits(env));
    }
    @Bean InitialPathwayAdmission initialAdmission(Actors a,Coordination c,Bindings b,RoleGapPreview g,InitialPathwayStore s,Receipts r,Codec j,Environment env){return new InitialPathwayAdmission(a,c,b,g,s,r,j,()->limits(env));}
    @Bean InitialPathwayReview initialReview(Actors a,ReviewAssignments r,InitialPathwayStore s,Coordination c,Bindings b,InitialProblemBuilder p,Receipts receipts,Codec j,Environment env){return new InitialPathwayReview(a,r,s,c,b,p,receipts,j,()->limits(env));}
    @Bean InitialPathwayAccess initialAccess(Actors a,Coordination c,InitialPathwayStore s,ReviewAssignments r,Bindings b,Availability v,LiveReadiness l,ContentAccess content){return new InitialPathwayAccess(a,c,s,r,b,v,l,content);}
    @Bean InitialPathwayView initialView(Actors a,InitialPathwayStore s,Coordination c,InitialPathwayAccess access){return new InitialPathwayView(a,s,c,access);}
}
