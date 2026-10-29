package com.adaptlearngraph.pathway.infrastructure;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Disposable workspace lineage. Receipt/migration adapter scope only: not full review CAS evidence. */
class InitialPathwayAdapterIntegrationTest {
    static final PostgreSQLContainer<?> PG=new PostgreSQLContainer<>("postgres:17.6-alpine");
    static final UUID ORG=new UUID(0,701), OTHER=new UUID(0,702), EXPERT=new UUID(0,703);
    static final Actor ACTOR=new Actor(ORG,EXPERT,Role.DOMAIN_EXPERT);
    static JdbcTemplate sql;static TransactionTemplate tx;static JdbcInitialReceipts receipts;static InitialJdbc db;
    static Map<String,Object> retained;static List<Map<String,Object>> checksums;
    static Flyway flyway;
    @BeforeAll static void setup() {
        // No assumption/disabledWithoutDocker: missing Docker is an explicit setup error, never a skip/pass.
        PG.start();var ds=new DriverManagerDataSource(PG.getJdbcUrl(),PG.getUsername(),PG.getPassword());
        sql=new JdbcTemplate(ds);tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
        var jdbc=new NamedParameterJdbcTemplate(ds);receipts=new JdbcInitialReceipts(jdbc);db=new InitialJdbc(jdbc,new InitialRevisionCodec(new ObjectMapper().findAndRegisterModules()));
        Flyway.configure().dataSource(ds).locations("classpath:db/workspace-migration").target("34").load().migrate();
        sql.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'C3_A','C3 Org A'),(?,'C3_B','C3 Org B')",ORG,OTHER);
        sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,'c3-expert','c3-expert','test-only')",EXPERT,ORG);
        tx.executeWithoutResult(s->receipts.save(ACTOR,"INCLUDE","migration-retention","pre35",new Receipt(200,"a".repeat(64),"{\"revision\":4}")));
        retained=sql.queryForMap("SELECT * FROM platform.initial_pathway_receipt WHERE resource='migration-retention'");
        checksums=sql.queryForList("SELECT version,checksum FROM public.flyway_schema_history WHERE success ORDER BY installed_rank");
        flyway=Flyway.configure().dataSource(ds).locations("classpath:db/workspace-migration").load();flyway.migrate();
    }
    @AfterAll static void stop(){if(PG.isRunning())PG.stop();}
    @Test void R03_workspaceV34ToV35RetainsExistingReceiptAndAppliedChecksumsAndRerunsNoop() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("35");flyway.validate();
        assertThat(sql.queryForMap("SELECT * FROM platform.initial_pathway_receipt WHERE resource='migration-retention'")).isEqualTo(retained);
        assertThat(sql.queryForList("SELECT version,checksum FROM public.flyway_schema_history WHERE success AND version::int<=34 ORDER BY installed_rank")).isEqualTo(checksums);
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        String constraint=sql.queryForObject("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='initial_pathway_override_action_check'",String.class);
        assertThat(constraint).contains("INCLUDE","EXCLUDE","MOVE_UP","MOVE_DOWN","REMOVE");
    }
    @Test void R11_receiptRoundTripIsActorTenantOperationResourceKeyScoped() {
        var result=new Receipt(200,"b".repeat(64),"{\"revision\":5}");
        tx.executeWithoutResult(s->receipts.save(ACTOR,"REMOVE","scope","scope-key",result));
        var actual=receipts.find(ACTOR,"REMOVE","scope","scope-key").orElseThrow();assertThat(actual.status()).isEqualTo(200);assertThat(actual.bodyHash()).isEqualTo(result.bodyHash());assertThat(actual.responseJson()).contains("5");
        assertThat(receipts.find(new Actor(OTHER,EXPERT,Role.DOMAIN_EXPERT),"REMOVE","scope","scope-key")).isEmpty();
        assertThat(receipts.find(ACTOR,"INCLUDE","scope","scope-key")).isEmpty();assertThat(receipts.find(ACTOR,"REMOVE","foreign","scope-key")).isEmpty();
    }
    @Test void R11_injectedTransactionFailureRollsBackReceiptAuditAndOutbox() {
        var before=counts();
        assertThatThrownBy(()->tx.executeWithoutResult(s->{receipts.save(ACTOR,"REMOVE","rollback","rollback",new Receipt(200,"c".repeat(64),"{}"));
            db.event(new Scope(ORG,EXPERT),new UUID(0,704),5,"INITIAL_PATHWAY_EDITED",EXPERT,Map.of("action","REMOVE"));throw new IllegalStateException("injected-after-event");})).hasMessage("injected-after-event");
        assertThat(receipts.find(ACTOR,"REMOVE","rollback","rollback")).isEmpty();assertThat(counts()).isEqualTo(before);
    }
    @Test void R11_committedReceiptSurvivesCallerUnknownOutcomeWithoutDuplicateWrite() {
        tx.executeWithoutResult(s->receipts.save(ACTOR,"INCLUDE","unknown","unknown",new Receipt(200,"d".repeat(64),"{\"revision\":5}")));
        // Model connection loss after commit at caller boundary; reconcile the durable adapter record.
        assertThatThrownBy(()->{throw new IllegalStateException("caller-lost-response-after-commit");}).hasMessage("caller-lost-response-after-commit");
        assertThat(receipts.find(ACTOR,"INCLUDE","unknown","unknown")).isPresent();
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_receipt WHERE resource='unknown'",Long.class)).isOne();
    }
    @Test void R10_concurrentIdenticalReceiptInsertHasOneWinnerWithoutDuplicates() throws Exception {
        var ready=new CountDownLatch(2);var go=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<String> insert=()->{ready.countDown();if(!go.await(10,TimeUnit.SECONDS))throw new IllegalStateException("barrier timeout");
                try{tx.executeWithoutResult(s->receipts.save(ACTOR,"INCLUDE","race","same",new Receipt(200,"e".repeat(64),"{}")));return "committed";}
                catch(DataIntegrityViolationException duplicate){return "unique-conflict";}};
            var a=executor.submit(insert);var b=executor.submit(insert);assertThat(ready.await(10,TimeUnit.SECONDS)).isTrue();go.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder("committed","unique-conflict");
        }
        assertThat(sql.queryForObject("SELECT count(*) FROM platform.initial_pathway_receipt WHERE resource='race'",Long.class)).isOne();
    }
    @Test void R11_historyMutationForeignActorFkAndMissingTransactionRejected() {
        assertThatThrownBy(()->sql.update("UPDATE platform.initial_pathway_receipt SET response='{}'::jsonb WHERE resource='migration-retention'")).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(()->receipts.save(ACTOR,"INCLUDE","no-tx","key",new Receipt(200,"f".repeat(64),"{}"))).hasMessageContaining("requires owner transaction");
        assertThatThrownBy(()->tx.executeWithoutResult(s->receipts.save(new Actor(OTHER,EXPERT,Role.DOMAIN_EXPERT),"INCLUDE","foreign","key",new Receipt(200,"f".repeat(64),"{}")))).isInstanceOf(DataIntegrityViolationException.class);
    }
    static List<Long> counts(){return List.of("initial_pathway_receipt","audit_event","outbox_event").stream().map(t->sql.queryForObject("SELECT count(*) FROM platform."+t,Long.class)).toList();}
}
