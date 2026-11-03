package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.LearningContent;
import static org.junit.jupiter.api.Assertions.*;

import com.adaptlearngraph.entities.domain.LearningResources.*;
import com.adaptlearngraph.support.JpaTestContext;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.*;

class LearningContentIntegrationTest {
    @Test
    void forwardMigrationPersistsSettingsAssetsAssignmentsProgressAndNotificationsWithIsolation()
            throws Exception {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            Flyway.configure()
                    .dataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword())
                    .locations("filesystem:src/main/resources/db/module-migration")
                    .target("35")
                    .load()
                    .migrate();
            var jdbc =
                    new JdbcTemplate(
                            new DriverManagerDataSource(
                                    pg.getJdbcUrl(), pg.getUsername(), pg.getPassword()));
            String legacy =
                    "{\"id\":\"old-content\",\"title\":\"Existing title\",\"markdown\":\"# Existing"
                            + " body\",\"createdBy\":null,\"createdAt\":\"2026-10-01T00:00:00Z\"}";
            jdbc.update(
                    "INSERT INTO platform.module_authoring_content VALUES"
                            + " ('org','old-content',?::jsonb)",
                    legacy);
            jdbc.update(
                    "INSERT INTO platform.module_authoring VALUES"
                        + " ('org','legacy',jsonb_build_object('createdBy','original','history','[{}]'::jsonb,'revisions',jsonb_build_array(jsonb_build_object('number',7,'payload',jsonb_build_object('content',?::jsonb)))))",
                    legacy);
            Flyway.configure()
                    .dataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword())
                    .locations("filesystem:src/main/resources/db/module-migration")
                    .load()
                    .migrate();
            var tree =
                    new ObjectMapper()
                            .readTree(
                                    jdbc.queryForObject(
                                            "SELECT document::text FROM platform.module_authoring"
                                                    + " WHERE module_id='legacy'",
                                            String.class));
            assertEquals("original", tree.get("createdBy").asText());
            assertEquals(7, tree.at("/revisions/0/number").asInt());
            assertEquals(1, tree.get("history").size());
            assertEquals(
                    "# Existing body",
                    tree.at("/revisions/0/payload/content/lessons/0/body").asText());
            assertEquals(
                    "old-content-text",
                    tree.at("/revisions/0/payload/content/lessons/0/id").asText());
            assertTrue(tree.at("/revisions/0/payload/content/createdBy").isNull());
            var persistence = JpaTestContext.start(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            var repositories = LearningContentRepositories.from(persistence::bean);
            var adapter = new JpaLearningContentAdapter(repositories, new ObjectMapper());
            assertFalse(adapter.assigned("org", "learner", "module"));
            var generated = new JpaLearningContentAdapter(repositories, new ObjectMapper(),
                    (org, learner, module) -> org.equals("org") && learner.equals("learner") && module.equals("module"));
            assertTrue(generated.assigned("org", "learner", "module"));
            assertFalse(generated.assigned("other", "learner", "module"));
            assertFalse(generated.assigned("org", "other", "module"));
            assertFalse(generated.assigned("org", "learner", "other"));
            var initial = adapter.limits();
            assertEquals(209715200, initial.videoBytes());
            assertEquals(5242880, initial.imageBytes());
            assertEquals(524288000, initial.zipBytes());
            var limits =
                    adapter.limits(
                            new Limits(
                                    104857600, 2097152, 104857600, initial.version(), null, null),
                            "admin");
            assertEquals("admin", limits.changedBy());
            assertEquals(2, limits.version());
            assertNotNull(limits.changedAt());
            assertThrows(
                    RuntimeException.class,
                    () ->
                            adapter.limits(
                                    new Limits(
                                            104857600,
                                            2097152,
                                            104857600,
                                            initial.version(),
                                            null,
                                            null),
                                    "admin"));
            assertEquals(
                    1,
                    jdbc.queryForObject(
                            "SELECT count(*) FROM platform.learning_settings_audit",
                            Integer.class));
            String assetId = UUID.randomUUID().toString();
            var asset =
                    new Asset(
                            assetId,
                            "org",
                            "expert",
                            "private/asset.mp4",
                            "lesson.mp4",
                            "video/mp4",
                            150000000,
                            "abc123",
                            100.0,
                            "2026-10-29T00:00:00Z");
            adapter.asset(asset);
            var saved = adapter.asset("org", assetId).orElseThrow();
            assertEquals(asset.objectKey(), saved.objectKey());
            assertEquals(asset.createdBy(), saved.createdBy());
            assertEquals(asset.filename(), saved.filename());
            assertEquals(asset.mediaType(), saved.mediaType());
            assertEquals(asset.byteSize(), saved.byteSize());
            assertEquals(asset.sha256(), saved.sha256());
            assertEquals(asset.durationSeconds(), saved.durationSeconds());
            assertNotNull(saved.createdAt());
            assertTrue(adapter.asset("other", assetId).isEmpty());
            // Previously accepted oversized media remains valid when limits are lowered.
            var lesson =
                    new LearningContent.Lesson(
                            "v", "Video", "VIDEO", null, null, 1, "MANUAL", "UPLOAD", assetId,
                            null);
            assertEquals(
                    100,
                    adapter.prepare("org", "expert", List.of(lesson), true)
                            .getFirst()
                            .durationSeconds());
            jdbc.update("INSERT INTO platform.module_authoring VALUES ('org','module','{}')");
            var progress =
                    new Progress(
                            "v",
                            90,
                            List.of(new LearningContent.Interval(0, 90)),
                            false,
                            "2026-10-29T00:00:00Z",
                            "2026-10-29T00:00:00Z");
            adapter.progress("org", "learner", "module", 1, progress);
            var persisted = adapter.progress("org", "learner", "module", 1).getFirst();
            assertEquals(90, persisted.positionSeconds());
            assertEquals(progress.watchedIntervals(), persisted.watchedIntervals());
            assertNotNull(persisted.coverageUpdatedAt());
            assertNotNull(persisted.completedAt());
            assertNotNull(persisted.updatedAt());
            assertEquals("v", adapter.activeLesson("org", "learner", "module"));
            assertTrue(adapter.progress("other", "learner", "module", 1).isEmpty());
            adapter.notify("org", "learner", "key", "NEW_VERSION", "module", "Title", "Body");
            adapter.notify("org", "learner", "key", "NEW_VERSION", "module", "Title", "Body");
            assertEquals(1, adapter.notifications("org", "learner").size());
            assertTrue(adapter.notifications("other", "learner").isEmpty());
            var notification = adapter.notifications("org", "learner").getFirst();
            assertEquals("Body", notification.body());
            assertEquals("NEW_VERSION", notification.kind());
            assertNull(notification.readAt());
            adapter.readNotification("org", "learner", notification.id());
            assertNotNull(adapter.notifications("org", "learner").getFirst().readAt());
            // A null completion time is persisted as SQL NULL (text timestamps are parsed by PostgreSQL as before).
            adapter.progress("org", "learner", "module", 1,
                    new Progress("w", 0, List.of(), false, null, "2026-10-29T00:00:00Z", "2026-10-29T00:00:00Z"));
            var open = adapter.progress("org", "learner", "module", 1).stream()
                    .filter(p -> p.lessonId().equals("w")).findFirst().orElseThrow();
            assertNull(open.completedAt());
            assertEquals("2026-10-29T00:00:00Z", open.coverageUpdatedAt());
            assertEquals("w", adapter.activeLesson("org", "learner", "module"));
            assertNull(adapter.activeLesson("other", "learner", "module"));
            // Lesson references (images, uploads, verified external videos) are resolved within the organization only.
            String imageId = UUID.randomUUID().toString();
            adapter.asset(new Asset(imageId, "org", "expert", "org/" + imageId + ".png", "image.png", "image/png", 10,
                    "def456", null, "2026-10-29T00:00:00Z"));
            String youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
            persistence.bean(LearningVideoVerificationJpaRepository.class).verify("org", "expert", youtube, 42.5);
            var lessons = List.of(
                    new LearningContent.Lesson("text", "Text", "TEXT",
                            "Read ![diagram](/api/v1/module-management/assets/" + imageId + ")", "MARKDOWN", 0,
                            "ESTIMATED", null, null, null),
                    new LearningContent.Lesson("html", "Html", "TEXT",
                            "<p>Hi<img src=\"/api/v1/module-management/assets/" + imageId + "\"></p>", "HTML", 0,
                            "ESTIMATED", null, null, null),
                    new LearningContent.Lesson("upload", "Upload", "VIDEO", null, null, 1, "MANUAL", "UPLOAD", assetId, null),
                    new LearningContent.Lesson("external", "External", "VIDEO", null, null, 1, "MANUAL", "YOUTUBE", null,
                            youtube));
            var prepared = adapter.prepare("org", "expert", lessons, false);
            assertEquals(List.of(60.0, 60.0, 100.0, 42.5),
                    prepared.stream().map(LearningContent.Lesson::durationSeconds).toList());
            assertEquals("MEDIA", prepared.get(3).durationSource());
            assertThrows(RuntimeException.class, () -> adapter.prepare("other", "expert", lessons.subList(0, 1), false));
            assertThrows(RuntimeException.class, () -> adapter.prepare("other", "expert", lessons.subList(1, 2), false));
            assertThrows(RuntimeException.class, () -> adapter.prepare("other", "expert", lessons.subList(2, 3), false));
            assertEquals(1, adapter.prepare("other", "expert", lessons.subList(3, 4), false).getFirst().durationSeconds());
            // Another organization can neither switch a learner pin nor read/mark this organization's notifications.
            jdbc.update("INSERT INTO platform.module_learning_pin(organization_id,learner_id,module_id,revision)"
                    + " VALUES ('org','learner','module',1)");
            adapter.switchVersion("other", "learner", "module", 1, 2);
            assertEquals(1, jdbc.queryForObject("SELECT revision FROM platform.module_learning_pin WHERE"
                    + " organization_id='org' AND learner_id='learner' AND module_id='module'", Integer.class));
            adapter.switchVersion("org", "learner", "module", 1, 2);
            assertEquals(2, jdbc.queryForObject("SELECT revision FROM platform.module_learning_pin WHERE"
                    + " organization_id='org' AND learner_id='learner' AND module_id='module'", Integer.class));
            assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM platform.learning_version_switch WHERE"
                    + " organization_id='org' AND from_revision=1 AND to_revision=2", Integer.class));
            adapter.published("other", "module", 3, "Foreign");
            adapter.published("org", "module", 3, "Next");
            var update = adapter.notifications("org", "learner").stream()
                    .filter(n -> n.title().equals("Next")).findFirst().orElseThrow();
            assertTrue(adapter.notifications("other", "learner").isEmpty());
            adapter.readNotification("other", "learner", update.id());
            adapter.readNotification("org", "intruder", update.id());
            assertNull(adapter.notifications("org", "learner").stream()
                    .filter(n -> n.id().equals(update.id())).findFirst().orElseThrow().readAt());
            assertThrows(org.springframework.dao.DataAccessException.class,
                    () -> adapter.readNotification("org", "learner", "not-a-uuid"));
            // Excel/ZIP import previews are scoped to organization and importing actor.
            var imports = persistence.bean(LearningImportJpaRepository.class);
            UUID importId = UUID.randomUUID();
            imports.insert(new com.adaptlearngraph.entities.LearningImportEntity(
                    importId, "org", "expert", "{\"id\":\"preview\"}", "PREVIEW", null, null));
            assertEquals(List.of("{\"id\": \"preview\"}"), imports.document(importId, "org", "expert"));
            assertTrue(imports.document(importId, "other", "expert").isEmpty());
            assertTrue(imports.document(importId, "org", "other-expert").isEmpty());
            assertTrue(imports.lockDocument(importId, "other", "expert").isEmpty());
            assertEquals(0, imports.commit(importId, "other", "expert", "{\"id\":\"stolen\"}"));
            assertEquals(1, imports.commit(importId, "org", "expert", "{\"id\":\"committed\"}"));
            assertEquals("COMMITTED", jdbc.queryForObject(
                    "SELECT state FROM platform.learning_import WHERE id=?", String.class, importId));
            assertNotNull(jdbc.queryForObject(
                    "SELECT committed_at FROM platform.learning_import WHERE id=?", java.sql.Timestamp.class, importId));
            assertEquals("committed", jdbc.queryForObject(
                    "SELECT document->>'id' FROM platform.learning_import WHERE id=?", String.class, importId));
            // Durable learning mail: claim the oldest due notification of an active recipient, fence every release.
            UUID mailOrganization = UUID.randomUUID();
            UUID recipient = UUID.randomUUID();
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'MAILORG','Mail org')",
                    mailOrganization);
            jdbc.update("INSERT INTO platform.account(account_id,identifier,normalized_identifier,password_hash,organization_id)"
                    + " VALUES (?,'learner@example.test','learner@example.test','hash',?)", recipient, mailOrganization);
            adapter.notify(mailOrganization.toString(), recipient.toString(), "mail", "NEW_VERSION", "module", "Mail", "Body");
            var mail = org.mockito.Mockito.mock(com.adaptlearngraph.helper.TransactionalMailSender.class);
            org.mockito.Mockito.when(mail.configured()).thenReturn(true);
            org.mockito.Mockito.doThrow(new org.springframework.mail.MailSendException("down")).when(mail)
                    .send(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
            var notifications = persistence.bean(LearningNotificationJpaRepository.class);
            var worker = new com.adaptlearngraph.services.LearningMailWorker(notifications,
                    new org.springframework.transaction.support.TransactionTemplate(persistence.transactionManager()), mail,
                    "http://localhost");
            worker.deliver();
            var failed = jdbc.queryForMap("SELECT id,mail_attempts,mail_error,mail_sent_at,mail_next_attempt>now() AS later"
                    + " FROM platform.learning_notification WHERE recipient_id=?", recipient.toString());
            assertEquals(1, failed.get("mail_attempts"));
            assertEquals("SMTP_UNAVAILABLE", failed.get("mail_error"));
            assertNull(failed.get("mail_sent_at"));
            assertEquals(true, failed.get("later"));
            worker.deliver();
            jdbc.update("UPDATE platform.learning_notification SET mail_next_attempt=now() WHERE recipient_id=?",
                    recipient.toString());
            UUID mailId = (UUID) failed.get("id");
            assertEquals(0, notifications.markMailSent(mailId, 0));
            org.mockito.Mockito.doNothing().when(mail)
                    .send(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
            worker.deliver();
            worker.deliver();
            var sent = jdbc.queryForMap("SELECT mail_attempts,mail_error,mail_sent_at FROM platform.learning_notification"
                    + " WHERE recipient_id=?", recipient.toString());
            assertEquals(2, sent.get("mail_attempts"));
            assertNull(sent.get("mail_error"));
            assertNotNull(sent.get("mail_sent_at"));
            org.mockito.Mockito.verify(mail, org.mockito.Mockito.times(2))
                    .send(org.mockito.ArgumentMatchers.eq("learner@example.test"), org.mockito.ArgumentMatchers.any(),
                            org.mockito.ArgumentMatchers.eq("X-Learning-Event"), org.mockito.ArgumentMatchers.eq(mailId));
            persistence.close();
        }
    }
}
