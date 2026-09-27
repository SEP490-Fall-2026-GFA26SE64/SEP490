package com.adaptlearngraph.platform.infrastructure;

import com.adaptlearngraph.catalog.infrastructure.GraphSchemaMigrator;
import com.adaptlearngraph.catalog.infrastructure.DevelopmentCatalogSeeder;
import org.neo4j.driver.Driver;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
@Profile("migrate")
public final class DatabaseInitialization implements ApplicationRunner {
    private final DataSource dataSource;
    private final Driver driver;
    private final ConfigurableApplicationContext context;
    private final boolean seedEnabled;
    private final Environment environment;

    public DatabaseInitialization(DataSource dataSource, Driver driver, ConfigurableApplicationContext context,
            @Value("${catalog.seed.enabled:false}") boolean seedEnabled, Environment environment) {
        this.dataSource = dataSource;
        this.driver = driver;
        this.context = context;
        this.seedEnabled = seedEnabled;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments arguments) throws Exception {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("SET lock_timeout = '120s'");
            statement.execute("SELECT pg_advisory_lock(49020260916)");
            try {
                new GraphSchemaMigrator(driver).migrate();
                if (seedEnabled && environment.acceptsProfiles(Profiles.of("local"))) {
                    new DevelopmentCatalogSeeder(driver).seed();
                }
            } finally {
                statement.execute("SELECT pg_advisory_unlock(49020260916)");
            }
        }
        context.close();
    }
}