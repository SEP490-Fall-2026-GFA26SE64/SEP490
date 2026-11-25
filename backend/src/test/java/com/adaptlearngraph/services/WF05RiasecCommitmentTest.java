package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.RiasecRules;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.RiasecStore.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Real RIASEC persistence and HTTP client. Ollama responses/catalog are deterministic fixtures, not model-quality evidence. */
class WF05RiasecCommitmentTest {
    WF05PolicyPersistenceTest f;RiasecStore store;RiasecService service;RoleBaselineFlow.Actor actor;Owner owner;
    UUID editor;RiasecCatalog catalog;
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @BeforeEach void setup(){
        f=new WF05PolicyPersistenceTest();f.setup();actor=new RoleBaselineFlow.Actor(f.org,f.actor);owner=new Owner(f.org,f.actor);editor=UUID.randomUUID();
        store=new RiasecStore(WF05PolicyPersistenceTest.sql,new TransactionTemplate(WF05PolicyPersistenceTest.db.transactionManager()),f.json);
        catalog=mock(RiasecCatalog.class);when(catalog.positions(f.org,true)).thenReturn(List.of());
        service=new RiasecService(()->actor,store,catalog);
    }
    @AfterEach void removeOnlyThisFixtureOwner(){
        // Each case owns its queued job; another case must not claim it from the shared class fixture.
        if(owner==null)return;
        WF05PolicyPersistenceTest.sql.update("DELETE FROM platform.riasec_result WHERE organization_id=? AND account_id=?",owner.organizationId(),owner.accountId());
        WF05PolicyPersistenceTest.sql.update("DELETE FROM platform.riasec_workspace WHERE organization_id=? AND account_id=?",owner.organizationId(),owner.accountId());
    }
    static Map<String,Integer> answers(int value){
        var answers=new LinkedHashMap<String,Integer>();
        for(String dimension:RiasecRules.DIMENSIONS)for(int i=1;i<=10;i++)answers.put(dimension+String.format(Locale.ROOT,"%02d",i),value);
        return answers;
    }
    UUID submit(Map<String,Integer> answers){
        var draft=service.start(editor);
        var saved=service.save(new RiasecService.Edit(editor,draft.draftId(),draft.revision(),answers));
        var command=new RiasecService.Edit(editor,saved.draftId(),saved.revision(),null);
        var id=service.submit(command);assertThat(service.submit(command)).isEqualTo(id);return id;
    }

    @Test @Tag("bm04-wf05") @DisplayName("TC-WF05-F16 - Validate sixty RIASEC answers and persist six raw dimension sums")
    void sixtyAnswersAreScoredAndSavedOnce(){
        var draft=service.start(editor);
        var partial=service.save(new RiasecService.Edit(editor,draft.draftId(),draft.revision(),Map.of("R01",4)));
        assertThatThrownBy(()->service.submit(new RiasecService.Edit(editor,partial.draftId(),partial.revision(),null))).hasMessage("INCOMPLETE_ANSWERS");
        var invalid=answers(2);invalid.put("R01",5);
        assertThatThrownBy(()->service.save(new RiasecService.Edit(editor,partial.draftId(),partial.revision(),invalid))).hasMessage("INVALID_ANSWERS");
        var complete=answers(2);for(int i=1;i<=10;i++)complete.put("R"+String.format(Locale.ROOT,"%02d",i),4);
        var id=submit(complete);var result=store.results(owner).getFirst();
        assertThat(result.id()).isEqualTo(id);
        assertThat(result.scores()).containsExactlyInAnyOrderEntriesOf(Map.of("R",40,"I",20,"A",20,"S",20,"E",20,"C",20));
        assertThat(result.aiStatus()).isEqualTo("QUEUED");assertThat(service.view().draft().draftId()).isNull();
        assertThat(RiasecRules.score(answers(0)).values()).containsOnly(0);
        assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.riasec_result WHERE organization_id=? AND account_id=?",Integer.class,f.org,f.actor)).isEqualTo(1);
    }

    @Test @Tag("bm04-wf05") @DisplayName("TC-WF05-F17 - Resume saved RIASEC draft and isolate submitted history by organization and employee")
    void draftAndHistoryRemainOwnerScoped(){
        var draft=service.start(editor);var saved=service.save(new RiasecService.Edit(editor,draft.draftId(),draft.revision(),Map.of("I01",3)));
        assertThat(service.view().draft().answers()).containsEntry("I01",3);
        UUID secondEditor=UUID.randomUUID();var taken=service.claim(new RiasecService.Edit(secondEditor,saved.draftId(),saved.revision(),null),true);
        assertThatThrownBy(()->service.save(new RiasecService.Edit(editor,saved.draftId(),saved.revision(),Map.of("I01",0)))).hasMessage("DRAFT_CHANGED");
        editor=secondEditor;assertThat(taken.answers()).containsEntry("I01",3);var id=submit(answers(3));
        var original=actor;actor=new RoleBaselineFlow.Actor(f.org,f.otherActor);
        assertThat(service.view().results()).isEmpty();assertThatThrownBy(()->service.delete(id)).hasMessage("RESULT_NOT_FOUND");
        actor=new RoleBaselineFlow.Actor(UUID.randomUUID(),f.actor);
        assertThat(service.view().results()).isEmpty();assertThatThrownBy(()->service.retry(id)).hasMessage("RESULT_NOT_FOUND");
        actor=original;assertThat(service.view().currentId()).isEqualTo(id);
        assertThat(store.results(owner).getFirst().scores().values()).containsOnly(30);
    }

    @Test @Tag("bm04-wf05") @DisplayName("TC-WF05-F18 - Local AI client accepts only supplied Job Positions and preserves server scores without awarding competence")
    void recommendationsAreGroundedJobPositionSnapshots() throws Exception {
        UUID id=submit(answers(3));var job=store.claimJob().orElseThrow();assertThat(job.id()).isEqualTo(id);
        var position=new RiasecCatalog.Position("JOB-1","JOB","Original position","Catalog description",RiasecRules.score(answers(2)));
        String output="{\"recommendations\":[{\"id\":\"JOB-1\",\"rank\":1,\"dimensions\":[\"I\",\"C\"],\"explanation\":\"Your Investigative and Conventional interests align with this position while the Social emphasis differs.\"}]}";
        var sent=new AtomicReference<String>();var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/api/chat",exchange->{
            sent.set(new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
            byte[] response=f.json.writeValueAsBytes(Map.of("done",true,"message",Map.of("content",output)));
            exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(200,response.length);
            try(var stream=exchange.getResponseBody()){stream.write(response);}
        });
        server.start();
        try {
            var ai=new RiasecAiClient(f.json,"http://127.0.0.1:"+server.getAddress().getPort(),"fixture-model");
            var recommendations=ai.recommend(job.scores(),List.of(position));
            store.recordModel(job,ai.model());store.complete(job,recommendations,ai.model());
            var result=store.results(owner).getFirst();assertThat(result.aiStatus()).isEqualTo("SUCCEEDED");
            var recommendation=result.recommendations().get(0);
            assertThat(recommendation.path("position").path("id").asText()).isEqualTo("JOB-1");
            assertThat(recommendation.path("position").path("name").asText()).isEqualTo("Original position");
            assertThat(recommendation.path("comparisons").get(0).path("employeeScore").asInt()).isEqualTo(30);
            assertThat(recommendation.path("comparisons").get(0).path("positionScore").asInt()).isEqualTo(20);
            var prompt=f.json.readTree(f.json.readTree(sent.get()).path("messages").get(1).path("content").asText());
            assertThat(prompt.path("employeeScores").path("I").asInt()).isEqualTo(30);
            assertThat(prompt.path("positions").get(0).path("id").asText()).isEqualTo("JOB-1");
            assertThat(prompt.path("positions").get(0).has("name")).isFalse();
            assertThatThrownBy(()->RiasecAiClient.validateGrounded(f.json.readTree(output.replace("JOB-1","OTHER")),List.of(position),job.scores())).hasMessage("AI_INVALID_POSITION");
            assertThatThrownBy(()->RiasecAiClient.validateGrounded(f.json.readTree(output.replace("\"I\",\"C\"","\"I\",\"I\"")),List.of(position),job.scores())).hasMessage("AI_UNGROUNDED_SCORES");
            assertThat(WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,f.org,f.actor)).isZero();
            assertThat(WF05PolicyPersistenceTest.db.bean(EmployeeRoleSelectionJpaRepository.class).current(f.org,f.actor)).isEmpty();
        } finally {server.stop(0);}
    }
}
