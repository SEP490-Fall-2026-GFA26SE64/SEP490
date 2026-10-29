package com.adaptlearngraph.catalog.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import com.adaptlearngraph.catalog.domain.LearningContent;
import com.adaptlearngraph.catalog.domain.LearningResources.*;
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
                    .locations("filesystem:src/main/resources/db/migration")
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
                    .locations("filesystem:src/main/resources/db/migration")
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
            var adapter = new JdbcLearningContentAdapter(jdbc, new ObjectMapper());
            assertFalse(adapter.assigned("org", "learner", "module"));
            var generated = new JdbcLearningContentAdapter(jdbc, new ObjectMapper(),
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
        }
    }
}
