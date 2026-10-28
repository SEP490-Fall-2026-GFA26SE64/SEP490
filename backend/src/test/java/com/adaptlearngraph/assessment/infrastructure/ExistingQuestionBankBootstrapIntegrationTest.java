package com.adaptlearngraph.assessment.infrastructure;

import java.util.ArrayList;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import static org.junit.jupiter.api.Assertions.*;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

class ExistingQuestionBankBootstrapIntegrationTest {
    @Test void verifiesFrozenBankWithoutWritingOrRepairingItemsAfterCatalogUpgrade() throws Exception {
        try (var pg = new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            pg.start();
            var ds = new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword());
            Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
            var jdbc = new JdbcTemplate(ds);
            byte[] bytes;
            try (var input = new ClassPathResource("db/seed/question-bank-15-1212.00-v1-ontology-v09.json").getInputStream()) { bytes = input.readAllBytes(); }
            var manifest = parse(bytes, OfficialQuestionBankManifest.class);
            var id = UUID.fromString("00000000-0000-0000-0000-000000000001");
            var owner = new OfficialQuestionBankImporter.Owner(id, id, pg.getJdbcUrl());
            var importer = new OfficialQuestionBankImporter(ds);
            assertFalse(importer.verifyExistingManifest(manifest, owner, OfficialQuestionBankImporter.Mode.LOCAL_SEED));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM platform.account", Integer.class));
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'LOCAL-DEMO','Local Demo')", id);
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,'owner','owner','not-a-login')", id, id);
            assertEquals(135, importer.importManifest(manifest, owner, OfficialQuestionBankImporter.Mode.LOCAL_SEED).createdItems());
            String before = fingerprint(jdbc);
            assertTrue(importer.verifyExistingManifest(manifest, owner, OfficialQuestionBankImporter.Mode.LOCAL_SEED));
            assertEquals(before, fingerprint(jdbc));
            var original = manifest.items().getFirst();
            for (boolean missing : new boolean[] {false, true}) {
                var items = new ArrayList<>(manifest.items());
                items.set(0, new Item(missing ? UUID.randomUUID() : original.itemVersionId(), missing ? UUID.randomUUID() : original.itemId(),
                        original.version(), original.microSkillId(), original.microSkillName(), original.difficulty(),
                        missing ? original.prompt() : original.prompt() + " changed", original.responseSchema(), original.protectedKey(),
                        original.publicationState(), original.contentHash()));
                var changed = new OfficialQuestionBankManifest(manifest.formatVersion(), manifest.manifestVersion(), manifest.catalogVersion(),
                        manifest.sourceSha256(), manifest.scopeSha256(), manifest.occupationId(), manifest.questionBank(), items);
                assertThrows(IllegalStateException.class, () -> importer.verifyExistingManifest(changed, owner, OfficialQuestionBankImporter.Mode.LOCAL_SEED));
                assertEquals(before, fingerprint(jdbc));
            }
            jdbc.update("UPDATE platform.account SET active=false WHERE account_id=?", id);
            assertThrows(IllegalStateException.class, () -> importer.verifyExistingManifest(manifest, owner, OfficialQuestionBankImporter.Mode.LOCAL_SEED));
            assertEquals(before, fingerprint(jdbc));
        }
    }
    private String fingerprint(JdbcTemplate jdbc) {
        return jdbc.queryForObject("SELECT md5(string_agg(to_jsonb(i)::text, '' ORDER BY item_version_id)) FROM platform.item_version i", String.class);
    }
}
