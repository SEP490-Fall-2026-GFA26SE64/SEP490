package com.adaptlearngraph.assessment.infrastructure;

import java.io.IOException;
import java.util.UUID;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ResourceLoader;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

@Configuration(proxyBeanMethods = false)
@Profile("question-bank-import & !migrate & !prod")
@ConditionalOnProperty(prefix = "question-bank.import", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(OfficialQuestionBankImportConfiguration.Properties.class)
public class OfficialQuestionBankImportConfiguration {
    @ConfigurationProperties("question-bank.import")
    public record Properties(boolean enabled, String manifestResource, String manifestVersion, String expectedManifestSha256,
            String scopeResource, String expectedScopeSha256, String expectedSourceSha256, String occupationId,
            UUID bankId, UUID ownerAccountId, UUID organizationId, String expectedJdbcUrl, boolean localSeed) {}

    @Bean
    ApplicationRunner officialQuestionBankImport(DataSource source, Driver driver, ResourceLoader resources,
            ConfigurableApplicationContext context, Properties settings, Environment environment,
            @Value("${spring.data.neo4j.database:}") String database) {
        return args -> {
            require(!settings.localSeed() || environment.acceptsProfiles(Profiles.of("(local | demo) & !prod")),
                    "Local seeding requires explicit local/demo and excludes prod");
            require(settings.enabled() && settings.bankId() != null && settings.ownerAccountId() != null
                    && settings.organizationId() != null, "Explicit bank/owner/tenant required");
            text(settings.expectedJdbcUrl()); text(settings.manifestVersion()); text(settings.occupationId());
            for (String hash : new String[]{settings.expectedManifestSha256(), settings.expectedScopeSha256(), settings.expectedSourceSha256()}) {
                require(hash != null && hash.matches("[0-9a-f]{64}"), "Explicit SHA256 pins required");
            }
            byte[] manifestBytes = read(resources, settings.manifestResource());
            byte[] scopeBytes = read(resources, settings.scopeResource());
            require(sha256(manifestBytes).equals(settings.expectedManifestSha256())
                    && sha256(scopeBytes).equals(settings.expectedScopeSha256()), "Import resource hash mismatch");
            var manifest = parse(manifestBytes, OfficialQuestionBankManifest.class);
            var scope = parse(scopeBytes, OfficialQuestionBankCatalog.Scope.class);
            require(settings.bankId().equals(manifest.questionBank().id())
                    && settings.occupationId().equals(manifest.occupationId())
                    && settings.manifestVersion().equals(manifest.manifestVersion())
                    && settings.expectedSourceSha256().equals(manifest.sourceSha256())
                    && settings.expectedScopeSha256().equals(manifest.scopeSha256()), "Configured import scope mismatch");
            manifest.validate(scope);
            new OfficialQuestionBankCatalog().verify(driver, database, scope);
            var result = new OfficialQuestionBankImporter(source).importManifest(manifest,
                    new OfficialQuestionBankImporter.Owner(settings.ownerAccountId(), settings.organizationId(), settings.expectedJdbcUrl()),
                    settings.localSeed() ? OfficialQuestionBankImporter.Mode.LOCAL_SEED : OfficialQuestionBankImporter.Mode.ADMINISTRATOR);
            LoggerFactory.getLogger(OfficialQuestionBankImportConfiguration.class).info(
                    "Official DRAFT bank={} createdItems={} existingItems={}", result.bankId(), result.createdItems(), result.existingItems());
            context.close();
        };
    }

    private static byte[] read(ResourceLoader loader, String path) throws IOException {
        require(path != null && (path.startsWith("file:") || path.startsWith("classpath:")), "Local import resource required");
        try (var stream = loader.getResource(path).getInputStream()) {
            byte[] bytes = stream.readNBytes(8 * 1024 * 1024 + 1);
            require(bytes.length <= 8 * 1024 * 1024, "Import resource exceeds 8 MiB");
            return bytes;
        }
    }
}
