package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AuditEventJpaRepository;
import com.adaptlearngraph.repository.JpaTargetSelectionEventAdapter;
import com.adaptlearngraph.repository.JpaTargetSelectionPersistence;
import com.adaptlearngraph.repository.JpaTargetSelectionRowMapper;
import com.adaptlearngraph.repository.OutboxEventJpaRepository;
import com.adaptlearngraph.repository.SelectionLearnerJpaRepository;
import com.adaptlearngraph.repository.TargetSelectionJpaRepository;
import com.adaptlearngraph.repository.TargetSelectionRequestJpaRepository;
import com.adaptlearngraph.repository.TransactionTemplateSelectionTransactionAdapter;
import com.adaptlearngraph.repository.SelectionTransactionPort;
import com.adaptlearngraph.repository.TargetSelectionEventPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile({"local", "prod"})
@Import(PersistenceConfiguration.class)
public class TargetSelectionPersistenceConfiguration {
    @Bean
    JpaTargetSelectionRowMapper jpaTargetSelectionRowMapper(ObjectMapper objectMapper) {
        return new JpaTargetSelectionRowMapper(objectMapper);
    }

    @Bean
    JpaTargetSelectionPersistence jpaTargetSelectionPersistence(
            SelectionLearnerJpaRepository learners,
            TargetSelectionJpaRepository selections,
            TargetSelectionRequestJpaRepository requests,
            JpaTargetSelectionRowMapper rowMapper,
            ObjectMapper objectMapper) {
        return new JpaTargetSelectionPersistence(learners, selections, requests, rowMapper, objectMapper);
    }

    @Bean
    TargetSelectionEventPort targetSelectionEventPort(
            AuditEventJpaRepository audit,
            OutboxEventJpaRepository outbox,
            ObjectMapper objectMapper) {
        return new JpaTargetSelectionEventAdapter(audit, outbox, objectMapper);
    }

    @Bean
    SelectionTransactionPort selectionTransactionPort(PlatformTransactionManager transactionManager) {
        return new TransactionTemplateSelectionTransactionAdapter(transactionManager);
    }
}
