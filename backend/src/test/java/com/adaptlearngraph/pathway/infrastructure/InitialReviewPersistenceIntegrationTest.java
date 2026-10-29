package com.adaptlearngraph.pathway.infrastructure;

import static org.assertj.core.api.Assertions.*;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.ORG;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.OCC;
import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.learning.infrastructure.CurrentRoleSelectionStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.neo4j.driver.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.*;

/** Real PG+Neo4j adapters/transactions; explicit versioned owner fixtures, not production owner integration. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class InitialReviewPersistenceIntegrationTest {
    final PostgreSQLContainer<?> pg=new PostgreSQLContainer<>("postgres:17.6-alpine");
    final Neo4jContainer<?> graph=new Neo4jContainer<>("neo4j:5.26-community");
    final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    final UUID expert=new UUID(0,2001);final Limits limits=new Limits("c3-fixture-limits",20,20,30,10,10000);
    final AtomicLong preparedStatements=new AtomicLong();
    Driver driver;JdbcTemplate sql;NamedParameterJdbcTemplate jdbc;TransactionTemplate tx;InitialRevisionCodec codec;
    JdbcInitialPathways store;JdbcInitialReceipts receipts;CurrentRoleSelectionStore selections;PathwayBaselineFixture baseline;
    Fixture retained;Map<String,String> before35,after35;List<Map<String,Object>> oldChecksums;Flyway flyway;
    final Map<String,String> versions=Map.of("catalog","fixture-v1","binding","fixture-binding-v1","publication","fixture-publication-v1","requirements","fixture-requirements-v1","compatibility","fixture-compatibility-v1","suitability",InitialSuitability.VERSION,"readiness","fixture-readiness-v1");
    @BeforeAll void setup(){
        pg.start();graph.start();driver=GraphDatabase.driver(graph.getBoltUrl(),AuthTokens.basic("neo4j",graph.getAdminPassword()));
        var ds=new CountingTestDataSource(new DriverManagerDataSource(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword()),preparedStatements);sql=new JdbcTemplate(ds);jdbc=new NamedParameterJdbcTemplate(ds);tx=new TransactionTemplate(new DataSourceTransactionManager(ds));codec=new InitialRevisionCodec(json);
        Flyway.configure().dataSource(ds).locations("classpath:db/workspace-migration").target("34").load().migrate();
        baseline=new PathwayBaselineFixture(ds,json);store=new JdbcInitialPathways(jdbc,codec,tx);receipts=new JdbcInitialReceipts(jdbc);selections=new CurrentRoleSelectionStore(jdbc,json,tx);seedGraph();
        sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,'c3-foreign-employee','c3-foreign-employee','test-only')",new UUID(0,2002),new UUID(0,2));
        sql.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",new UUID(0,2002));
        retained=new Fixture(true);retained.review.edit(retained.id,"retained-include",retained.edit("ALT"),true);retained.review.edit(retained.id,"retained-exclude",retained.edit("B"),false);retained.review.confirm(retained.id,"retained-confirm",retained.expected());
        before35=digest();oldChecksums=sql.queryForList("SELECT version,checksum FROM public.flyway_schema_history WHERE success ORDER BY installed_rank");
        flyway=Flyway.configure().dataSource(ds).locations("classpath:db/workspace-migration").load();flyway.migrate();after35=digest();
    }
    @AfterAll void stop(){if(driver!=null)driver.close();if(graph.isRunning())graph.stop();if(pg.isRunning())pg.stop();}
    void seedGraph(){try(var session=driver.session()){session.executeWrite(t->{t.run("""
        CREATE (o:Occupation {id:$occupation,name:'Fixture Occupation'}),(r:TargetRole {id:'role-a',name:'Role A'}),(l:Level {id:'level-a',name:'Fixture Level',attainmentRule:'ALL_MANDATORY_SKILLS'})
        CREATE (o)-[:HAS_ROLE {id:'owns-role'}]->(r),(r)-[:HAS_LEVEL {id:'owns-level'}]->(l)
        CREATE (s1:MicroSkill {id:'s1',name:'Skill s1'}),(s2:MicroSkill {id:'s2',name:'Skill s2'}),(s3:MicroSkill {id:'s3',name:'Skill s3'})
        CREATE (l)-[:REQUIRES_SKILL {id:'need-s1',requiredScore:1.0,isMandatory:true}]->(s1),(l)-[:REQUIRES_SKILL {id:'need-s2',requiredScore:1.0,isMandatory:true}]->(s2)
        CREATE (s1)-[:HAS_SKILL_PREREQUISITE {id:'requires-s3',requiredScore:1.0}]->(s3)
        CREATE (a:LearningModule {id:'A',title:'Dependent A',contentVersion:'content-1',duration:10,price:100}),(b:LearningModule {id:'B',title:'Independent B',contentVersion:'content-1',duration:10,price:100}),
          (p:LearningModule {id:'P',title:'Provider P',contentVersion:'content-1',duration:10,price:100}),(alt:LearningModule {id:'ALT',title:'Alternative B',contentVersion:'content-1',duration:20,price:100})
        CREATE (a)-[:TEACHES {id:'teach-A',teachingFocus:'PRIMARY',difficultyLevel:'LOW'}]->(s1),(b)-[:TEACHES {id:'teach-B',teachingFocus:'PRIMARY',difficultyLevel:'LOW'}]->(s2),
          (p)-[:TEACHES {id:'teach-P',teachingFocus:'PRIMARY',difficultyLevel:'LOW'}]->(s3),(alt)-[:TEACHES {id:'teach-ALT',teachingFocus:'PRIMARY',difficultyLevel:'LOW'}]->(s2)
        CREATE (n:Level {id:'level-no-gap',name:'Fixture no-gap',attainmentRule:'ALL_MANDATORY_SKILLS'}),(r)-[:HAS_LEVEL {id:'owns-no-gap'}]->(n),
          (n)-[:REQUIRES_SKILL {id:'no-gap-s1',requiredScore:0.0,isMandatory:true}]->(s1),(n)-[:REQUIRES_SKILL {id:'no-gap-s2',requiredScore:0.0,isMandatory:true}]->(s2)
        CREATE (r2:TargetRole {id:'role-b',name:'Role B'}),(l2:Level {id:'level-b',name:'Other Level',attainmentRule:'ALL_MANDATORY_SKILLS'}),
          (o)-[:HAS_ROLE {id:'owns-role-b'}]->(r2),(r2)-[:HAS_LEVEL {id:'owns-level-b'}]->(l2),
          (l2)-[:REQUIRES_SKILL {id:'need-b-s2',requiredScore:1.0,isMandatory:true}]->(s2),(l2)-[:REQUIRES_SKILL {id:'need-b-s3',requiredScore:1.0,isMandatory:true}]->(s3)
        """,Map.of("occupation",OCC)).consume();
        t.run("MATCH (n) SET n.status='ACTIVE',n.version='fixture-v1',n.organizationId=$org,n.reviewStatus='APPROVED',n.reviewedBy='fixture-expert',n.reviewedAt='2026-10-29T00:00:00Z'",Map.of("org",ORG.toString())).consume();
        t.run("MATCH ()-[e]->() SET e.status='ACTIVE',e.version='fixture-v1',e.organizationId=$org,e.reviewStatus='APPROVED',e.reviewedBy='fixture-expert',e.reviewedAt='2026-10-29T00:00:00Z'",Map.of("org",ORG.toString())).consume();return null;});}}
    final class Fixture {
        final Scope scope;final UUID id;final AtomicReference<Actor> actor=new AtomicReference<>();final AtomicBoolean sourceCurrent=new AtomicBoolean(true);
        final Coordination coordination;final Bindings bindings;final InitialProblemBuilder builder;final InitialPathwayReview review;
        final ReadinessDefinitions definitions;final Availability availability;
        final Neo4jInitialGraph graphs=new Neo4jInitialGraph((s,r)->driver.session());
        Fixture(boolean publish){this(publish,"level-a");}
        Fixture(boolean publish,String selectedLevel){
            scope=new Scope(ORG,baseline.learner());actor.set(new Actor(ORG,scope.learnerId(),Role.EMPLOYEE));
            var profiles=new JdbcInitialProfiles(jdbc,json);
            var references=new RoleReferences(){public RoleReference require(Actor a,String role,String level){if(!ORG.equals(a.organizationId()) || !role.equals("role-a") || !Set.of("level-a","level-no-gap").contains(level))throw new Failure(404,"ROLE_NOT_AVAILABLE");return new RoleReference(ORG,InitialCatalogPort.choiceId(role,level),role,level,OCC,"fixture-f3-v1","fixture-release",versions);}
                public void assertCurrent(Scope s,RoleReference r){if(!sourceCurrent.get() || !ORG.equals(s.organizationId()) || !r.releaseToken().equals("fixture-release"))throw new Failure(503,"FIXTURE_SOURCE_DRIFT");}};
            bindings=new Neo4jInitialBindings(references,(s,r)->driver.session(),()->20);
            var skills=List.of(new RoleBaselineFlow.Skill("s1","s1","Skill s1",1,true),new RoleBaselineFlow.Skill("s2","s2","Skill s2",1,true));
            var zero=List.of(new RoleBaselineFlow.Skill("s1","s1","Skill s1",0,true),new RoleBaselineFlow.Skill("s2","s2","Skill s2",0,true));
            var role=new RoleBaselineFlow.Role("role-a","role-a","Role A","Fixture",OCC,"Fixture Occupation","fixture-v1","fixture-f3-v1",List.of(new RoleBaselineFlow.Level("level-a","level-a","Fixture Level",1,"Fixture","ALL_MANDATORY_SKILLS",skills),new RoleBaselineFlow.Level("level-no-gap","level-no-gap","Fixture no-gap",2,"Fixture","ALL_MANDATORY_SKILLS",zero)));
            coordination=new CurrentSelectionCoordination(selections,org->org.equals(ORG)?List.of(role):List.of());
            definitions=new ReadinessDefinitions(){public PrerequisiteNeed prerequisite(Scope s,Binding b,Edge e){var profile=profiles.require(s,OCC);var evidence=profile.evidence().get(e.prerequisiteSkillId());return new PrerequisiteNeed(evidence.mastery().compareTo(e.requiredScore())<0,false,InitialIdentity.hash("fixture-evidence",List.of(profile.profileHash(),e.prerequisiteSkillId(),e.requiredScore())),evidence.mastery(),null);}
                public Optional<GateDefinition> gate(Scope s,Binding b,Provider p,Edge e){return Optional.of(new GateDefinition(p.moduleId(),e.dependentSkillId(),e.prerequisiteSkillId(),"fixture-gate:"+p.moduleId(),versions.get("readiness"),null));}};
            availability=(s,m,v)->{try(var session=driver.session()){return session.executeRead(t->t.run("MATCH (m:LearningModule {id:$id,contentVersion:$version,status:'ACTIVE',organizationId:$org}) RETURN count(m)=1 AS available",Map.of("id",m,"version",v,"org",s.organizationId().toString())).single().get("available").asBoolean());}};
            builder=new InitialProblemBuilder(graphs,new MasterySuitabilityPolicy(),definitions,availability,limits);
            var gap=new RoleGapPreview(actor::get,bindings,profiles,(b,p)->new Compatibility(p.evidence(),Map.of(),versions.get("compatibility")),coordination);
            var input=gap.preview("role-a",selectedLevel);
            var admission=new InitialPathwayAdmission(actor::get,coordination,bindings,gap,store,receipts,codec,()->limits);
            var accepted=admission.confirm("admit",new InitialPathwayAdmission.Confirm("role-a",selectedLevel,input.expectedSelectionId(),input.expectedSelectionRevision(),input.gapInputHash()));
            id=UUID.fromString(codec.decode(accepted.responseJson(),Map.class).get("requestId").toString());
            actor.set(new Actor(ORG,expert,Role.DOMAIN_EXPERT));review=reviewWith(builder,coordination);
            if(publish){dispatch(coordination).runOne();assertThat(current().generation()).isEqualTo(selectedLevel.equals("level-no-gap")?Generation.NO_LEARNING_REQUIRED:Generation.SUCCEEDED);}
        }
        InitialPathwayReview reviewWith(InitialProblemBuilder p,Coordination c){return new InitialPathwayReview(actor::get,new LocalPathwayAssignments(jdbc,ORG,expert,Set.of("role-a"),1000),store,c,bindings,p,receipts,codec,()->limits);}
        InitialPathwayDispatch dispatch(Coordination c){return new InitialPathwayDispatch(store,c,bindings,builder,new InitialPathwayDispatch.Settings("fixture-dispatch",limits,Duration.ofMinutes(5),3,Duration.ofMillis(1),Duration.ofSeconds(1)));}
        InitialPathwayReview synchronizedReview(){var barrier=new CyclicBarrier(2);Graphs synchronizedGraph=(s,b,n,l)->{var result=graphs.load(s,b,n,l);try{barrier.await(15,TimeUnit.SECONDS);}catch(Exception failure){throw new IllegalStateException("planning barrier failed",failure);}return result;};return reviewWith(new InitialProblemBuilder(synchronizedGraph,new MasterySuitabilityPolicy(),definitions,availability,limits),coordination);}
        Request current(){return store.request(scope,id).orElseThrow();}Revision revision(){var r=current();return store.revision(scope,id,r.revision());}
        InitialPathwayReview.Edit edit(String module){var r=current();return new InitialPathwayReview.Edit(module,r.revision(),r.contentHash(),"fixture");}
        InitialPathwayReview.Expected expected(){var r=current();return new InitialPathwayReview.Expected(r.revision(),r.contentHash());}
    }
    Map<String,String> digest(){var result=new TreeMap<String,String>();for(String table:sql.queryForList("SELECT tablename FROM pg_tables WHERE schemaname='platform' AND (tablename LIKE 'initial_%' OR tablename IN ('audit_event','outbox_event','employee_role_selection','employee_occupation_profile','baseline_attempt_response','baseline_attempt_skill_result')) ORDER BY tablename",String.class))result.put(table,sql.queryForObject("SELECT md5(coalesce(string_agg(to_jsonb(t)::text,',' ORDER BY to_jsonb(t)::text),'')) FROM platform."+table+" t",String.class));return result;}
    @Test void P19_v34ToV35PreservesFullExistingApprovedAggregateAndChecksums(){assertThat(after35).isEqualTo(before35);assertThat(sql.queryForList("SELECT version,checksum FROM public.flyway_schema_history WHERE success AND version::int<=34 ORDER BY installed_rank")).isEqualTo(oldChecksums);flyway.validate();assertThat(flyway.migrate().migrationsExecuted).isZero();assertThat(store.approved(retained.scope,retained.id,retained.current().revision(),retained.current().contentHash())).isTrue();}
    @Test void R03_R14_realMoveCheckRepairAndExactApprovalRetainOrdinalsAndHistory(){
        var f=new Fixture(true);assertThat(f.revision().plan().modules()).extracting(InitialPlanning.Module::id).containsExactly("B","P","A");
        var before=digest();assertThatThrownBy(()->f.review.move(f.id,"inversion",new InitialPathwayReview.Move("A","UP",f.current().revision(),f.current().contentHash(),null))).isInstanceOf(InitialReviewOrder.Rejected.class);assertThat(digest()).isEqualTo(before);
        f.review.move(f.id,"move",new InitialPathwayReview.Move("B","DOWN",f.current().revision(),f.current().contentHash(),null));assertThat(f.revision().plan().modules()).extracting(InitialPlanning.Module::id).containsExactly("P","B","A");
        assertThat(f.review.validate(f.id).revisionContentHash()).isEqualTo(f.current().contentHash());
        f.review.remove(f.id,"remove",f.edit("P"));assertThat(f.current().validation()).isEqualTo(Validation.UNRESOLVED);assertThatThrownBy(()->f.review.confirm(f.id,"invalid",f.expected())).hasMessage("INVALID_PATHWAY_DRAFT");
        f.review.edit(f.id,"repair",f.edit("P"),true);assertThat(f.revision().plan().modules()).extracting(InitialPlanning.Module::id).containsExactly("B","P","A");
        f.review.confirm(f.id,"approve",f.expected());assertThat(store.approved(f.scope,f.id,4,f.current().contentHash())).isTrue();
        assertThat(sql.queryForList("SELECT module_id FROM platform.initial_pathway_module WHERE request_id=? AND revision=4 ORDER BY ordinal",String.class,f.id)).containsExactly("B","P","A");
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_revision WHERE request_id=?",Long.class,f.id)).isEqualTo(4);
    }
    @Test void R10_distinctConcurrentEditsHaveOneCasWinnerAndOneStaleLoser() throws Exception {
        var f=new Fixture(true);var review=f.synchronizedReview();var expected=f.expected();
        try(var executor=Executors.newFixedThreadPool(2)){
            var include=executor.submit(()->outcome(()->review.edit(f.id,"race-include",new InitialPathwayReview.Edit("ALT",expected.expectedRevision(),expected.expectedContentHash(),null),true)));
            var remove=executor.submit(()->outcome(()->review.remove(f.id,"race-remove",new InitialPathwayReview.Edit("B",expected.expectedRevision(),expected.expectedContentHash(),null))));
            assertThat(List.of(include.get(30,TimeUnit.SECONDS),remove.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder("committed","STALE_REVISION");
        }
        assertThat(f.current().revision()).isEqualTo(2);assertThat(count("initial_pathway_revision",f.id)).isEqualTo(2);assertThat(count("initial_pathway_override",f.id)).isOne();assertThat(count("initial_pathway_approval",f.id)).isZero();assertThat(receiptCount(f.id)).isOne();
    }
    @Test void R10_editVersusConfirmNeverApprovesAnUnseenNewRevision() throws Exception {
        var f=new Fixture(true);var review=f.synchronizedReview();var expected=f.expected();
        try(var executor=Executors.newFixedThreadPool(2)){
            var edit=executor.submit(()->outcome(()->review.edit(f.id,"edit-confirm-race",new InitialPathwayReview.Edit("ALT",expected.expectedRevision(),expected.expectedContentHash(),null),true)));
            var confirm=executor.submit(()->outcome(()->review.confirm(f.id,"confirm-edit-race",expected)));
            assertThat(List.of(edit.get(30,TimeUnit.SECONDS),confirm.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder("committed","STALE_REVISION");
        }
        if(f.current().review()==Review.APPROVED){assertThat(f.current().revision()).isEqualTo(1);assertThat(count("initial_pathway_approval",f.id)).isOne();assertThat(count("initial_pathway_override",f.id)).isZero();}
        else {assertThat(f.current().revision()).isEqualTo(2);assertThat(count("initial_pathway_approval",f.id)).isZero();assertThat(count("initial_pathway_override",f.id)).isOne();}
        assertThat(receiptCount(f.id)).isOne();
    }
    @Test void R10_identicalConcurrentCommandReplaysOneRecordedOutcome() throws Exception {
        var f=new Fixture(true);var review=f.synchronizedReview();var command=f.edit("ALT");
        try(var executor=Executors.newFixedThreadPool(2)){
            var left=executor.submit(()->review.edit(f.id,"identical",command,true));var right=executor.submit(()->review.edit(f.id,"identical",command,true));
            var first=left.get(30,TimeUnit.SECONDS);var replay=right.get(30,TimeUnit.SECONDS);
            assertThat(replay.bodyHash()).isEqualTo(first.bodyHash());assertThat(json.readTree(replay.responseJson())).isEqualTo(json.readTree(first.responseJson()));
        }
        assertThat(f.current().revision()).isEqualTo(2);assertThat(count("initial_pathway_revision",f.id)).isEqualTo(2);assertThat(receiptCount(f.id)).isOne();
    }
    @Test void R11_oldReceiptAfterLaterEditAndBodyConflictDoNotReapply() throws Exception {
        var f=new Fixture(true);var old=f.edit("ALT");var accepted=f.review.edit(f.id,"old-key",old,true);f.review.remove(f.id,"later",f.edit("ALT"));
        var before=digest();var replay=f.review.edit(f.id,"old-key",old,true);
        assertThat(json.readTree(replay.responseJson())).isEqualTo(json.readTree(accepted.responseJson()));assertThat(json.readTree(replay.responseJson()).path("revision").asLong()).isEqualTo(2);
        assertThat(f.review.detail(f.id).summary().revision()).isEqualTo(3);
        assertThatThrownBy(()->f.review.edit(f.id,"new-stale",old,true)).hasMessage("STALE_REVISION");
        assertThatThrownBy(()->f.review.edit(f.id,"old-key",new InitialPathwayReview.Edit("ALT",old.expectedRevision(),old.expectedContentHash(),"changed-body"),true)).hasMessage("IDEMPOTENCY_CONFLICT");assertThat(digest()).isEqualTo(before);
    }
    @ParameterizedTest @ValueSource(strings={"EDIT","CONFIRM"})
    void R11_receiptWriteFailureRollsBackEntireEditOrApprovalThenSameKeyRecovers(String action) {
        var f=new Fixture(true);var before=digest();var edit=f.edit("ALT");var expected=f.expected();
        sql.execute("CREATE FUNCTION platform.c3_receipt_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.resource='"+f.id+"' THEN RAISE EXCEPTION 'C3_INJECTED_AFTER_STATE_EVENT' USING ERRCODE='23514'; END IF; RETURN NEW; END $$");
        sql.execute("CREATE TRIGGER c3_receipt_fault BEFORE INSERT ON platform.initial_pathway_receipt FOR EACH ROW EXECUTE FUNCTION platform.c3_receipt_fault()");
        try {assertThatThrownBy(()->{if(action.equals("EDIT"))f.review.edit(f.id,"recover-key",edit,true);else f.review.confirm(f.id,"recover-key",expected);}).isInstanceOf(org.springframework.dao.DataAccessException.class);assertThat(digest()).isEqualTo(before);}
        finally {sql.execute("DROP TRIGGER c3_receipt_fault ON platform.initial_pathway_receipt");sql.execute("DROP FUNCTION platform.c3_receipt_fault()");}
        if(action.equals("EDIT")){f.review.edit(f.id,"recover-key",edit,true);assertThat(f.current().revision()).isEqualTo(2);assertThat(count("initial_pathway_override",f.id)).isOne();}
        else {f.review.confirm(f.id,"recover-key",expected);assertThat(f.current().review()).isEqualTo(Review.APPROVED);assertThat(count("initial_pathway_approval",f.id)).isOne();}
        assertThat(receiptCount(f.id)).isOne();
    }
    @Test void R05_noopsRetainEveryAggregateRowAndAppendOnlyReceipts(){
        var f=new Fixture(true);var before=digest();f.review.edit(f.id,"noop-include",f.edit("A"),true);f.review.edit(f.id,"noop-exclude",f.edit("ALT"),false);f.review.remove(f.id,"noop-remove",f.edit("ALT"));
        var after=digest();before.remove("initial_pathway_receipt");after.remove("initial_pathway_receipt");assertThat(after).isEqualTo(before);assertThat(receiptCount(f.id)).isEqualTo(3);assertThat(f.current().revision()).isEqualTo(1);
    }
    @Test void E03_E07_E08_realOwnApprovedAndArchivedProjectionNeverWritesOrGrantsMissingOwnerAccess(){
        var f=new Fixture(true);f.review.move(f.id,"own-order",new InitialPathwayReview.Move("B","DOWN",f.current().revision(),f.current().contentHash(),null));f.review.confirm(f.id,"own-approve",f.expected());
        var approved=f.current();f.actor.set(new Actor(ORG,f.scope.learnerId(),Role.EMPLOYEE));var access=access(f);var view=new InitialPathwayView(f.actor::get,store,f.coordination,access);
        var before=digest();var own=view.current();assertThat(own.status().revisionContentHash()).isEqualTo(approved.contentHash());assertThat(own.modules()).extracting(m->m.module().id()).containsExactly("P","B","A");
        assertThat(own.modules()).allSatisfy(m->{assertThat(m.accessState()).isEqualTo("UNAVAILABLE");assertThat(m.entry()).isNull();});assertThat(own.dependencies()).singleElement().satisfies(g->{assertThat(g.moduleId()).isEqualTo("A");assertThat(g.providerModuleId()).isEqualTo("P");});assertThat(digest()).isEqualTo(before);
        sql.update("UPDATE platform.initial_pathway_current SET review_status='ARCHIVED',archived_at=clock_timestamp() WHERE request_id=?",f.id);
        before=digest();var archived=view.archived(f.id);assertThat(archived.status().revisionContentHash()).isEqualTo(approved.contentHash());assertThat(archived.modules()).allSatisfy(m->{assertThat(m.accessState()).isEqualTo("ARCHIVED");assertThat(m.entry()).isNull();});assertThat(digest()).isEqualTo(before);
    }
    @Test void R01_R13_realForeignTenantUnassignedAndRevokedReplayDenyBeforeStateChange(){
        var f=new Fixture(true);var command=f.edit("ALT");f.review.edit(f.id,"accepted-before-revoke",command,true);var before=digest();
        var foreign=new Scope(new UUID(0,2),new UUID(0,2002));assertThat(store.request(foreign,f.id)).isEmpty();assertThatThrownBy(()->store.revision(foreign,f.id,1)).hasMessage("PATHWAY_NOT_FOUND");
        var empty=new InitialPathwayView(()->new Actor(foreign.organizationId(),foreign.learnerId(),Role.EMPLOYEE),store,f.coordination,access(f)).current();assertThat(empty.status()).isNull();assertThat(empty.modules()).isEmpty();
        var assignments=new LocalPathwayAssignments(jdbc,ORG,expert,Set.of("foreign-role"),1000);assertThat(assignments.assignedPathways(f.actor.get())).isEmpty();assertThatThrownBy(()->assignments.require(f.actor.get(),f.id)).hasMessage("PATHWAY_NOT_FOUND");
        f.actor.set(new Actor(foreign.organizationId(),expert,Role.DOMAIN_EXPERT));assertThatThrownBy(()->f.review.detail(f.id)).hasMessage("FORBIDDEN");f.actor.set(new Actor(ORG,expert,Role.DOMAIN_EXPERT));
        sql.update("UPDATE platform.account SET active=false WHERE account_id=?",expert);
        try {assertThatThrownBy(()->f.review.edit(f.id,"accepted-before-revoke",command,true)).hasMessage("FORBIDDEN");}
        finally {sql.update("UPDATE platform.account SET active=true WHERE account_id=?",expert);}
        assertThat(digest()).isEqualTo(before);
    }
    @ParameterizedTest @ValueSource(strings={"SOURCE","ASSIGNMENT"})
    void R11_commitBoundaryDriftPreventsPreparedEdit(String kind){
        var f=new Fixture(true);var before=digest();var command=f.edit("ALT");
        var guarded=f.reviewWith(f.builder,beforeSecondTransaction(f,()->{if(kind.equals("SOURCE"))f.sourceCurrent.set(false);else sql.update("UPDATE platform.account SET active=false WHERE account_id=?",expert);}));
        try {assertThatThrownBy(()->guarded.edit(f.id,"boundary-drift",command,true)).hasMessage(kind.equals("SOURCE")?"FIXTURE_SOURCE_DRIFT":"FORBIDDEN");assertThat(digest()).isEqualTo(before);}
        finally {f.sourceCurrent.set(true);sql.update("UPDATE platform.account SET active=true WHERE account_id=?",expert);}
    }
    @Test void P13_expiredClaimCannotPublishAfterNewTokenAndReplayFinishAddsNothing(){
        var f=new Fixture(false);var old=store.claim(Duration.ofMinutes(5),3,"old-worker").orElseThrow();assertThat(old.request().id()).isEqualTo(f.id);
        sql.update("UPDATE platform.initial_pathway_request SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE request_id=?",f.id);
        var fresh=store.claim(Duration.ofMinutes(5),3,"new-worker").orElseThrow();assertThat(fresh.token()).isNotEqualTo(old.token());var request=fresh.request();
        var problem=f.builder.build(f.scope,request.frozen().input().binding(),request.frozen().input().preview().result(),request.frozen().planningHash());var plan=new InitialPathwayPlanner().generate(problem,limits.maxSearchStates());
        var before=digest();assertThat(f.coordination.transaction(f.scope,()->store.finish(old,Generation.SUCCEEDED,null,plan,Duration.ZERO))).isFalse();assertThat(digest()).isEqualTo(before);
        assertThat(f.coordination.transaction(f.scope,()->store.finish(fresh,Generation.SUCCEEDED,null,plan,Duration.ZERO))).isTrue();before=digest();
        assertThat(f.coordination.transaction(f.scope,()->store.finish(fresh,Generation.SUCCEEDED,null,plan,Duration.ZERO))).isFalse();assertThat(digest()).isEqualTo(before);assertThat(count("initial_pathway_run",f.id)).isOne();assertThat(count("initial_pathway_revision",f.id)).isOne();
    }
    @Test void R11_actualNeo4jOutageDoesNotPartiallyWriteAndRecoveryUsesOriginalKey(){
        var f=new Fixture(true);var unavailable=new Neo4jInitialGraph((s,r)->driver.session(SessionConfig.builder().withDatabase("missing-c3-database").build()));
        var review=f.reviewWith(new InitialProblemBuilder(unavailable,new MasterySuitabilityPolicy(),f.definitions,f.availability,limits),f.coordination);var command=f.edit("ALT");var before=digest();
        assertThatThrownBy(()->review.edit(f.id,"recover-outage",command,true)).hasMessage("CATALOG_UNAVAILABLE");assertThat(digest()).isEqualTo(before);
        f.review.edit(f.id,"recover-outage",command,true);assertThat(f.current().revision()).isEqualTo(2);assertThat(receiptCount(f.id)).isOne();
    }
    @Test void P19_literalLegacyRevisionAndApprovalRoundTripWithoutRelabelingOrRepin(){
        var f=new Fixture(false);var run=UUID.randomUUID();
        var p=new Offer("P","Old P","legacy-content",BigDecimal.TEN,BigDecimal.ONE,"s3",InstructionLevel.FOUNDATIONAL,0,true,"legacy-policy","original");
        var a=new Offer("A","Old A","legacy-content",BigDecimal.TEN,BigDecimal.ONE,"s1",InstructionLevel.ADVANCED,0,true,"legacy-policy","original");
        var plan=new Plan(List.of(new InitialPlanning.Module("P","Old P","legacy-content",BigDecimal.TEN,BigDecimal.ONE,1,List.of(p)),new InitialPlanning.Module("A","Old A","legacy-content",BigDecimal.TEN,BigDecimal.ONE,2,List.of(a))),List.of(new Dependency("A","s1","s3","P","legacy-gate","legacy-readiness",null)),List.of(),Map.of("catalog","legacy-v1"));
        // Golden computed independently from typed canonical bytes with node:crypto, not Java identity/codec.
        String hash="156e69acb943fc9957797da9a5f86555336ae655fd0230f952178ecf2bab3974";
        var revision=new Revision(f.id,1,run,plan,Set.of("A","P"),List.of(),hash,Validation.VALID);
        tx.executeWithoutResult(status->{sql.update("INSERT INTO platform.initial_pathway_run(run_id,request_id,claim_token,worker_version,generation_status,diagnostics) VALUES (?,?,?,'legacy-fixture','SUCCEEDED','[]'::jsonb)",run,f.id,UUID.randomUUID());
            new JdbcInitialRevisions(new InitialJdbc(jdbc,codec)).insert(f.scope,f.current().selection(),revision);
            sql.update("UPDATE platform.initial_pathway_request SET generation_status='SUCCEEDED' WHERE request_id=?",f.id);sql.update("UPDATE platform.initial_pathway_current SET current_revision=1,review_status='AWAITING_EXPERT_REVIEW' WHERE request_id=?",f.id);
            store.approve(f.scope,revision,f.actor.get(),new LocalPathwayAssignments(jdbc,ORG,expert,Set.of("role-a"),1000).require(f.actor.get(),f.id));});
        var before=digest();var loaded=store.revision(f.scope,f.id,1);assertThat(loaded.contentHash()).isEqualTo(hash);assertThat(loaded.plan().formatVersion()).isNull();assertThat(loaded.plan().modules()).extracting(InitialPlanning.Module::id).containsExactly("P","A");assertThat(loaded.plan().modules().getFirst().targets().getFirst().teachingFocus()).isNull();assertThat(loaded.plan().modules().getFirst().targets().getFirst().instructionLevel()).isEqualTo(InstructionLevel.FOUNDATIONAL);
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_target WHERE request_id=?",Long.class,f.id)).isEqualTo(2);assertThat(sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_teaching_v2 WHERE request_id=?",Long.class,f.id)).isZero();assertThat(store.approved(f.scope,f.id,1,hash)).isTrue();assertThat(digest()).isEqualTo(before);
    }
    @Test void R09_boundedRealAdapterCheckLatencyAndPreparedStatementCountWithoutWrites(){
        var f=new Fixture(true);var before=digest();for(int i=0;i<3;i++)f.review.validate(f.id);preparedStatements.set(0);long[] samples=new long[30];
        for(int i=0;i<samples.length;i++){long start=System.nanoTime();var checked=f.review.validate(f.id);samples[i]=System.nanoTime()-start;assertThat(checked.validationStatus()).isEqualTo(Validation.VALID);}
        long statements=preparedStatements.get();Arrays.sort(samples);assertThat(statements).isGreaterThan(0);assertThat(digest()).isEqualTo(before);
        System.out.printf(Locale.ROOT,"C3 REAL CHECK: needs=3 offers=4 selected=3 edges=1 budget=10000 warmup=3 samples=30 threads=1 JDBC_prepared=%d p50_ms=%.3f p95_ms=%.3f; graph statements/resources excluded; no SLA/p99 claim%n",statements,samples[14]/1e6,samples[28]/1e6);
    }
    @Test void R11_selectionChangeBetweenPlanningAndCommitArchivesWithoutSavingPreparedEdit(){
        var f=new Fixture(true);var command=f.edit("ALT");var guarded=f.reviewWith(f.builder,beforeSecondTransaction(f,()->changeSelection(f)));
        assertThatThrownBy(()->guarded.edit(f.id,"selection-drift",command,true)).hasMessage("STALE_REVISION");
        assertThat(f.current().review()).isEqualTo(Review.ARCHIVED);assertThat(count("initial_pathway_revision",f.id)).isOne();assertThat(count("initial_pathway_override",f.id)).isZero();assertThat(count("initial_pathway_approval",f.id)).isZero();assertThat(receiptCount(f.id)).isZero();
    }
    @Test void P12_P13_dispatchCannotPublishAfterSelectionDriftAndRecoversSourceFailureAtCommit(){
        var selected=new Fixture(false);selected.dispatch(beforeTransaction(selected,1,()->changeSelection(selected))).runOne();
        assertThat(selected.current().review()).isEqualTo(Review.ARCHIVED);assertThat(selected.current().generation()).isEqualTo(Generation.STALE);assertThat(count("initial_pathway_revision",selected.id)).isZero();
        var source=new Fixture(false);assertThatThrownBy(()->source.dispatch(beforeTransaction(source,1,()->source.sourceCurrent.set(false))).runOne()).hasMessage("FIXTURE_SOURCE_DRIFT");
        assertThat(source.current().generation()).isEqualTo(Generation.GENERATING);assertThat(count("initial_pathway_revision",source.id)).isZero();
        source.sourceCurrent.set(true);sql.update("UPDATE platform.initial_pathway_request SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE request_id=?",source.id);
        source.dispatch(source.coordination).runOne();assertThat(source.current().generation()).isEqualTo(Generation.SUCCEEDED);assertThat(count("initial_pathway_revision",source.id)).isOne();assertThat(count("initial_pathway_run",source.id)).isOne();
        assertThat(sql.queryForObject("SELECT attempts FROM platform.initial_pathway_request WHERE request_id=?",Integer.class,source.id)).isEqualTo(2);
    }
    @Test void R14_revisionChildrenImmutabilityTenantFkAndUniqueOrdinalsRejectWithoutMutation(){
        var f=new Fixture(true);var before=digest();
        assertThatThrownBy(()->sql.update("UPDATE platform.initial_pathway_revision SET validation_status='UNRESOLVED' WHERE request_id=?",f.id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(()->sql.update("UPDATE platform.initial_pathway_module SET ordinal=99 WHERE request_id=? AND module_id='A'",f.id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(()->sql.update("INSERT INTO platform.initial_pathway_module(request_id,revision,module_id,content_version,ordinal,duration_minutes,price_vnd) VALUES (?,1,'CLASH','content-1',1,10,100)",f.id)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(()->sql.update("INSERT INTO platform.initial_pathway_approval(request_id,revision,content_hash,organization_id,expert_id,assignment_id,assignment_version) VALUES (?,1,?,?,?,'foreign','v1')",f.id,f.current().contentHash(),ORG,new UUID(0,2002))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(digest()).isEqualTo(before);
    }
    @Test void E02_realPendingAndNoGapDispatchReadsNeverInventApprovalCompletionOrModules(){
        var f=new Fixture(false,"level-no-gap");var access=access(f);f.actor.set(new Actor(ORG,f.scope.learnerId(),Role.EMPLOYEE));var view=new InitialPathwayView(f.actor::get,store,f.coordination,access);var before=digest();
        assertThat(view.current().status().generationStatus()).isEqualTo(Generation.PENDING);assertThat(view.current().modules()).isEmpty();assertThat(digest()).isEqualTo(before);
        f.dispatch(f.coordination).runOne();var after=digest();var result=view.current();assertThat(result.status().displayState()).isEqualTo("NO_LEARNING_REQUIRED");assertThat(result.status().reviewStatus()).isEqualTo(Review.NONE);assertThat(result.modules()).isEmpty();assertThat(result.baseline()).isNull();assertThat(count("initial_pathway_approval",f.id)).isZero();assertThat(count("initial_pathway_revision",f.id)).isZero();assertThat(digest()).isEqualTo(after);
        assertThat(after.get("employee_occupation_profile")).isEqualTo(before.get("employee_occupation_profile"));assertThat(after.get("baseline_attempt_skill_result")).isEqualTo(before.get("baseline_attempt_skill_result"));
    }
    InitialPathwayAccess access(Fixture f){return new InitialPathwayAccess(f.actor::get,f.coordination,store,new LocalPathwayAssignments(jdbc,ORG,expert,Set.of("role-a"),1000),f.bindings,f.availability,(s,g)->{throw new Failure(503,"LIVE_READINESS_NOT_CONFIGURED");},(s,m,v,g)->{throw new Failure(503,"CONTENT_ACCESS_NOT_CONFIGURED");});}
    Coordination beforeSecondTransaction(Fixture f,Runnable change){return beforeTransaction(f,2,change);}
    Coordination beforeTransaction(Fixture f,int index,Runnable change){return new Coordination(){final AtomicInteger calls=new AtomicInteger();public <T>T transaction(Scope s,Supplier<T> work){if(calls.incrementAndGet()==index)change.run();return f.coordination.transaction(s,work);}public Optional<Selection> current(Scope s){return f.coordination.current(s);}public boolean assessmentActive(Scope s){return f.coordination.assessmentActive(s);}public PreparedSelection prepare(Scope s,Binding b){return f.coordination.prepare(s,b);}};}
    void changeSelection(Fixture f){var actor=new RoleBaselineFlow.Actor(ORG,f.scope.learnerId());var role=new RoleBaselineFlow.Role("role-b","role-b","Role B","Fixture",OCC,"Fixture Occupation","fixture-v1","fixture-f3-v1",List.of(new RoleBaselineFlow.Level("level-b","level-b","Other Level",1,"Fixture","ALL_MANDATORY_SKILLS",List.of(new RoleBaselineFlow.Skill("s2","s2","Skill s2",1,true),new RoleBaselineFlow.Skill("s3","s3","Skill s3",1,true)))));selections.transaction(actor,()->selections.selectForPathway(actor,role,"level-b"));}
    long count(String table,UUID id){return sql.queryForObject("SELECT count(*) FROM platform."+table+" WHERE request_id=?",Long.class,id);}
    long receiptCount(UUID id){return sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_receipt WHERE resource=?",Long.class,id.toString());}
    static String outcome(Supplier<Receipt> action){try{action.get();return "committed";}catch(Failure failure){return failure.code();}}
}
