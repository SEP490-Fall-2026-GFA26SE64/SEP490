package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.CompetencyRecord;
import com.adaptlearngraph.exception.DuplicateCompetencyException;
import com.adaptlearngraph.repository.CompetencyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("REQ-002: Competency Service Tests")
class CompetencyServiceTest {

    private InMemoryCompetencyRepository repository;
    private CompetencyService service;

    @BeforeEach
    void setUp() {
        repository = new InMemoryCompetencyRepository();
        service = new CompetencyService(repository);
    }

    @Test
    @DisplayName("Creates competency successfully when code is unique")
    void createsCompetencySuccessfully() {
        CompetencyRecord created = service.createCompetency(
                "org-1",
                "COMP-AI-01",
                "Machine Learning",
                "ML fundamentals",
                List.of(),
                null
        );

        assertNotNull(created.id());
        assertEquals("COMP-AI-01", created.code());
        assertEquals("Machine Learning", created.name());
        assertEquals(1, repository.competencies.size());
    }

    @Test
    @DisplayName("Rejects duplicate competency code in the same organization")
    void rejectsDuplicateCompetencyCode() {
        service.createCompetency(
                "org-1",
                "COMP-AI-01",
                "Machine Learning",
                "ML fundamentals",
                List.of(),
                null
        );

        DuplicateCompetencyException ex = assertThrows(
                DuplicateCompetencyException.class,
                () -> service.createCompetency(
                        "org-1",
                        "comp-ai-01",
                        "ML Advanced",
                        "Another ML competency",
                        List.of(),
                        null
                )
        );

        assertEquals("org-1", ex.getOrganizationId());
        assertEquals("COMP-AI-01", ex.getCode());
        assertEquals(1, repository.competencies.size());
    }

    @Test
    @DisplayName("Rejects updating competency to a code that already belongs to another competency")
    void rejectsUpdatingToDuplicateCode() {
        CompetencyRecord comp1 = service.createCompetency("org-1", "COMP-01", "Comp 1", "", List.of(), null);
        CompetencyRecord comp2 = service.createCompetency("org-1", "COMP-02", "Comp 2", "", List.of(), null);

        assertThrows(
                DuplicateCompetencyException.class,
                () -> service.updateCompetency("org-1", comp2.id(), "COMP-01", "Comp 2 Updated", "", List.of())
        );
    }

    @Test
    @DisplayName("Allows updating competency while preserving its own code")
    void allowsUpdatingCompetencyPreservingOwnCode() {
        CompetencyRecord comp1 = service.createCompetency("org-1", "COMP-01", "Comp 1", "Desc 1", List.of(), null);

        CompetencyRecord updated = service.updateCompetency(
                "org-1", comp1.id(), "COMP-01", "Comp 1 Renamed", "Updated Desc", List.of()
        );

        assertEquals("COMP-01", updated.code());
        assertEquals("Comp 1 Renamed", updated.name());
        assertEquals("Updated Desc", updated.description());
    }

    @Test
    @DisplayName("Creates competency with department and job position metadata")
    void createsCompetencyWithDepartmentAndJobPosition() {
        CompetencyRecord created = service.createCompetency(
                "org-1",
                "COMP-QA-01",
                "Automated Testing",
                "QA testing competency",
                List.of(),
                null,
                "dept-qa-01",
                "Quality Engineering & Assurance",
                "15-1253.00",
                "Software Quality Assurance Analysts and Testers"
        );

        assertNotNull(created.id());
        assertEquals("dept-qa-01", created.departmentId());
        assertEquals("Quality Engineering & Assurance", created.departmentName());
        assertEquals("15-1253.00", created.jobPositionCode());
        assertEquals("Software Quality Assurance Analysts and Testers", created.jobPositionTitle());
    }

    @Test
    @DisplayName("Allows updating competency when expert department and job position match")
    void allowsUpdatingCompetencyWhenDepartmentAndJobPositionMatch() {
        CompetencyRecord comp = service.createCompetency(
                "org-1",
                "COMP-QA-01",
                "Automated Testing",
                "QA testing competency",
                List.of(),
                null,
                "dept-qa-01",
                "Quality Engineering & Assurance",
                "15-1253.00",
                "Software Quality Assurance Analysts and Testers"
        );

        CompetencyRecord updated = service.updateCompetency(
                "org-1",
                comp.id(),
                "COMP-QA-01",
                "Automated Testing Refined",
                "Updated desc",
                List.of(),
                "dept-qa-01",
                "Quality Engineering & Assurance",
                "15-1253.00",
                "Software Quality Assurance Analysts and Testers"
        );

        assertEquals("Automated Testing Refined", updated.name());
        assertEquals("dept-qa-01", updated.departmentId());
        assertEquals("15-1253.00", updated.jobPositionCode());
    }

    @Test
    @DisplayName("Rejects updating competency when expert department does not match")
    void rejectsUpdatingCompetencyWhenDepartmentMismatches() {
        CompetencyRecord comp = service.createCompetency(
                "org-1",
                "COMP-QA-01",
                "Automated Testing",
                "QA testing competency",
                List.of(),
                null,
                "dept-qa-01",
                "Quality Engineering & Assurance",
                "15-1253.00",
                "Software Quality Assurance Analysts and Testers"
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateCompetency(
                        "org-1",
                        comp.id(),
                        "COMP-QA-01",
                        "Hacked Name",
                        "Desc",
                        List.of(),
                        "dept-dev-01", // Mismatched department!
                        "Engineering & Cognitive Systems",
                        "15-1253.00",
                        "Software Quality Assurance Analysts and Testers"
                )
        );

        assertEquals("Domain experts can only edit competencies assigned to their own department.", ex.getMessage());
    }

    @Test
    @DisplayName("Rejects updating competency when expert job position does not match")
    void rejectsUpdatingCompetencyWhenJobPositionMismatches() {
        CompetencyRecord comp = service.createCompetency(
                "org-1",
                "COMP-QA-01",
                "Automated Testing",
                "QA testing competency",
                List.of(),
                null,
                "dept-qa-01",
                "Quality Engineering & Assurance",
                "15-1253.00",
                "Software Quality Assurance Analysts and Testers"
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateCompetency(
                        "org-1",
                        comp.id(),
                        "COMP-QA-01",
                        "Hacked Name",
                        "Desc",
                        List.of(),
                        "dept-qa-01",
                        "Quality Engineering & Assurance",
                        "15-1252.00", // Mismatched job position!
                        "Software Developers"
                )
        );

        assertEquals("Domain experts can only edit competencies assigned to their own job position.", ex.getMessage());
    }

    private static class InMemoryCompetencyRepository implements CompetencyRepository {
        final List<CompetencyRecord> competencies = new ArrayList<>();

        @Override
        public List<CompetencyRecord> findAllCompetencies(String organizationId, String search) {
            return new ArrayList<>(competencies);
        }

        @Override
        public Optional<CompetencyRecord> findById(String organizationId, String id) {
            return competencies.stream().filter(c -> c.id().equals(id)).findFirst();
        }

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return competencies.stream()
                    .anyMatch(c -> c.code() != null && c.code().equalsIgnoreCase(code));
        }

        @Override
        public boolean existsByOrganizationIdAndCodeAndIdNot(String organizationId, String code, String id) {
            return competencies.stream()
                    .anyMatch(c -> !c.id().equals(id) && c.code() != null && c.code().equalsIgnoreCase(code));
        }

        @Override
        public CompetencyRecord save(String organizationId, CompetencyRecord record, List<String> skillIds, String levelId) {
            competencies.removeIf(c -> c.id().equals(record.id()));
            competencies.add(record);
            return record;
        }

        @Override
        public void deleteById(String organizationId, String id) {
            competencies.removeIf(c -> c.id().equals(id));
        }
    }
}

