package com.adaptlearngraph.support;

import com.adaptlearngraph.constants.TransactionManagers;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManagerFactory;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Minimal Spring JPA context for persistence integration tests: the production entities and repositories with the
 * same Hibernate naming strategies and {@code ddl-auto=validate} as Spring Boot, against a Testcontainers database.
 */
public final class JpaTestContext implements AutoCloseable {
    public static final String ENTITY_PACKAGE = "com.adaptlearngraph.entities";
    private final AnnotationConfigApplicationContext context;

    private JpaTestContext(AnnotationConfigApplicationContext context) {
        this.context = context;
    }

    public static JpaTestContext start(String url, String user, String password) {
        return start(new DriverManagerDataSource(url, user, password));
    }

    public static JpaTestContext start(DataSource dataSource) {
        var context = new AnnotationConfigApplicationContext();
        context.registerBean("dataSource", DataSource.class, () -> dataSource);
        context.register(Config.class);
        context.refresh();
        return new JpaTestContext(context);
    }

    public <T> T bean(Class<T> type) {
        return context.getBean(type);
    }

    public DataSource dataSource() {
        return context.getBean(DataSource.class);
    }

    public PlatformTransactionManager transactionManager() {
        return context.getBean(TransactionManagers.JPA, PlatformTransactionManager.class);
    }

    public EntityManagerFactory entityManagerFactory() {
        return context.getBean(EntityManagerFactory.class);
    }

    @Override
    public void close() {
        context.close();
    }

    /** Hibernate settings shared with application.yml (validate) and Spring Boot's default naming strategies. */
    public static Map<String, Object> hibernateProperties() {
        return Map.of(
                "hibernate.hbm2ddl.auto", "validate",
                "hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy",
                "hibernate.implicit_naming_strategy", "org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy");
    }

    public static LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        var factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan(ENTITY_PACKAGE);
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(hibernateProperties());
        return factory;
    }

    /** Every {@code @Entity} on the classpath, so tests can prove the scan did not silently miss a mapping. */
    public static Set<String> declaredEntities() {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        return scanner.findCandidateComponents(ENTITY_PACKAGE).stream().map(definition -> definition.getBeanClassName())
                .collect(Collectors.toSet());
    }

    /** Registered explicitly (lite mode) so full-application tests' component scanning never picks it up. */
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.adaptlearngraph.repository", transactionManagerRef = TransactionManagers.JPA)
    static class Config {
        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            return JpaTestContext.entityManagerFactory(dataSource);
        }

        @Bean(TransactionManagers.JPA)
        JpaTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }
    }
}
