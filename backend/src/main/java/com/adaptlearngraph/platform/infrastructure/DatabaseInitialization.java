package com.adaptlearngraph.platform.infrastructure;

import com.adaptlearngraph.catalog.infrastructure.GraphSchemaMigrator;
import org.neo4j.driver.Driver;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
@Profile("migrate")
public final class DatabaseInitialization implements ApplicationRunner {
    private final DataSource dataSource;
    private final Driver driver;
    private final ConfigurableApplicationContext context;

    public DatabaseInitialization(DataSource dataSource, Driver driver, ConfigurableApplicationContext context) {
        this.dataSource = dataSource;
        this.driver = driver;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments arguments) throws Exception {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            statement.execute("SET lock_timeout = '120s'");
            statement.execute("SELECT pg_advisory_lock(49020260916)");
            try {
                new GraphSchemaMigrator(driver).migrate();
            } finally {
                statement.execute("SELECT pg_advisory_unlock(49020260916)");
            }
        }
        context.close();
    }
}