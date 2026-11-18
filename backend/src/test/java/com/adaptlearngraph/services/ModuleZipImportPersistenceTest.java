package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.LearningImportEntity;
import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.*;
import org.testcontainers.utility.DockerImageName;
import java.io.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Real PostgreSQL transactions and MinIO bytes, using isolated actor/catalog/port fixtures. */
class ModuleZipImportPersistenceTest {
    @Test void samplePackageRoundTripsAssetsAndDraftsAtomicallyWithoutPublishing()throws Exception {
        try(var pg=new PostgreSQLContainer<>("postgres:17.6-alpine");
            var minio=new GenericContainer<>(DockerImageName.parse(System.getProperty("module.import.minio-image", "minio/minio:RELEASE.2025-04-22T22-12-26Z")))
                    .withEnv("MINIO_ROOT_USER","import-test").withEnv("MINIO_ROOT_PASSWORD","isolated-test-secret")
                    .withCommand("server","/data").withExposedPorts(9000)
                    .waitingFor(org.testcontainers.containers.wait.strategy.Wait.forHttp("/minio/health/live").forPort(9000))) {
            pg.start();minio.start();
            var ds=new DriverManagerDataSource(pg.getJdbcUrl(),pg.getUsername(),pg.getPassword());var jdbc=new JdbcTemplate(ds);
            jdbc.execute("CREATE SCHEMA platform");
            jdbc.execute("CREATE TABLE platform.module_authoring(organization_id text,module_id text,document jsonb,PRIMARY KEY(organization_id,module_id),UNIQUE(module_id))");
            jdbc.execute("CREATE TABLE platform.module_authoring_content(organization_id text,content_id text,document jsonb,PRIMARY KEY(organization_id,content_id))");
            jdbc.execute("CREATE TABLE platform.learning_import(id uuid PRIMARY KEY,organization_id text,actor_id text,document jsonb,state text,created_at timestamptz DEFAULT now(),committed_at timestamptz)");
            var json=new ObjectMapper();var tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
            var port=mock(ModuleAuthoringPort.class);var content=mock(LearningContentPort.class);var imports=mock(LearningImportJpaRepository.class);
            AtomicReference<Actor> actor=new AtomicReference<>(new Actor("expert","org",Set.of("EXPERT")));
            when(port.actor()).thenAnswer(c->actor.get());
            when(port.transaction(any())).thenAnswer(c->tx.execute(s->c.<Supplier<?>>getArgument(0).get()));
            when(port.catalog("ModuleSkill")).thenReturn(List.of(new Choice("MS-QA08","Exploratory testing")));
            when(port.catalog("MicroSkill")).thenReturn(List.of(new Choice("MS-QA08","Exploratory testing")));
            when(port.requireKnowledge(eq("org"),eq("MS-QA08"),anyString(),eq(List.of()))).thenAnswer(c->new KnowledgeDefinition(KnowledgeLevel.valueOf(c.getArgument(2)),"1",List.of()));
            when(port.documents(anyString())).thenAnswer(c->{var result=new ArrayList<Document>();for(String text:jdbc.queryForList("SELECT document::text FROM platform.module_authoring WHERE organization_id=?",String.class,c.<String>getArgument(0)))result.add(json.readValue(text,Document.class));return result;});
            when(port.managedModuleIds()).thenAnswer(c->jdbc.queryForList("SELECT module_id FROM platform.module_authoring",String.class));
            when(port.lock(anyString(),anyString())).thenAnswer(c->{var rows=jdbc.queryForList("SELECT document::text FROM platform.module_authoring WHERE organization_id=? AND module_id=? FOR UPDATE",String.class,c.getArgument(0),c.getArgument(1));return rows.isEmpty()?Optional.empty():Optional.of(json.readValue(rows.getFirst(),Document.class));});
            when(port.contents(anyString())).thenAnswer(c->{var result=new ArrayList<Content>();for(String text:jdbc.queryForList("SELECT document::text FROM platform.module_authoring_content WHERE organization_id=?",String.class,c.<String>getArgument(0)))result.add(json.readValue(text,Content.class));return result;});
            doAnswer(c->{Content value=c.getArgument(1);jdbc.update("INSERT INTO platform.module_authoring_content VALUES(?,?,CAST(? AS jsonb))",c.getArgument(0),value.id(),json.writeValueAsString(value));return null;}).when(port).saveContent(anyString(),any());
            AtomicBoolean failSecond=new AtomicBoolean(true);AtomicInteger saves=new AtomicInteger();
            doAnswer(c->{Document value=c.getArgument(0);jdbc.update("INSERT INTO platform.module_authoring VALUES(?,?,CAST(? AS jsonb))",value.organizationId(),value.id(),json.writeValueAsString(value));if(failSecond.get() && saves.incrementAndGet()==2)throw new IllegalStateException("Simulated second module failure");return null;}).when(port).save(any());
            when(content.limits()).thenReturn(new Limits(1048576,1048576,1048576,1,null,null));
            Map<String,Asset> assets=new HashMap<>();
            doAnswer(c->{Asset a=c.getArgument(0);assets.put(a.id(),a);return null;}).when(content).asset(any());
            when(content.asset(anyString(),anyString())).thenAnswer(c->Optional.ofNullable(assets.get(c.getArgument(1))).filter(a->a.organizationId().equals(c.getArgument(0))));
            when(content.prepare(anyString(),anyString(),anyList(),anyBoolean())).thenAnswer(c->{List<LearningContent.Lesson> values=c.getArgument(2);if(c.<Boolean>getArgument(3))LearningContent.requireComplete(values);return values;});
            var files=new PrivateLearningAssets("http://"+minio.getHost()+":"+minio.getMappedPort(9000),"import-test","isolated-test-secret","module-import-test",content,mock(LearningVideoVerificationJpaRepository.class));
            doAnswer(c->{LearningImportEntity e=c.getArgument(0);jdbc.update("INSERT INTO platform.learning_import(id,organization_id,actor_id,document,state) VALUES(?,?,?,CAST(? AS jsonb),?)",e.getId(),e.getOrganizationId(),e.getActorId(),e.getDocument(),e.getState());return null;}).when(imports).insert(any());
            when(imports.document(any(),anyString(),anyString())).thenAnswer(c->jdbc.queryForList("SELECT document::text FROM platform.learning_import WHERE id=? AND organization_id=? AND actor_id=?",String.class,c.getArgument(0),c.getArgument(1),c.getArgument(2)));
            when(imports.lockDocument(any(),anyString(),anyString())).thenAnswer(c->jdbc.queryForList("SELECT document::text FROM platform.learning_import WHERE id=? AND organization_id=? AND actor_id=? FOR UPDATE",String.class,c.getArgument(0),c.getArgument(1),c.getArgument(2)));
            when(imports.commit(any(),anyString(),anyString(),anyString())).thenAnswer(c->jdbc.update("UPDATE platform.learning_import SET document=CAST(? AS jsonb),state='COMMITTED',committed_at=now() WHERE id=? AND organization_id=? AND actor_id=?",c.getArgument(3),c.getArgument(0),c.getArgument(1),c.getArgument(2)));
            var authoring=new ModuleAuthoringService(port,content);var service=new ExcelLearningImport(port,content,files,authoring,imports,json);
            byte[] template=service.template();var preview=service.preview("module.zip",template.length,new ByteArrayInputStream(template));
            assertTrue(preview.errors().isEmpty(),preview.errors().toString());assertEquals(2,assets.size());
            var expectedVideo=ModuleImportTemplate.class.getResourceAsStream("/learning-import/sample-video.mp4").readAllBytes();
            for(var asset:assets.values())try(var stream=files.open(asset,0,asset.byteSize())){assertArrayEquals(expectedVideo,stream.readAllBytes());assertTrue(asset.durationSeconds()>0);}
            assertThrows(IllegalStateException.class,()->service.commit(preview.id(),false));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.module_authoring",Integer.class));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM platform.module_authoring_content",Integer.class));
            assertEquals("PREVIEW",jdbc.queryForObject("SELECT state FROM platform.learning_import",String.class));
            failSecond.set(false);var result=service.commit(preview.id(),false);assertEquals(2,result.size());
            assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM platform.module_authoring",Integer.class));
            for(var doc:result){var reloaded=authoring.detail(doc.id());assertEquals(doc,reloaded);assertEquals("expert",reloaded.createdBy());assertEquals("expert",reloaded.responsibleExpertId());assertEquals("DRAFT",reloaded.current().state());assertNull(reloaded.releasedRevision());assertNull(reloaded.current().decidedBy());assertNull(reloaded.current().decidedAt());assertTrue(reloaded.current().payload().content().lessons().getFirst().body().contains("<table>"));}
            assertThrows(ModuleAuthoringService.Failure.class,()->service.commit(preview.id(),false));
            actor.set(new Actor("other","foreign",Set.of("EXPERT")));
            assertEquals(404,assertThrows(ModuleAuthoringService.Failure.class,()->service.validate(preview.id())).status());
            verify(port,never()).project(any(),any(),anyBoolean());
        }
    }
}
