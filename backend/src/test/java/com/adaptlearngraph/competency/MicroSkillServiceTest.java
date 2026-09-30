package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.application.DuplicateMicroSkillException;
import com.adaptlearngraph.competency.application.MicroSkillService;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
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

@DisplayName("REQ-012-F01: MicroSkill Application Service Tests")
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

    private static class InMemoryMicroSkillRepository implements MicroSkillRepository {
        final List<MicroSkill> skills = new ArrayList<>();

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
    }
}
