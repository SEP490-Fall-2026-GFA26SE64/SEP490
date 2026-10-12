package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.application.PrerequisiteService;
import com.adaptlearngraph.competency.application.port.in.CreatePrerequisiteCommand;
import com.adaptlearngraph.competency.application.port.out.PrerequisiteRepository;
import com.adaptlearngraph.competency.application.port.out.TargetRoleGraphPort;
import com.adaptlearngraph.competency.domain.PrerequisiteCycleException;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.RoleGraphSkill;
import com.adaptlearngraph.competency.domain.SkillStatus;
import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("REQ-018: Prerequisite and Target-Role Graph Service Tests")
class PrerequisiteServiceTest {

    private InMemoryPrerequisiteRepository prerequisiteRepository;
    private InMemoryTargetRoleGraphPort targetRoleGraphPort;
    private PrerequisiteService service;

    @BeforeEach
    void setUp() {
        prerequisiteRepository = new InMemoryPrerequisiteRepository();
        targetRoleGraphPort = new InMemoryTargetRoleGraphPort();
        service = new PrerequisiteService(prerequisiteRepository, targetRoleGraphPort);
    }

    @Test
    @DisplayName("REQ-018-F02: Creates prerequisite relationship successfully")
    void createsPrerequisiteSuccessfully() {
        CreatePrerequisiteCommand cmd = new CreatePrerequisiteCommand(
                "org-1", "skill-java", "skill-spring", 0.60, SkillStatus.ACTIVE);

        PrerequisiteEdge edge = service.createPrerequisite(cmd);
        assertNotNull(edge);
        assertEquals("skill-java", edge.sourceSkillId());
        assertEquals("skill-spring", edge.targetSkillId());
        assertEquals(0.60, edge.minMastery());
        assertEquals(1, prerequisiteRepository.edges.size());
    }

    @Test
    @DisplayName("REQ-018-F02: Rejects self-referencing prerequisite with 400 IllegalArgumentException")
    void rejectsSelfReferencingPrerequisite() {
        CreatePrerequisiteCommand cmd = new CreatePrerequisiteCommand(
                "org-1", "skill-java", "skill-java", 0.60, SkillStatus.ACTIVE);

        assertThrows(IllegalArgumentException.class, () -> service.createPrerequisite(cmd));
    }

    @Test
    @DisplayName("REQ-018-F02: Rejects minMastery outside [0.0, 1.0] range")
    void rejectsInvalidMinMasteryRange() {
        CreatePrerequisiteCommand invalidLow = new CreatePrerequisiteCommand(
                "org-1", "skill-java", "skill-spring", -0.1, SkillStatus.ACTIVE);
        assertThrows(IllegalArgumentException.class, () -> service.createPrerequisite(invalidLow));

        CreatePrerequisiteCommand invalidHigh = new CreatePrerequisiteCommand(
                "org-1", "skill-java", "skill-spring", 1.5, SkillStatus.ACTIVE);
        assertThrows(IllegalArgumentException.class, () -> service.createPrerequisite(invalidHigh));
    }

    @Test
    @DisplayName("REQ-018-F02: Anti-cycle guard prevents cyclic dependency A -> B -> C -> A")
    void preventsCyclicDependencies() {
        // Create A -> B
        service.createPrerequisite(new CreatePrerequisiteCommand("org-1", "skill-A", "skill-B", 0.5, SkillStatus.ACTIVE));
        // Create B -> C
        service.createPrerequisite(new CreatePrerequisiteCommand("org-1", "skill-B", "skill-C", 0.5, SkillStatus.ACTIVE));

        // Attempt C -> A should be rejected with PrerequisiteCycleException
        CreatePrerequisiteCommand cyclic = new CreatePrerequisiteCommand("org-1", "skill-C", "skill-A", 0.5, SkillStatus.ACTIVE);
        assertThrows(PrerequisiteCycleException.class, () -> service.createPrerequisite(cyclic));
    }

    @Test
    @DisplayName("REQ-018-F02: Deletes prerequisite relationship successfully")
    void deletesPrerequisiteSuccessfully() {
        service.createPrerequisite(new CreatePrerequisiteCommand("org-1", "skill-A", "skill-B", 0.5, SkillStatus.ACTIVE));
        assertEquals(1, prerequisiteRepository.edges.size());

        service.deletePrerequisite("org-1", "skill-A", "skill-B");
        assertEquals(0, prerequisiteRepository.edges.size());
    }

    @Test
    @DisplayName("REQ-018-F01: Retrieves target role graph with required skills and prerequisites")
    void retrievesTargetRoleGraph() {
        TargetRoleGraph mockGraph = new TargetRoleGraph(
                "role-1",
                "JAVA_DEV",
                "Java Developer",
                "PROFESSIONAL",
                "P3",
                "ACTIVE",
                List.of(
                        new RoleGraphSkill("skill-java", "JAVA_CORE", "Java Core", "KNOWLEDGE", 0.8, SkillStatus.ACTIVE),
                        new RoleGraphSkill("skill-spring", "SPRING_BOOT", "Spring Boot", "KNOWLEDGE", 0.7, SkillStatus.ACTIVE)),
                List.of(new PrerequisiteEdge("skill-java", "JAVA_CORE", "Java Core", "skill-spring", "SPRING_BOOT", "Spring Boot", 0.6, SkillStatus.ACTIVE, Instant.now(), Instant.now())));
        targetRoleGraphPort.graph = mockGraph;

        Optional<TargetRoleGraph> result = service.getTargetRoleGraph("org-1", "role-1");
        assertTrue(result.isPresent());
        assertEquals("JAVA_DEV", result.get().roleCode());
        assertEquals(2, result.get().requiredSkills().size());
        assertEquals(1, result.get().prerequisites().size());
    }

    private static class InMemoryPrerequisiteRepository implements PrerequisiteRepository {
        final List<PrerequisiteEdge> edges = new ArrayList<>();

        @Override
        public List<PrerequisiteEdge> findAll(String organizationId) {
            return List.copyOf(edges);
        }

        @Override
        public List<PrerequisiteEdge> findForRole(String organizationId, String roleId) {
            return List.copyOf(edges);
        }

        @Override
        public boolean hasPath(String organizationId, String fromSkillId, String toSkillId) {
            if (fromSkillId.equals(toSkillId)) {
                return true;
            }
            for (PrerequisiteEdge edge : edges) {
                if (edge.sourceSkillId().equals(fromSkillId)) {
                    if (edge.targetSkillId().equals(toSkillId) || hasPath(organizationId, edge.targetSkillId(), toSkillId)) {
                        return true;
                    }
                }
            }
            return false;
        }

        @Override
        public PrerequisiteEdge savePrerequisite(String organizationId, String sourceSkillId, String targetSkillId, double minMastery, SkillStatus status) {
            deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
            Instant now = Instant.now();
            PrerequisiteEdge edge = new PrerequisiteEdge(
                    sourceSkillId, sourceSkillId, sourceSkillId,
                    targetSkillId, targetSkillId, targetSkillId,
                    minMastery, status != null ? status : SkillStatus.ACTIVE,
                    now, now);
            edges.add(edge);
            return edge;
        }

        @Override
        public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
            edges.removeIf(e -> e.sourceSkillId().equals(sourceSkillId) && e.targetSkillId().equals(targetSkillId));
        }
    }

    private static class InMemoryTargetRoleGraphPort implements TargetRoleGraphPort {
        TargetRoleGraph graph;

        @Override
        public Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId) {
            return Optional.ofNullable(graph);
        }
    }
}
