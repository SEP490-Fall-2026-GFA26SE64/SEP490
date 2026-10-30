package com.adaptlearngraph.assessment.bank;

import com.adaptlearngraph.assessment.bank.application.QuestionBankService;
import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase.*;
import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.*;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import com.adaptlearngraph.assessment.bank.infrastructure.JdbcQuestionBankStore;
import com.adaptlearngraph.assessment.bank.infrastructure.QuestionBankMailWorker;
import com.adaptlearngraph.assessment.bank.infrastructure.Neo4jQuestionBankSkillReader;
import com.adaptlearngraph.assessment.infrastructure.JdbcBaselineAssessmentDraftStore;
import com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QuestionBankPersistenceIntegrationTest {
    final UUID org=UUID.randomUUID(),foreign=UUID.randomUUID(),expert=UUID.randomUUID(),peer=UUID.randomUUID(),ld=UUID.randomUUID(),foreignExpert=UUID.randomUUID();
    JdbcTemplate jdbc;JdbcQuestionBankStore store;TransactionTemplate transactions;
    Content body(String prompt){return new Content(prompt,List.of("One","Two","Three","Four"),0,"skill","Skill","EASY","Explanation");}
    Catalog catalog=new Catalog(){public List<Choice>skills(Actor a){return List.of(new Choice("skill","Skill"));}public String requireSkill(Actor a,String id){if(!"skill".equals(id))throw new Failure(400,"Invalid skill");return "Skill";}public List<Choice>experts(Actor a){return List.of(new Choice(expert.toString(),"Expert"),new Choice(peer.toString(),"Peer"));}public List<Choice>managers(Actor a){return List.of(new Choice(ld.toString(),"L&D"));}public void requireExpert(Actor a,UUID id){if(!List.of(expert,peer).contains(id))throw new Failure(409,"Invalid Expert");}};
    QuestionBankService service(UUID id,UUID organization,String role){return new QuestionBankService(()->new Actor(id,organization,role),catalog,store,Clock.systemUTC());}
    void member(UUID id,UUID organization,String role){transactions.executeWithoutResult(status->{UUID m=UUID.randomUUID();jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?, 'test-only')",id,organization,id+"@example.test",id+"@example.test");jdbc.update("INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at) VALUES (?,?,?,true,now(),now())",m,id,organization);jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)",m,role);});}
    void action(QuestionBankService service,UUID id,String action){var q=service.read().questions().stream().filter(x->x.id.equals(id)).findFirst().orElseThrow();service.command(new Command(id,q.revision,action,"Reason",null));}
    void assertCatalogDeadlineReleasesTransaction(QuestionBankService author) {
        var driver=mock(org.neo4j.driver.Driver.class);var session=mock(org.neo4j.driver.async.AsyncSession.class);
        when(driver.asyncSession(any(org.neo4j.driver.SessionConfig.class))).thenReturn(session);
        when(session.<List<String>>executeReadAsync(any(),any(org.neo4j.driver.TransactionConfig.class)))
                .thenReturn(new CompletableFuture<>());
        when(session.closeAsync()).thenReturn(new CompletableFuture<>());
        var reader=new Neo4jQuestionBankSkillReader(driver,"neo4j",Duration.ofMillis(50));
        Catalog unavailable=new Catalog(){
            public List<Choice> skills(Actor a){return reader.skills();}
            public String requireSkill(Actor a,String id){return reader.requireSkill(id);}
            public List<Choice> experts(Actor a){return catalog.experts(a);}
            public List<Choice> managers(Actor a){return catalog.managers(a);}
            public void requireExpert(Actor a,UUID id){catalog.requireExpert(a,id);}
        };
        var blocked=new QuestionBankService(()->new Actor(expert,org,"DOMAIN_EXPERT"),unavailable,store,Clock.systemUTC());
        int count=author.read().questions().size();
        assertTimeoutPreemptively(Duration.ofSeconds(3),()->{
            assertEquals(503,assertThrows(Failure.class,()->blocked.save(new Save(null,null,"Q-TIMEOUT",body("Must roll back"),false))).status());
            assertEquals(count,author.read().questions().size());
        });
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.question_bank_identity WHERE code='Q-TIMEOUT'",Integer.class));
    }
    @Test void realMigrationRoundTripAtomicityIsolationHistoryAndRetirement()throws Exception {
        try(var pg=new PostgreSQLContainer<>("postgres:17.6-alpine")){
            pg.start();var source=new DriverManagerDataSource(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword());jdbc=new JdbcTemplate(source);transactions=new TransactionTemplate(new DataSourceTransactionManager(source));
            Flyway.configure().dataSource(source).locations("classpath:db/workspace-migration").target("35").load().migrate();
            var before=jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history ORDER BY installed_rank");
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'QB_A','A'),(?,'QB_B','B')",org,foreign);
            member(expert,org,"DOMAIN_EXPERT");member(peer,org,"DOMAIN_EXPERT");member(ld,org,"LD_MANAGER");member(foreignExpert,foreign,"DOMAIN_EXPERT");
            UUID bank=UUID.randomUUID(),legacy=UUID.randomUUID();jdbc.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'Existing bank',?)",bank,expert);
            jdbc.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,content_hash) VALUES (?,?,1,?,'Legacy','{\"type\":\"SINGLE_CHOICE\",\"options\":[]}'::jsonb,'{}'::jsonb,?)",legacy,legacy,bank,"a".repeat(64));
            var legacyBytes=jdbc.queryForObject("SELECT row_to_json(i)::text FROM platform.item_version i WHERE item_version_id=?",String.class,legacy);
            var flyway=Flyway.configure().dataSource(source).locations("classpath:db/workspace-migration").load();assertEquals(1,flyway.migrate().migrationsExecuted);assertEquals(0,flyway.migrate().migrationsExecuted);
            assertEquals(before,jdbc.queryForList("SELECT version,checksum FROM flyway_schema_history WHERE installed_rank<=35 ORDER BY installed_rank"));
            var tx=new TransactionTemplate(new DataSourceTransactionManager(source));store=new JdbcQuestionBankStore(jdbc,tx,new ObjectMapper().findAndRegisterModules());
            var author=service(expert,org,"DOMAIN_EXPERT");var manager=service(ld,org,"LD_MANAGER");
            var adopted=author.read();assertEquals(bank,adopted.id());var old=adopted.questions().getFirst();assertEquals("Q-"+legacy.toString().toUpperCase(Locale.ROOT),old.code);assertNull(old.owner);assertNull(old.createdBy);assertNull(old.createdAt);
            assertCatalogDeadlineReleasesTransaction(author);
            assertThrows(Failure.class,()->author.save(new Save(old.id,old.revision,old.code,body("Repair"),false)));
            manager.command(new Command(old.id,old.revision,"ASSIGN","Legacy intake",expert));
            assertEquals(legacyBytes,jdbc.queryForObject("SELECT row_to_json(i)::text FROM platform.item_version i WHERE item_version_id=?",String.class,legacy));
            var draft=author.save(new Save(null,null,"Q-NEW",new Content("Partial",List.of(),null,"skill",null,null,null),false)).questions().getLast();
            assertNull(draft.versions.getFirst().content.correctAnswer());assertThrows(Failure.class,()->action(author,draft.id,"SUBMIT"));
            author.save(new Save(draft.id,draft.revision,draft.code,body("Complete"),false));action(author,draft.id,"SUBMIT");action(manager,draft.id,"VIEW");action(manager,draft.id,"APPROVE");
            var published=manager.read().questions().stream().filter(q->q.id.equals(draft.id)).findFirst().orElseThrow();var v=published.versions.getLast();
            assertEquals(expert,published.createdBy);assertEquals(expert,published.owner);assertNotNull(published.createdAt);assertEquals(expert,v.editedBy);assertNotNull(v.editedAt);assertEquals(expert,v.submittedBy);assertNotNull(v.submittedAt);assertEquals(ld,v.reviewedBy);assertNotNull(v.reviewedAt);
            var item=jdbc.queryForMap("SELECT * FROM platform.item_version WHERE item_version_id=?",v.id);for(String field:List.of("item_id","version","question_bank_id","prompt","response_schema","protected_key","publication_state","content_hash","micro_skill_id","micro_skill_name_snapshot","difficulty"))assertNotNull(item.get(field),field);
            assertEquals("PUBLISHED",item.get("publication_state"));assertEquals(64,item.get("content_hash").toString().length());assertTrue(item.get("protected_key").toString().contains("A"));assertTrue(manager.read().history().stream().anyMatch(a->a.action().equals("APPROVED")));
            var foreignService=service(foreignExpert,foreign,"DOMAIN_EXPERT");assertTrue(foreignService.read().questions().isEmpty());assertThrows(Failure.class,()->foreignService.command(new Command(draft.id,published.revision,"ASSIGN","Wrong org",foreignExpert)));
            action(author,draft.id,"SUCCESSOR");var latest=author.read().questions().getLast();long expected=latest.revision;
            var responses=new CopyOnWriteArrayList<Integer>();try(var pool=Executors.newFixedThreadPool(2)){var latch=new CountDownLatch(1);var tasks=new ArrayList<Future<?>>();for(int i=0;i<2;i++)tasks.add(pool.submit(()->{try{latch.await();author.save(new Save(latest.id,expected,latest.code,body("Concurrent edit"),false));responses.add(200);}catch(Failure e){responses.add(e.status());}catch(Exception e){throw new RuntimeException(e);}}));latch.countDown();for(var task:tasks)task.get(15,TimeUnit.SECONDS);}assertEquals(List.of(200,409),responses.stream().sorted().toList());
            action(author,draft.id,"SUBMIT");action(manager,draft.id,"VIEW");
            var second=author.save(new Save(null,null,"Q-SECOND",body("Second"),false)).questions().getLast();action(author,second.id,"SUBMIT");
            var a=manager.read().questions().stream().filter(q->q.id.equals(draft.id)).findFirst().orElseThrow();var b=manager.read().questions().getLast();
            String snapshot=jdbc.queryForObject("SELECT document::text FROM platform.question_bank_workspace WHERE organization_id=?",String.class,org);
            assertThrows(Failure.class,()->manager.approve(new Bulk(List.of(new Command(a.id,a.revision,"APPROVE",null,null),new Command(b.id,b.revision,"APPROVE",null,null)))));
            assertEquals(snapshot,jdbc.queryForObject("SELECT document::text FROM platform.question_bank_workspace WHERE organization_id=?",String.class,org));
            action(author,draft.id,"REQUEST_RETIRE");action(manager,draft.id,"CONFIRM_AVAILABILITY");assertTrue(jdbc.queryForObject("SELECT retired FROM platform.question_bank_identity WHERE question_id=?",Boolean.class,draft.id));
            var candidates=new JdbcBaselineAssessmentDraftStore(new NamedParameterJdbcTemplate(source));assertTrue(candidates.findPublishedCandidates(Set.of("skill")).isEmpty());
            assertEquals("PUBLISHED",jdbc.queryForObject("SELECT publication_state FROM platform.item_version WHERE item_version_id=?",String.class,v.id));
            action(author,draft.id,"REQUEST_REACTIVATE");action(manager,draft.id,"CONFIRM_AVAILABILITY");assertEquals(1,candidates.findPublishedCandidates(Set.of("skill")).size());
            var invalid=author.preview(new Preview(List.of(new Row("Q-X",body("Valid")),new Row("Q-NEW",body("Conflict")))));assertFalse(invalid.errors.isEmpty());int count=author.read().questions().size();assertThrows(Failure.class,()->author.confirm(new Confirmation(invalid.id,true,true)));assertEquals(count,author.read().questions().size());
            assertTrue(jdbc.queryForObject("SELECT count(*) FROM platform.question_bank_mail",Integer.class)>0);
            var mail=mock(TransactionalMailSender.class);doThrow(new org.springframework.mail.MailPreparationException("Test SMTP down")).when(mail).send(anyString(),any(),anyString(),any());
            new QuestionBankMailWorker(jdbc,tx,mail,"http://localhost").deliver();assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM platform.question_bank_mail WHERE status='RETRY' AND attempts=1 AND lease_owner IS NULL",Integer.class));assertNotNull(author.read());
            var oldDraft=author.read().questions().stream().filter(q->q.id.equals(legacy)).findFirst().orElseThrow();
            author.save(new Save(oldDraft.id,oldDraft.revision,oldDraft.code,body("Repaired legacy draft"),false));action(author,legacy,"SUBMIT");action(manager,legacy,"VIEW");action(manager,legacy,"APPROVE");
            assertEquals("PUBLISHED",jdbc.queryForObject("SELECT publication_state FROM platform.item_version WHERE item_version_id=?",String.class,legacy));
            assertEquals("Repaired legacy draft",jdbc.queryForObject("SELECT prompt FROM platform.item_version WHERE item_version_id=?",String.class,legacy));
            jdbc.update("UPDATE platform.organization_membership SET active=false WHERE account_id=?",peer);assertThrows(Failure.class,()->service(peer,org,"DOMAIN_EXPERT").read());
            var foreignBank=foreignService.read().id();jdbc.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,content_hash) VALUES (?,?,99,?,'Conflicting legacy','{}'::jsonb,'{}'::jsonb,?)",UUID.randomUUID(),legacy,foreignBank,"b".repeat(64));
            assertEquals(409,assertThrows(Failure.class,author::read).status());
        }
    }
}
