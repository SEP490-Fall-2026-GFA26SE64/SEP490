package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.SelectionTransactionPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile({"local", "prod"})
public class TargetSelectionPersistenceConfiguration {
    @Bean
    JdbcTargetSelectionRowMapper jdbcTargetSelectionRowMapper(ObjectMapper objectMapper) {
        return new JdbcTargetSelectionRowMapper(objectMapper);
    }

    @Bean
    JdbcTargetSelectionPersistence jdbcTargetSelectionPersistence(
            NamedParameterJdbcTemplate jdbc,
            JdbcTargetSelectionRowMapper rowMapper,
            ObjectMapper objectMapper) {
        return new JdbcTargetSelectionPersistence(jdbc, rowMapper, objectMapper);
    }

    @Bean
    TargetSelectionEventPort targetSelectionEventPort(
            NamedParameterJdbcTemplate jdbc,
            ObjectMapper objectMapper) {
        return new JdbcTargetSelectionEventAdapter(jdbc, objectMapper);
    }

    @Bean
    SelectionTransactionPort selectionTransactionPort(PlatformTransactionManager transactionManager) {
        return new TransactionTemplateSelectionTransactionAdapter(transactionManager);
    }
}
