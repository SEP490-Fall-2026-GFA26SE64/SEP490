package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.application.port.out.ModuleAuthoringPort;
import com.adaptlearngraph.catalog.application.port.out.LearningContentPort;
import com.adaptlearngraph.catalog.application.port.out.LearningAssetPort;
import com.adaptlearngraph.catalog.application.LearningContentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
@Profile("local")
public class ModuleAuthoringConfiguration {
    @Bean ModuleAuthoringPort moduleAuthoringPort(JdbcTemplate jdbc, PlatformTransactionManager manager,
            ObjectMapper mapper, Driver driver, @Value("${module-authoring.organization-id:comp-technova}") String organization) {
        return new JdbcModuleAuthoringAdapter(jdbc, new TransactionTemplate(manager), mapper, driver, organization);
    }
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="learning.mail.enabled",havingValue="true")
    LearningMailWorker learningMailWorker(JdbcTemplate jdbc, PlatformTransactionManager manager,
            com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender mail,
            @Value("${subscription.public-url:http://localhost:8088}") String publicUrl) {
        return new LearningMailWorker(jdbc, new TransactionTemplate(manager), mail, publicUrl);
    }
    @Bean LearningAssetPort learningAssetPort(LearningContentPort content, JdbcTemplate jdbc,
            @Value("${learning.assets.endpoint:http://localhost:28190}") String endpoint,
            @Value("${learning.assets.access-key:unconfigured}") String access,
            @Value("${learning.assets.secret-key:unconfigured}") String secret,
            @Value("${learning.assets.bucket:learning-content}") String bucket) {
        return new PrivateLearningAssets(endpoint, access, secret, bucket, content, jdbc);
    }
    @Bean com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase learningImport(
            ModuleAuthoringPort modules, LearningContentPort content, LearningAssetPort files,
            ModuleAuthoringService service, JdbcTemplate jdbc, ObjectMapper mapper) {
        return new ExcelLearningImport(modules, content, files, service, jdbc, mapper);
    }
    @Bean LearningContentPort learningContentPort(JdbcTemplate jdbc, ObjectMapper mapper) { return new JdbcLearningContentAdapter(jdbc, mapper); }
    @Bean ModuleAuthoringService moduleAuthoringService(ModuleAuthoringPort port, LearningContentPort content) { return new ModuleAuthoringService(port, content); }
    @Bean LearningContentService learningContentService(ModuleAuthoringPort port, LearningContentPort content, ModuleAuthoringService modules) { return new LearningContentService(port, content, modules); }
}
