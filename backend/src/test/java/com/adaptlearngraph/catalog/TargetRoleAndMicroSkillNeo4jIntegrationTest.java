package com.adaptlearngraph.catalog;

import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.infrastructure.GraphSchemaMigrator;
import com.adaptlearngraph.catalog.infrastructure.Neo4jTargetRoleRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.adaptlearngraph.competency.infrastructure.Neo4jMicroSkillRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.testcontainers.containers.Neo4jContainer;

import java.util.List;

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
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(), AuthTokens.basic("neo4j", neo4j.getAdminPassword()))) {
                var migrator = new GraphSchemaMigrator(driver);
                migrator.migrate();

                var roleRepo = new Neo4jTargetRoleRepository(driver);
                var skillRepo = new Neo4jMicroSkillRepository(driver);

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
                        "DATA",
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
                        new TargetRoleFilter(null, null, null, null, "expert-99"));
                assertEquals(1, expertRoles.size());
                assertEquals("ROLE_DATA_ENG", expertRoles.getFirst().getCode());

                List<TargetRole> unassignedExpertRoles = roleRepo.findByOrganizationId("org-alpha",
                        new TargetRoleFilter(null, null, null, null, "expert-none"));
                assertEquals(0, unassignedExpertRoles.size());

                // REQ-023-F04: Delete Target Role with DETACH DELETE in Neo4j
                roleRepo.deleteById("org-alpha", roleAlpha.getId());
                assertFalse(roleRepo.existsByOrganizationIdAndCode("org-alpha", "ROLE_DATA_ENG"));
                assertTrue(roleRepo.findById("org-alpha", roleAlpha.getId()).isEmpty());

                // REQ-012-F01: Create Micro-Skill linked to MacroCompetency
                MicroSkill skill = MicroSkill.createNew(
                        "org-alpha",
                        "APACHE_SPARK",
                        "Apache Spark",
                        "Distributed processing framework",
                        "KNOWLEDGE");
                skillRepo.save(skill);

                assertTrue(skillRepo.existsByOrganizationIdAndCode("org-alpha", "APACHE_SPARK"));
                assertFalse(skillRepo.existsByOrganizationIdAndCode("org-beta", "APACHE_SPARK"));

                // Verify Graph Relationship in Neo4j
                try (var session = driver.session()) {
                    var relCount = session.run("""
                            MATCH (macro:MacroCompetency {code: 'KNOWLEDGE'})-[r:HAS_SKILL]->(skill:MicroSkill {code: 'APACHE_SPARK'})
                            RETURN count(r) AS count
                            """).single().get("count").asInt();
                    assertEquals(1, relCount);
                }
            }
        }
    }
}
