package com.adaptlearngraph.platform.infrastructure;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
@Profile("migrate")
public final class DatabaseInitialization implements ApplicationRunner {
    private final DataSource dataSource;
    private final ConfigurableApplicationContext context;
    private final boolean seedEnabled;

    public DatabaseInitialization(DataSource dataSource, ConfigurableApplicationContext context,
            @Value("${catalog.seed.enabled:false}") boolean seedEnabled) {
        this.dataSource = dataSource;
        this.context = context;
        this.seedEnabled = seedEnabled;
    }

    @Override
    public void run(ApplicationArguments arguments) throws Exception {
        if (seedEnabled) {
            throw new IllegalStateException("Legacy catalog.seed.enabled is retired; use the verified official bank import operation");
        }
        // Flyway owns PostgreSQL migration. Official Neo4j is already seeded and is never mutated here.
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("SELECT 1");
        }
        context.close();
    }

}
