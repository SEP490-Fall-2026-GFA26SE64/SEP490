package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ModuleResponsibilityPersistenceTest {
    @Test void migrationRoundTripConcurrentTransferAndRollbackPreserveHistory() throws Exception {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var jdbc = new JdbcTemplate(ds); var json = new ObjectMapper();
            jdbc.execute("CREATE SCHEMA platform");
            jdbc.execute("CREATE TABLE platform.module_authoring(organization_id text, module_id text, document jsonb, PRIMARY KEY(organization_id,module_id))");
            var old = json.valueToTree(ModuleResponsibilityTransferTest.fixture("DEVELOPMENT_SEED", "DEVELOPMENT_SEED", "RELEASED"));
            ((com.fasterxml.jackson.databind.node.ObjectNode)old).remove("responsibleExpertId");
            jdbc.update("INSERT INTO platform.module_authoring VALUES ('org','module',CAST(? AS jsonb))", old.toString());
            jdbc.update("INSERT INTO platform.module_authoring VALUES ('other','custom',CAST(? AS jsonb))", "{\"createdBy\":\"creator\",\"responsibleExpertId\":\"existing-owner\"}");
            jdbc.update("INSERT INTO platform.module_authoring VALUES ('other','unknown',CAST(? AS jsonb))", "{\"createdBy\":null}");
            var migration = new ResourceDatabasePopulator(new ClassPathResource("db/workspace-migration/V70__module_responsible_expert.sql"));
            migration.execute(ds); migration.execute(ds);
            assertEquals("DEVELOPMENT_SEED", jdbc.queryForObject("SELECT document->>'responsibleExpertId' FROM platform.module_authoring WHERE module_id='module'", String.class));
            assertEquals("existing-owner", jdbc.queryForObject("SELECT document->>'responsibleExpertId' FROM platform.module_authoring WHERE module_id='custom'", String.class));
            assertNull(jdbc.queryForObject("SELECT document->>'responsibleExpertId' FROM platform.module_authoring WHERE module_id='unknown'", String.class));
            var port = mock(ModuleAuthoringPort.class);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
            when(port.actor()).thenReturn(new Actor("manager", "org", Set.of("LD_MANAGER")));
            when(port.transaction(any())).thenAnswer(c -> tx.execute(status -> c.<Supplier<?>>getArgument(0).get()));
            when(port.catalog("Expert")).thenReturn(List.of(new Choice("expert-a", "A"), new Choice("expert-b", "B")));
            when(port.lock(anyString(), anyString())).thenAnswer(c -> {
                var rows = jdbc.queryForList("SELECT document::text FROM platform.module_authoring WHERE organization_id=? AND module_id=? FOR UPDATE", String.class, c.getArgument(0), c.getArgument(1));
                return rows.isEmpty() ? Optional.empty() : Optional.of(json.readValue(rows.getFirst(), Document.class));
            });
            doAnswer(c -> { Document doc = c.getArgument(0); jdbc.update("UPDATE platform.module_authoring SET document=CAST(? AS jsonb) WHERE organization_id=? AND module_id=?", json.writeValueAsString(doc), doc.organizationId(), doc.id()); return null; }).when(port).save(any());
            var service = new ModuleAuthoringService(port);
            var start = new CountDownLatch(1);
            try (var pool = Executors.newFixedThreadPool(2)) {
                var futures = new ArrayList<Future<Integer>>();
                for (String target : List.of("expert-a", "expert-b")) futures.add(pool.submit(() -> {
                    start.await(); try { service.transferResponsibility("module", 1, target); return 200; }
                    catch (ModuleAuthoringService.Failure failure) { return failure.status(); }
                }));
                start.countDown(); var outcomes = new ArrayList<Integer>();
                for (var future : futures) outcomes.add(future.get(30, TimeUnit.SECONDS));
                Collections.sort(outcomes); assertEquals(List.of(200, 409), outcomes);
            }
            var persisted = service.detail("module");
            assertEquals("DEVELOPMENT_SEED", persisted.createdBy()); assertEquals("RELEASED", persisted.current().state());
            assertEquals(2, persisted.lockVersion()); assertEquals(2, persisted.history().size());
            assertEquals("DEVELOPMENT_SEED", persisted.history().getLast().previousResponsibleExpertId());
            assertEquals("manager", persisted.history().getLast().actorId());
            String next = persisted.responsibleExpertId().equals("expert-a") ? "expert-b" : "expert-a";
            doAnswer(c -> { Document doc = c.getArgument(0); jdbc.update("UPDATE platform.module_authoring SET document=CAST(? AS jsonb) WHERE module_id='module'", json.writeValueAsString(doc)); throw new IllegalStateException("Simulated persistence failure"); }).when(port).save(any());
            assertThrows(IllegalStateException.class, () -> service.transferResponsibility("module", 2, next));
            assertEquals(persisted, service.detail("module"));
        }
    }
}
