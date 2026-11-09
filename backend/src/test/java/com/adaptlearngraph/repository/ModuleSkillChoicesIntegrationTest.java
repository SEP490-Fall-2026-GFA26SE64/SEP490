package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.Choice;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.transaction.Neo4jTransactionManager;
import org.testcontainers.containers.Neo4jContainer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class ModuleSkillChoicesIntegrationTest {
    @Test void authoringChoicesMatchTrustedOrganizationAndCurrentEligibilityWithoutChangingBrowseChoices() {
        try (var neo4j = new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size", "128m")
                .withEnv("NEO4J_server_memory_heap_max__size", "256m")
                .withEnv("NEO4J_server_memory_pagecache_size", "64m")
                .withStartupTimeout(java.time.Duration.ofMinutes(5))) {
            neo4j.start();
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(), AuthTokens.basic("neo4j", neo4j.getAdminPassword()))) {
                try (var session = driver.session()) {
                    session.run("""
                        CREATE (:MicroSkill {id:'eligible',name:'Eligible',organizationId:'org',status:'ACTIVE',reviewStatus:'APPROVED'}),
                               (:MicroSkill {id:'pending',name:'Pending',organizationId:'org',status:'ACTIVE',reviewStatus:'NEEDS_EXPERT_REVIEW'}),
                               (:MicroSkill {id:'rejected',name:'Rejected',organizationId:'org',status:'ACTIVE',reviewStatus:'REJECTED'}),
                               (:MicroSkill {id:'inactive',name:'Inactive',organizationId:'org',status:'INACTIVE',reviewStatus:'APPROVED'}),
                               (:MicroSkill {id:'archived',name:'Archived',organizationId:'org',status:'ARCHIVED',reviewStatus:'APPROVED'}),
                               (:MicroSkill {id:'foreign',name:'Foreign',organizationId:'other',status:'ACTIVE',reviewStatus:'APPROVED'}),
                               (:MicroSkill {id:'missing-review',name:'Missing review',organizationId:'org',status:'ACTIVE'})
                        """).consume();
                }
                var graph = new Neo4jModuleCatalogGraph(mock(LearningModuleNodeRepository.class), Neo4jClient.create(driver), new Neo4jTransactionManager(driver));
                assertEquals(List.of(new Choice("eligible", "Eligible")), graph.choices("ModuleSkill", "org"));
                assertEquals(List.of("eligible", "inactive", "missing-review", "pending", "rejected"),
                        graph.choices("MicroSkill", "org").stream().map(Choice::id).sorted().toList());
                assertTrue(graph.choices("ModuleSkill", "empty-org").isEmpty());
                for (String id : List.of("pending", "rejected", "inactive", "archived", "foreign", "missing-review")) {
                    assertEquals(409, assertThrows(Failure.class, () -> graph.requireKnowledge("org", id, "FOUNDATION", List.of("OUT-1"))).status());
                }
                try (var session = driver.session()) {
                    session.run("MATCH (s:MicroSkill {id:'eligible'}) SET s.status='INACTIVE'").consume();
                }
                assertTrue(graph.choices("ModuleSkill", "org").isEmpty());
                assertEquals(409, assertThrows(Failure.class, () -> graph.requireKnowledge("org", "eligible", "FOUNDATION", List.of("OUT-1"))).status());
            }
        }
    }
}
