package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.application.DuplicateMicroSkillException;
import com.adaptlearngraph.competency.application.MicroSkillService;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.MicroSkillInUseException;
import com.adaptlearngraph.competency.domain.SkillStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("REQ-012: MicroSkill Application Service Tests")
class MicroSkillServiceTest {

    private InMemoryMicroSkillRepository repository;
    private MicroSkillService service;

    @BeforeEach
    void setUp() {
        repository = new InMemoryMicroSkillRepository();
        service = new MicroSkillService(repository);
    }

    @Test
    @DisplayName("REQ-012-F01: Creates MicroSkill successfully")
    void createsMicroSkillSuccessfully() {
        CreateMicroSkillCommand command = new CreateMicroSkillCommand(
                "org-1",
                "CYPHER_QUERY",
                "Cypher Query Language",
                "Graph querying language",
                "KNOWLEDGE");

        MicroSkill created = service.createMicroSkill(command);

        assertNotNull(created.getId());
        assertEquals("org-1", created.getOrganizationId());
        assertEquals("CYPHER_QUERY", created.getCode());
        assertEquals(SkillStatus.ACTIVE, created.getStatus());
        assertEquals(1, repository.skills.size());
    }

    @Test
    @DisplayName("REQ-012-F01: Rejects duplicate micro-skill code within the same organization with 409 exception")
    void rejectsDuplicateMicroSkillCode() {
        CreateMicroSkillCommand command1 = new CreateMicroSkillCommand(
                "org-1",
                "CYPHER_QUERY",
                "Cypher Query Language",
                "Graph querying language",
                "KNOWLEDGE");
        service.createMicroSkill(command1);

        CreateMicroSkillCommand command2 = new CreateMicroSkillCommand(
                "org-1",
                "cypher_query",
                "Duplicate Cypher",
                "Another desc",
                "KNOWLEDGE");

        assertThrows(DuplicateMicroSkillException.class, () -> service.createMicroSkill(command2));
    }

    @Test
    @DisplayName("REQ-012-F02: Lists micro-skills scoped to organization")
    void listsMicroSkillsSuccessfully() {
        CreateMicroSkillCommand command = new CreateMicroSkillCommand(
                "org-1",
                "JAVA_CORE",
                "Java Core",
                "Core fundamentals",
                "KNOWLEDGE");
        service.createMicroSkill(command);

        List<MicroSkill> result = service.listMicroSkills("org-1");
        assertEquals(1, result.size());
        assertEquals("JAVA_CORE", result.get(0).getCode());
    }

    @Test
    @DisplayName("REQ-012-F03: Updates micro-skill attributes successfully")
    void updatesMicroSkillSuccessfully() {
        CreateMicroSkillCommand createCmd = new CreateMicroSkillCommand(
                "org-1",
                "SPRING_BOOT",
                "Spring Boot",
                "Old description",
                "KNOWLEDGE");
        MicroSkill created = service.createMicroSkill(createCmd);

        UpdateMicroSkillCommand updateCmd = new UpdateMicroSkillCommand(
                "org-1",
                created.getId().toString(),
                "Spring Boot 3",
                "Modern Spring Boot 3 framework",
                "INNOVATION",
                SkillStatus.ACTIVE);

        MicroSkill updated = service.updateMicroSkill(updateCmd);
        assertEquals("Spring Boot 3", updated.getName());
        assertEquals("Modern Spring Boot 3 framework", updated.getDescription());
        assertEquals("INNOVATION", updated.getMacroCompetencyCode());
    }

    @Test
    @DisplayName("REQ-012-F04: Deletes unused micro-skill successfully")
    void deletesUnusedMicroSkillSuccessfully() {
        CreateMicroSkillCommand createCmd = new CreateMicroSkillCommand(
                "org-1",
                "TO_DELETE",
                "To Delete Skill",
                "Description",
                "KNOWLEDGE");
        MicroSkill created = service.createMicroSkill(createCmd);

        service.deleteMicroSkill("org-1", created.getId().toString());
        assertTrue(repository.findById("org-1", created.getId()).isEmpty());
    }

    @Test
    @DisplayName("REQ-012-F04: Rejects deletion when micro-skill has active dependencies with 409 exception")
    void rejectsDeletionWhenReferenced() {
        CreateMicroSkillCommand createCmd = new CreateMicroSkillCommand(
                "org-1",
                "REFERENCED_SKILL",
                "Referenced Skill",
                "Description",
                "KNOWLEDGE");
        MicroSkill created = service.createMicroSkill(createCmd);
        repository.dependencyCounts.put(created.getId().toString(), 3);

        assertThrows(MicroSkillInUseException.class,
                () -> service.deleteMicroSkill("org-1", created.getId().toString()));
    }

    private static class InMemoryMicroSkillRepository implements MicroSkillRepository {
        final List<MicroSkill> skills = new ArrayList<>();
        final java.util.Map<String, Integer> dependencyCounts = new java.util.HashMap<>();

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return skills.stream()
                    .anyMatch(s -> s.getOrganizationId().equals(organizationId) && s.getCode().equalsIgnoreCase(code));
        }

        @Override
        public MicroSkill save(MicroSkill microSkill) {
            skills.removeIf(s -> s.getId().equals(microSkill.getId()));
            skills.add(microSkill);
            return microSkill;
        }

        @Override
        public Optional<MicroSkill> findById(String organizationId, MicroSkillId id) {
            return skills.stream()
                    .filter(s -> s.getOrganizationId().equals(organizationId) && s.getId().equals(id))
                    .findFirst();
        }

        @Override
        public Optional<MicroSkill> findByCode(String organizationId, String code) {
            return skills.stream()
                    .filter(s -> s.getOrganizationId().equals(organizationId) && s.getCode().equalsIgnoreCase(code))
                    .findFirst();
        }

        @Override
        public List<MicroSkill> findAll(String organizationId) {
            return skills.stream()
                    .filter(s -> s.getOrganizationId().equals(organizationId))
                    .toList();
        }

        @Override
        public List<MicroSkill> search(String organizationId, String query, String macroCode, SkillStatus status) {
            return skills.stream()
                    .filter(s -> s.getOrganizationId().equals(organizationId))
                    .filter(s -> query == null || query.isBlank()
                            || s.getName().toLowerCase().contains(query.toLowerCase())
                            || s.getCode().toLowerCase().contains(query.toLowerCase()))
                    .filter(s -> macroCode == null || macroCode.isBlank() || s.getMacroCompetencyCode().equalsIgnoreCase(macroCode))
                    .filter(s -> status == null || s.getStatus() == status)
                    .toList();
        }

        @Override
        public void delete(String organizationId, MicroSkillId id) {
            skills.removeIf(s -> s.getOrganizationId().equals(organizationId) && s.getId().equals(id));
        }

        @Override
        public int countDependencies(String organizationId, MicroSkillId id) {
            return dependencyCounts.getOrDefault(id.toString(), 0);
        }
    }
}
