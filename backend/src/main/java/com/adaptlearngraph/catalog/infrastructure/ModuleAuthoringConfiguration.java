package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.application.port.out.ModuleAuthoringPort;
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
    @Bean ModuleAuthoringService moduleAuthoringService(ModuleAuthoringPort port) { return new ModuleAuthoringService(port); }
}
