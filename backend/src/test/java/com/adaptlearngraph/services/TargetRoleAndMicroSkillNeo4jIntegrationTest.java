package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.repository.GraphSchemaMigrator;
import com.adaptlearngraph.repository.Neo4jTargetRoleRepository;
import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.repository.Neo4jMicroSkillRepository;
import com.adaptlearngraph.repository.MicroSkillNodeRepository;
import com.adaptlearngraph.repository.TargetRoleNodeRepository;
import com.adaptlearngraph.support.Neo4jTestContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.testcontainers.containers.Neo4jContainer;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("REQ-023-F01, REQ-023-F02, REQ-012-F01: Neo4j Integration Tests with Testcontainers")
class TargetRoleAndMicroSkillNeo4jIntegrationTest {

    @Test
    @DisplayName("Persists TargetRoles and MicroSkills with strict organization isolation and graph relationships")
    void testNeo4jPersistenceAndIsolation() throws Exception {
        try (var neo4j = new Neo4jContainer<>("neo4j:5.26-community")) {
            neo4j.start();
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(), AuthTokens.basic("neo4j", neo4j.getAdminPassword()));
                 var graph = Neo4jTestContext.start(driver)) {
                var migrator = new GraphSchemaMigrator(driver);
                migrator.migrate();

                var roleRepo = new Neo4jTargetRoleRepository(graph.bean(TargetRoleNodeRepository.class), graph.client(),
                        graph.mappingContext(), graph.transactionManager());
                var skillRepo = new Neo4jMicroSkillRepository(graph.bean(MicroSkillNodeRepository.class), graph.client(),
                        graph.mappingContext(), graph.transactionManager());

                // REQ-023-F01: Create Target Role in org-alpha
                TargetRole roleAlpha = TargetRole.createNew(
                        "org-alpha",
                        "ROLE_DATA_ENG",
                        "Data Engineer",
                        "DATA",
                        RoleTrack.PROFESSIONAL,
                        "Data pipeline engineering");
                roleRepo.save(roleAlpha);

                // Create Target Role in org-beta
                TargetRole roleBeta = TargetRole.createNew(
                        "org-beta",
                        "ROLE_DATA_ENG_BETA",
                        "Data Engineer Beta",
                        "DATA",
                        RoleTrack.MANAGEMENT,
                        "Beta pipeline engineering");
                roleRepo.save(roleBeta);

                // REQ-023-F02: Organization isolation checks
                List<TargetRole> alphaRoles = roleRepo.findByOrganizationId("org-alpha", TargetRoleFilter.empty());
                assertEquals(1, alphaRoles.size());
                assertEquals("ROLE_DATA_ENG", alphaRoles.getFirst().getCode());
                assertEquals(RoleStatus.DRAFT, alphaRoles.getFirst().getStatus());
                assertEquals(RoleTrack.PROFESSIONAL, alphaRoles.getFirst().getTrack());

                List<TargetRole> betaRoles = roleRepo.findByOrganizationId("org-beta", TargetRoleFilter.empty());
                assertEquals(1, betaRoles.size());
                assertEquals("ROLE_DATA_ENG_BETA", betaRoles.getFirst().getCode());

                assertTrue(roleRepo.existsByOrganizationIdAndCode("org-alpha", "ROLE_DATA_ENG"));
                assertFalse(roleRepo.existsByOrganizationIdAndCode("org-alpha", "NON_EXISTING"));
                assertFalse(roleRepo.existsByOrganizationIdAndCode("org-alpha", "ROLE_DATA_ENG_BETA"));

                // REQ-023-F03: Update Target Role details in Neo4j
                TargetRole updatedAlpha = roleAlpha.updateDetails(
                        "Principal Data Engineer",
                        "PYTHON_DATA",
                        RoleTrack.MANAGEMENT,
                        "expert-99",
                        "Principal level data engineering");
                roleRepo.save(updatedAlpha);

                var loadedAlphaOpt = roleRepo.findById("org-alpha", roleAlpha.getId());
                assertTrue(loadedAlphaOpt.isPresent());
                assertEquals("Principal Data Engineer", loadedAlphaOpt.get().getName());
                assertEquals(RoleTrack.MANAGEMENT, loadedAlphaOpt.get().getTrack());
                assertEquals("expert-99", loadedAlphaOpt.get().getAssignedExpertId());

                // REQ-011-F01 & REQ-023-F05: Filter by assignedExpertId in Neo4j
                List<TargetRole> expertRoles = roleRepo.findByOrganizationId("org-alpha",
                        new TargetRoleFilter(null, null, null, "expert-99"));
                assertEquals(1, expertRoles.size());
                assertEquals("ROLE_DATA_ENG", expertRoles.getFirst().getCode());

                List<TargetRole> unassignedExpertRoles = roleRepo.findByOrganizationId("org-alpha",
                        new TargetRoleFilter(null, null, null, "expert-none"));
                assertEquals(0, unassignedExpertRoles.size());

                // REQ-023-F04: Delete Target Role with DETACH DELETE in Neo4j
                roleRepo.deleteById("org-alpha", roleAlpha.getId());
                assertFalse(roleRepo.existsByOrganizationIdAndCode("org-alpha", "ROLE_DATA_ENG"));
                assertTrue(roleRepo.findById("org-alpha", roleAlpha.getId()).isEmpty());

                // REQ-012-F01: Create Micro-Skill
                MicroSkill skill = MicroSkill.createNew(
                        "org-alpha",
                        "APACHE_SPARK",
                        "Apache Spark",
                        "Distributed processing framework");
                skillRepo.save(skill);

                assertTrue(skillRepo.existsByOrganizationIdAndCode("org-alpha", "APACHE_SPARK"));
                assertFalse(skillRepo.existsByOrganizationIdAndCode("org-beta", "APACHE_SPARK"));

                // Verify REQUIRES_SKILL graph relationship synchronization stays inside the role's organization
                // The legacy test graph enforces globally unique skill codes, so Beta owns distinct codes.
                skillRepo.save(MicroSkill.createNew(
                        "org-beta",
                        "SPARK_STREAMING",
                        "Spark Streaming",
                        "Distributed processing framework"));
                TargetRole roleWithSkills = TargetRole.createNew(
                        "org-beta",
                        "ROLE_ML_ENG",
                        "Machine Learning Engineer",
                        "AI_ML",
                        RoleTrack.PROFESSIONAL,
                        "expert-chen",
                        "ML and Deep learning role",
                        "1.0",
                        RoleStatus.ACTIVE,
                        "[{\"skillCode\":\"SPARK_STREAMING\",\"skillName\":\"Spark Streaming\",\"threshold\":85},"
                                + "{\"skillCode\":\"APACHE_SPARK\",\"skillName\":\"Alpha-owned Apache Spark\",\"threshold\":70}]");
                roleRepo.save(roleWithSkills);

                try (var session = driver.session()) {
                    var reqCount = session.run("""
                            MATCH (r:TargetRole {id: $id})-[req:REQUIRES_SKILL]->(s:MicroSkill)
                            RETURN count(req) AS count, req.targetMastery AS mastery, collect(s.organizationId) AS owners
                            """, Map.of("id", roleWithSkills.getId().toString())).single();
                    assertEquals(1, reqCount.get("count").asInt());
                    assertEquals(0.85, reqCount.get("mastery").asDouble(), 0.001);
                    assertEquals(List.of("org-beta"), reqCount.get("owners").asList(org.neo4j.driver.Value::asString));
                }

                // Verify reading back TargetRole reconstructs skillTargets from Neo4j graph relationships
                var loadedBetaRole = roleRepo.findById("org-beta", roleWithSkills.getId());
                assertTrue(loadedBetaRole.isPresent());
                assertTrue(loadedBetaRole.get().getSkillTargets().contains("SPARK_STREAMING"));
                assertTrue(loadedBetaRole.get().getSkillTargets().contains("85"));

                // Verify Successor Draft (v1.1) persists alongside v1.0 without Neo4j constraint collision
                TargetRole successorDraft = TargetRole.createNew(
                        "org-beta",
                        "ROLE_ML_ENG",
                        "Machine Learning Engineer",
                        "AI_ML",
                        RoleTrack.PROFESSIONAL,
                        "expert-chen",
                        "Successor draft for ML Engineer",
                        "1.1",
                        RoleStatus.DRAFT,
                        "[]");
                roleRepo.save(successorDraft);

                assertTrue(roleRepo.existsByOrganizationIdAndCodeAndVersion("org-beta", "ROLE_ML_ENG", "1.0"));
                assertTrue(roleRepo.existsByOrganizationIdAndCodeAndVersion("org-beta", "ROLE_ML_ENG", "1.1"));
                assertEquals(3, roleRepo.findByOrganizationId("org-beta", TargetRoleFilter.empty()).size());
            }
        }
    }
}
