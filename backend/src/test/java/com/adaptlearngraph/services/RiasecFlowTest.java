package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RiasecRules;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.RiasecStore.*;
import com.adaptlearngraph.services.RiasecService.Edit;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Disposable PostgreSQL only; never connects to shared development volumes. */
class RiasecFlowTest {
    static PostgreSQLContainer<?> postgres;
    static JdbcTemplate db;
    static RiasecStore store;
    static ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    RoleBaselineFlow.Actor actor;
    Owner owner;
    RiasecService service;
    UUID editor=UUID.randomUUID();
    @BeforeAll static void database() {
        postgres=new PostgreSQLContainer<>("postgres:17.6-alpine");postgres.start();
        var ds=new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword());
        db=new JdbcTemplate(ds);db.execute("CREATE SCHEMA platform; CREATE TABLE platform.account(account_id uuid PRIMARY KEY)");
        new ResourceDatabasePopulator(new ClassPathResource("db/workspace-migration/V72__riasec_personal_exploration.sql")).execute(ds);
        store=new RiasecStore(db,new TransactionTemplate(new DataSourceTransactionManager(ds)),json);
    }
    @AfterAll static void stop(){if(postgres!=null)postgres.stop();}
    @BeforeEach void setup() {
        actor=new RoleBaselineFlow.Actor(UUID.randomUUID(),UUID.randomUUID());owner=new Owner(actor.organizationId(),actor.learnerId());
        db.update("INSERT INTO platform.account VALUES (?)",actor.learnerId());
        var catalog=mock(RiasecCatalog.class);when(catalog.positions(any(),eq(true))).thenReturn(List.of());
        service=new RiasecService(()->actor,store,catalog);
    }
    @AfterEach void removeOnlyThisTestOwner(){
        db.update("DELETE FROM platform.riasec_result WHERE organization_id=? AND account_id=?",owner.organizationId(),owner.accountId());
        db.update("DELETE FROM platform.riasec_workspace WHERE organization_id=? AND account_id=?",owner.organizationId(),owner.accountId());
    }
    static Map<String,Integer> answers(int n) {var a=new LinkedHashMap<String,Integer>();for(String d:RiasecRules.DIMENSIONS)for(int i=1;i<=10;i++)a.put(d+String.format("%02d",i),n);return a;}
    Edit edit(Workspace d){return new Edit(editor,d.draftId(),d.revision(),null);}
    Workspace full(){var d=service.start(editor);return service.save(new Edit(editor,d.draftId(),d.revision(),answers(4)));}
    UUID submitted(){return service.submit(edit(full()));}
    void finish(UUID id){db.update("UPDATE platform.riasec_result SET ai_status='FAILED' WHERE result_id=?",id);}
    @Test void scoringIsRawIntegerSumAndIncompleteRejected(){
        assertThat(RiasecRules.score(answers(4)).values()).containsOnly(40);
        assertThat(RiasecRules.score(answers(0)).values()).containsOnly(0);
        var a=answers(2);a.remove("R01");assertThatThrownBy(()->RiasecRules.score(a)).hasMessage("INCOMPLETE_ANSWERS");
        a.put("R01",5);assertThatThrownBy(()->RiasecRules.score(a)).hasMessage("INVALID_ANSWERS");
    }
    @Test void draftPersistsAndTakeoverFencesOldEditor(){
        var d=service.start(editor);var saved=service.save(new Edit(editor,d.draftId(),d.revision(),Map.of("R01",3)));
        assertThat(service.start(UUID.randomUUID()).answers()).containsEntry("R01",3);
        UUID other=UUID.randomUUID();var taken=service.claim(new Edit(other,saved.draftId(),saved.revision(),null),true);
        assertThatThrownBy(()->service.save(new Edit(editor,saved.draftId(),saved.revision(),Map.of("R01",0)))).hasMessageContaining("DRAFT_CHANGED");
        assertThat(taken.revision()).isGreaterThan(saved.revision());assertThat(taken.answers()).containsEntry("R01",3);
        assertThatThrownBy(()->service.claim(new Edit(editor,taken.draftId(),taken.revision(),null),false)).hasMessage("EDITING_ELSEWHERE");
    }
    @Test void simultaneousSubmitCreatesOneReceipt() throws Exception {
        var d=full();var command=edit(d);var actorCopy=actor;
        var pool=Executors.newFixedThreadPool(4);
        try {var tasks=new ArrayList<Callable<UUID>>();for(int i=0;i<4;i++)tasks.add(()->service.submit(command));
            var ids=new HashSet<UUID>();for(var task:pool.invokeAll(tasks))ids.add(task.get());assertThat(ids).containsExactly(d.draftId());
        }finally{pool.shutdownNow();}
        assertThat(db.queryForObject("SELECT count(*) FROM platform.riasec_result WHERE account_id=?",Integer.class,actorCopy.learnerId())).isEqualTo(1);
        assertThat(store.read(owner).draftId()).isNull();assertThat(service.submit(command)).isEqualTo(d.draftId());
    }
    @Test void simultaneousSaveAcceptsOnlyOneRevision() throws Exception {
        var d=service.start(editor);var pool=Executors.newFixedThreadPool(2);
        try {var tasks=List.<Callable<Boolean>>of(()->saveOnce(d,1),()->saveOnce(d,2));long accepted=0;
            for(var task:pool.invokeAll(tasks))if(task.get())accepted++;assertThat(accepted).isEqualTo(1);
        }finally{pool.shutdownNow();}
    }
    boolean saveOnce(Workspace d,int n){try{service.save(new Edit(editor,d.draftId(),d.revision(),Map.of("R01",n)));return true;}catch(RiasecRules.Failure e){return false;}}
    @Test void tenantAndAccountAreBothRequired(){
        UUID id=submitted();var original=actor;
        actor=new RoleBaselineFlow.Actor(original.organizationId(),UUID.randomUUID());db.update("INSERT INTO platform.account VALUES (?)",actor.learnerId());
        assertThat(service.view().results()).isEmpty();assertThatThrownBy(()->service.delete(id)).hasMessage("RESULT_NOT_FOUND");
        actor=new RoleBaselineFlow.Actor(UUID.randomUUID(),original.learnerId());
        assertThat(service.view().results()).isEmpty();assertThatThrownBy(()->service.retry(id)).hasMessage("RESULT_NOT_FOUND");
        actor=original;assertThat(service.view().currentId()).isEqualTo(id);
    }
    @Test void runningBlocksStartDeleteAndRetryThenTimeoutReleases(){
        UUID id=submitted();assertThatThrownBy(()->service.start(editor)).hasMessage("AI_RUNNING");
        assertThatThrownBy(()->service.delete(id)).hasMessage("AI_RUNNING");
        db.update("UPDATE platform.riasec_result SET ai_deadline=now()-interval '1 second' WHERE result_id=?",id);
        assertThat(service.view().results().getFirst().aiStatus()).isEqualTo("FAILED");
        assertThat(service.start(editor).draftId()).isNotNull();
    }
    @Test void historyDeletionRestoreUsesSubmissionTimeAndNewDeletionClock(){
        UUID first=submitted();finish(first);var newDraft=service.start(editor);assertThat(service.view().currentId()).isEqualTo(first);
        var saved=service.save(new Edit(editor,newDraft.draftId(),newDraft.revision(),answers(1)));UUID second=service.submit(edit(saved));finish(second);
        service.delete(second);assertThat(service.view().currentId()).isEqualTo(first);
        service.restore(second);assertThat(service.view().currentId()).isEqualTo(second);
        service.delete(first);service.restore(first);assertThat(service.view().currentId()).isEqualTo(second);
        service.delete(first);db.update("UPDATE platform.riasec_result SET deleted_at=now()-interval '6 days' WHERE result_id=?",first);
        service.restore(first);service.delete(first);
        assertThat(db.queryForObject("SELECT deleted_at>now()-interval '1 minute' FROM platform.riasec_result WHERE result_id=?",Boolean.class,first)).isTrue();
        service.delete(second);assertThat(service.view().currentId()).isNull();
    }
    @Test void retentionRemovesExpiredResultButNeverDraft(){
        UUID id=submitted();finish(id);service.delete(id);var draft=service.start(editor);
        db.update("UPDATE platform.riasec_result SET deleted_at=now()-interval '8 days' WHERE result_id=?",id);
        assertThatThrownBy(()->service.restore(id)).hasMessage("RESULT_NOT_FOUND");store.maintenance();
        assertThat(db.queryForObject("SELECT count(*) FROM platform.riasec_result WHERE result_id=?",Integer.class,id)).isZero();
        assertThat(service.view().draft().draftId()).isEqualTo(draft.draftId());
    }
    @Test void currentOnlyRetryAndSuccessIncludingZeroIsFinal(){
        UUID first=submitted();finish(first);UUID second=submitted();finish(second);
        assertThatThrownBy(()->service.retry(first)).hasMessage("NOT_RETRYABLE");
        service.delete(second);service.retry(first);
        var job=store.claimJob().orElseThrow();assertThat(job.id()).isEqualTo(first);store.complete(job,List.of(),"fixture");
        assertThat(service.view().results().stream().filter(r->r.id().equals(first)).findFirst().orElseThrow().aiStatus()).isEqualTo("SUCCEEDED");
        assertThatThrownBy(()->service.retry(first)).hasMessage("NOT_RETRYABLE");
    }
    @Test void workerSerializesAndRejectsLateCompletionAfterRetry(){
        UUID id=submitted();var job=store.claimJob().orElseThrow();assertThat(store.claimJob()).isEmpty();
        db.update("UPDATE platform.riasec_result SET ai_deadline=now()-interval '1 second' WHERE result_id=?",id);store.maintenance();service.retry(id);
        store.complete(job,List.of(),"stale");assertThat(store.results(owner).getFirst().aiStatus()).isEqualTo("QUEUED");
        var newer=store.claimJob().orElseThrow();store.fail(job,"STALE");store.complete(newer,List.of(),"new");
        assertThat(store.results(owner).getFirst().aiStatus()).isEqualTo("SUCCEEDED");
    }
    @Test void snapshotSurvivesCatalogEdits() throws Exception {
        UUID id=submitted();var job=store.claimJob().orElseThrow();
        var p=new RiasecCatalog.Position("J","CODE","Original","Original description",RiasecRules.score(answers(3)));
        var rec=RiasecAiClient.validate(json.readTree("{\"recommendations\":[{\"id\":\"J\",\"rank\":1,\"explanation\":\"Your investigative and conventional interests align with this position. This is not a competence assessment.\"}]}"),List.of(p));
        store.complete(job,rec,"fixture");assertThat(store.results(owner).getFirst().recommendations().get(0).path("position").path("name").asText()).isEqualTo("Original");
        service.delete(id);service.restore(id);assertThat(store.results(owner).getFirst().aiStatus()).isEqualTo("SUCCEEDED");
    }
    @Test void aiOutputMustUseCandidateIdsAndDenseRanks() throws Exception {
        var p=new RiasecCatalog.Position("J","J","Job","",RiasecRules.score(answers(3)));
        assertThat(RiasecAiClient.validate(json.readTree("{\"recommendations\":[]}"),List.of(p))).isEmpty();
        for(String fragment:List.of("\"id\":\"OTHER\",\"rank\":1","\"id\":\"J\",\"rank\":2","\"id\":\"J\",\"rank\":1.5")){
            var root=json.readTree("{\"recommendations\":[{"+fragment+",\"explanation\":\"A sufficiently long English explanation of occupational interests only.\"}]}");
            assertThatThrownBy(()->RiasecAiClient.validate(root,List.of(p))).isInstanceOf(IllegalArgumentException.class);
        }
    }
    @Test void groundedOutputCopiesServerScoresAndRejectsInvalidDimensionsAndPersonalityLabels() throws Exception {
        var scores=RiasecRules.score(answers(3));var p=new RiasecCatalog.Position("J","J","Job","",RiasecRules.score(answers(2)));
        String body="{\"recommendations\":[{\"id\":\"J\",\"rank\":1,\"explanation\":\"Your Investigative and Conventional interests align with this position while the Social emphasis differs.\",\"dimensions\":[\"I\",\"C\"]}]}";
        var grounded=RiasecAiClient.validateGrounded(json.readTree(body),List.of(p),scores);
        assertThat(grounded).hasSize(1);assertThat(grounded.getFirst().get("comparisons")).isEqualTo(List.of(Map.of("dimension","I","employeeScore",30,"positionScore",20),Map.of("dimension","C","employeeScore",30,"positionScore",20)));
        assertThatThrownBy(()->RiasecAiClient.validateGrounded(json.readTree(body.replace("\"I\",\"C\"","\"I\",\"I\"")),List.of(p),scores)).hasMessage("AI_UNGROUNDED_SCORES");
        assertThatThrownBy(()->RiasecAiClient.validateGrounded(json.readTree(body.replace("Investigative","Extraversion")),List.of(p),scores)).hasMessage("AI_UNGROUNDED_EXPLANATION");
        assertThatThrownBy(()->RiasecAiClient.validateGrounded(json.readTree(body.replace("Your Investigative and Conventional interests align with this position while the Social emphasis differs.","This position focuses on data architecture rather than software development or testing duties.")),List.of(p),scores)).hasMessage("AI_UNGROUNDED_EXPLANATION");
    }
}
