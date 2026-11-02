package com.adaptlearngraph.support;

import com.adaptlearngraph.constants.TransactionManagers;
import java.util.Set;
import java.util.stream.Collectors;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.Neo4jTemplate;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.transaction.Neo4jTransactionManager;
import org.springframework.data.neo4j.repository.config.EnableNeo4jRepositories;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Minimal Spring Data Neo4j context for graph integration tests: the production {@code @Node} classes and SDN
 * repositories, a {@link Neo4jClient}, {@link Neo4jTemplate} and the {@code neo4jTransactionManager}, all bound to one
 * driver (typically a Testcontainers Neo4j).
 */
public final class Neo4jTestContext implements AutoCloseable {
    public static final String ENTITY_PACKAGE = "com.adaptlearngraph.entities";
    private final AnnotationConfigApplicationContext context;
    private final Driver ownedDriver;

    private Neo4jTestContext(AnnotationConfigApplicationContext context, Driver ownedDriver) {
        this.context = context;
        this.ownedDriver = ownedDriver;
    }

    /** Uses a caller-owned driver; closing the context leaves the driver open. */
    public static Neo4jTestContext start(Driver driver) {
        return new Neo4jTestContext(refresh(driver), null);
    }

    /** Opens (and on {@link #close()} closes) a driver for the given bolt endpoint. */
    public static Neo4jTestContext start(String boltUrl, String user, String password) {
        Driver driver = GraphDatabase.driver(boltUrl, AuthTokens.basic(user, password));
        try {
            return new Neo4jTestContext(refresh(driver), driver);
        } catch (RuntimeException failure) {
            driver.close();
            throw failure;
        }
    }

    private static AnnotationConfigApplicationContext refresh(Driver driver) {
        var context = new AnnotationConfigApplicationContext();
        context.registerBean("driver", Driver.class, () -> driver);
        context.register(Config.class);
        context.refresh();
        return context;
    }

    public <T> T bean(Class<T> type) {
        return context.getBean(type);
    }

    public Driver driver() {
        return context.getBean(Driver.class);
    }

    public Neo4jClient client() {
        return context.getBean(Neo4jClient.class);
    }

    public Neo4jMappingContext mappingContext() {
        return context.getBean(Neo4jMappingContext.class);
    }

    public PlatformTransactionManager transactionManager() {
        return context.getBean(TransactionManagers.NEO4J, PlatformTransactionManager.class);
    }

    @Override
    public void close() {
        context.close();
        if (ownedDriver != null) ownedDriver.close();
    }

    /** Every {@code @Node} class in the entity package, so the mapping context starts with the full catalog model. */
    public static Set<Class<?>> declaredNodes() {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Node.class));
        return scanner.findCandidateComponents(ENTITY_PACKAGE).stream().map(definition -> {
            try {
                return (Class<?>) Class.forName(definition.getBeanClassName());
            } catch (ClassNotFoundException missing) {
                throw new IllegalStateException(missing);
            }
        }).collect(Collectors.toSet());
    }

    /** Registered explicitly (lite mode) so full-application tests' component scanning never picks it up. */
    @EnableTransactionManagement
    @EnableNeo4jRepositories(basePackages = "com.adaptlearngraph.repository", transactionManagerRef = TransactionManagers.NEO4J)
    static class Config {
        @Bean
        Neo4jClient neo4jClient(Driver driver) {
            return Neo4jClient.create(driver);
        }

        @Bean
        Neo4jMappingContext neo4jMappingContext() {
            var mappingContext = new Neo4jMappingContext();
            mappingContext.setInitialEntitySet(declaredNodes());
            return mappingContext;
        }

        @Bean
        Neo4jTemplate neo4jTemplate(Neo4jClient neo4jClient, Neo4jMappingContext neo4jMappingContext,
                Neo4jTransactionManager neo4jTransactionManager) {
            return new Neo4jTemplate(neo4jClient, neo4jMappingContext, neo4jTransactionManager);
        }

        @Bean(TransactionManagers.NEO4J)
        Neo4jTransactionManager neo4jTransactionManager(Driver driver) {
            return Neo4jTransactionManager.with(driver).build();
        }
    }
}
