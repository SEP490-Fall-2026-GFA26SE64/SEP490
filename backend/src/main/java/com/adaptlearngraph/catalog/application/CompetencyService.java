package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.in.ManageCompetencyUseCase;
import com.adaptlearngraph.catalog.application.port.out.CompetencyRepository;
import com.adaptlearngraph.catalog.domain.CompetencyRecord;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class CompetencyService implements ManageCompetencyUseCase {
    private final CompetencyRepository repository;

    public CompetencyService(CompetencyRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository cannot be null");
    }

    @Override
    public List<CompetencyRecord> listCompetencies(String search) {
        return repository.findAllCompetencies(search);
    }

    @Override
    public CompetencyRecord createCompetency(String code, String name, String description, List<String> skillIds, String levelId) {
        String id = UUID.randomUUID().toString();
        String finalCode = (code != null && !code.isBlank())
                ? code.trim().toUpperCase()
                : generateDefaultCode();

        CompetencyRecord newRecord = new CompetencyRecord(
                id,
                finalCode,
                name != null ? name.trim() : "New Competency",
                description != null ? description.trim() : "",
                "ALL_MEMBER_SKILLS_AT_OWNING_LEVEL",
                "ACTIVE",
                "0.11.0",
                levelId,
                "",
                "",
                List.of()
        );
        return repository.save(newRecord, skillIds != null ? skillIds : List.of(), levelId);
    }

    @Override
    public CompetencyRecord updateCompetency(String id, String code, String name, String description, List<String> skillIds) {
        var existingOpt = repository.findById(id);
        CompetencyRecord existing = existingOpt.orElseGet(() -> new CompetencyRecord(
                id,
                code != null && !code.isBlank() ? code.trim().toUpperCase() : generateDefaultCode(),
                name != null ? name.trim() : "",
                description != null ? description.trim() : "",
                "ALL_MEMBER_SKILLS_AT_OWNING_LEVEL",
                "ACTIVE",
                "0.11.0",
                null,
                "",
                "",
                List.of()
        ));

        String finalCode = (code != null && !code.isBlank())
                ? code.trim().toUpperCase()
                : (existing.code() != null && !existing.code().isBlank() ? existing.code() : generateDefaultCode());

        CompetencyRecord updated = new CompetencyRecord(
                existing.id(),
                finalCode,
                name != null && !name.isBlank() ? name.trim() : existing.name(),
                description != null ? description.trim() : existing.description(),
                existing.attainmentRule(),
                existing.status(),
                existing.version(),
                existing.levelId(),
                existing.levelName(),
                existing.roleName(),
                existing.memberSkills()
        );
        return repository.save(updated, skillIds != null ? skillIds : List.of(), existing.levelId());
    }

    @Override
    public void deleteCompetency(String id) {
        repository.deleteById(id);
    }

    private String generateDefaultCode() {
        return "COMP-GEN-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }
}
