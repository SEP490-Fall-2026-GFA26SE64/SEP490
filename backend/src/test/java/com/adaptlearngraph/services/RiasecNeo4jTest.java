package com.adaptlearngraph.services;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.neo4j.driver.*;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.transaction.Neo4jTransactionManager;
import org.testcontainers.containers.Neo4jContainer;
import static org.assertj.core.api.Assertions.*;

/** Separate graph volume: interest edits must not alter learning requirements or their fingerprints. */
class RiasecNeo4jTest {
    @Test void strictTenantProfilesDoNotChangeRoleCatalogFingerprint() {
        try(var neo=new Neo4jContainer<>("neo4j:5.26-community").withAdminPassword("riasec-test-only")
                .withEnv("NEO4J_server_memory_heap_initial__size","256m").withEnv("NEO4J_server_memory_heap_max__size","256m").withEnv("NEO4J_server_memory_pagecache_size","128m")) {
            neo.start();
            try(var driver=GraphDatabase.driver(neo.getBoltUrl(),AuthTokens.basic("neo4j","riasec-test-only"))) {
                var client=Neo4jClient.create(driver);var graph=new Neo4jCypher(client,new Neo4jTransactionManager(driver));
                UUID org=UUID.randomUUID();String job="RIASEC-J";
                graph.write(tx->{tx.execute("""
                    CREATE (j:JobPosition {id:'RIASEC-J',organizationId:$org,name:'Demo position',status:'ACTIVE',version:'v1'})
                    CREATE (r:TargetRole {id:'RIASEC-R',organizationId:$org,name:'Role',status:'ACTIVE',version:'v1'})
                    CREATE (l:Level {id:'RIASEC-L',organizationId:$org,name:'Level',status:'ACTIVE',version:'v1'})
                    CREATE (s:MicroSkill {id:'RIASEC-S',organizationId:$org,name:'Skill',status:'ACTIVE',version:'v1'})
                    CREATE (j)-[:HAS_ROLE {status:'ACTIVE',organizationId:$org}]->(r)-[:HAS_LEVEL {status:'ACTIVE',organizationId:$org}]->(l)
                    CREATE (l)-[:REQUIRES_SKILL {status:'ACTIVE',organizationId:$org}]->(s)
                    """,Map.of("org",org.toString()));return null;});
                var roles=new Neo4jAdaptiveBaselineCatalogAdapter(graph,new ObjectMapper(),org,Set.of(job),true);
                String original=roles.findAvailable(new Scope(org,job)).orElseThrow().fingerprint();
                var interests=new RiasecCatalog(client);assertThat(interests.candidates(org)).isEmpty();
                graph.write(tx->{tx.execute("MATCH (j:JobPosition {id:'RIASEC-J'}) SET j.interestRealistic=20,j.interestInvestigative=35,j.interestArtistic=15,j.interestSocial=10,j.interestEnterprising=22,j.interestConventional=30",Map.of());return null;});
                assertThat(interests.candidates(org)).hasSize(1);assertThat(interests.candidates(UUID.randomUUID())).isEmpty();
                assertThat(roles.findAvailable(new Scope(org,job)).orElseThrow().fingerprint()).isEqualTo(original);
                graph.write(tx->{tx.execute("MATCH (j:JobPosition {id:'RIASEC-J'}) SET j.interestRealistic=1.5",Map.of());return null;});
                assertThat(interests.candidates(org)).isEmpty();
                graph.write(tx->{tx.execute("MATCH (s:MicroSkill {id:'RIASEC-S'}) SET s.version='v2'",Map.of());return null;});
                assertThat(roles.findAvailable(new Scope(org,job)).orElseThrow().fingerprint()).isNotEqualTo(original);
                graph.write(tx->{tx.execute("MATCH (j:JobPosition {id:'RIASEC-J'}) SET j.interestRealistic=20,j.status='INACTIVE'",Map.of());return null;});
                assertThat(interests.candidates(org)).isEmpty();
            }
        }
    }
}
