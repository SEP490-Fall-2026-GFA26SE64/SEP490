package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.DuplicateCompetencyException;
import com.adaptlearngraph.repository.CompetencyRepository;
import com.adaptlearngraph.entities.domain.CompetencyRecord;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class CompetencyService implements ManageCompetencyUseCase {
    private final CompetencyRepository repository;

    public CompetencyService(CompetencyRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository cannot be null");
    }

    @Override
    public List<CompetencyRecord> listCompetencies(String organizationId, String search) {
        return repository.findAllCompetencies(organizationId, search);
    }

    @Override
    public List<CompetencyRecord> listCompetencies(String organizationId, String search, String departmentId, String jobPositionCode) {
        return repository.findAllCompetencies(organizationId, search, departmentId, jobPositionCode);
    }

    @Override
    public CompetencyRecord createCompetency(String organizationId, String code, String name, String description, List<String> skillIds, String levelId) {
        return createCompetency(organizationId, code, name, description, skillIds, levelId, null, null, null, null);
    }

    public static String sanitizeJobPositionTitle(String title) {
        if (title == null || title.isBlank()) {
            return null;
        }
        String cleaned = title.replaceAll("^[0-9A-Za-z.-]+\\s*-\\s*", "").trim();
        return cleaned.isBlank() ? title.trim() : cleaned;
    }

    public static String extractJobPositionCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        var matcher = java.util.regex.Pattern.compile("^([0-9A-Za-z.-]+)\\s*-\\s*").matcher(raw.trim());
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    @Override
    public CompetencyRecord createCompetency(String organizationId, String code, String name, String description, List<String> skillIds, String levelId,
            String departmentId, String departmentName, String jobPositionCode, String jobPositionTitle) {
        String id = UUID.randomUUID().toString();
        String finalCode = (code != null && !code.isBlank())
                ? code.trim().toUpperCase()
                : generateDefaultCode();

        if (repository.existsByOrganizationIdAndCode(organizationId, finalCode)) {
            throw new DuplicateCompetencyException(organizationId, finalCode);
        }

        String sanitizedJpTitle = sanitizeJobPositionTitle(jobPositionTitle);
        String finalJpCode = (jobPositionCode != null && !jobPositionCode.isBlank())
                ? jobPositionCode.trim()
                : extractJobPositionCode(jobPositionTitle);

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
                departmentId != null ? departmentId.trim() : null,
                departmentName != null ? departmentName.trim() : null,
                finalJpCode,
                sanitizedJpTitle,
                List.of()
        );
        return repository.save(organizationId, newRecord, skillIds != null ? skillIds : List.of(), levelId);
    }

    @Override
    public CompetencyRecord updateCompetency(String organizationId, String id, String code, String name, String description, List<String> skillIds) {
        return updateCompetency(organizationId, id, code, name, description, skillIds, null, null, null, null);
    }

    @Override
    public CompetencyRecord updateCompetency(String organizationId, String id, String code, String name, String description, List<String> skillIds,
            String departmentId, String departmentName, String jobPositionCode, String jobPositionTitle) {
        var existingOpt = repository.findById(organizationId, id);
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
                departmentId,
                departmentName,
                jobPositionCode,
                jobPositionTitle,
                List.of()
        ));

        // Business Rule: An expert can only edit competencies that belong to the same department and job position.
        if (departmentId != null && !departmentId.isBlank()
                && existing.departmentId() != null && !existing.departmentId().isBlank()
                && !departmentId.trim().equalsIgnoreCase(existing.departmentId().trim())) {
            throw new IllegalArgumentException("Domain experts can only edit competencies assigned to their own department.");
        }
        if (jobPositionCode != null && !jobPositionCode.isBlank()
                && existing.jobPositionCode() != null && !existing.jobPositionCode().isBlank()
                && !jobPositionCode.trim().equalsIgnoreCase(existing.jobPositionCode().trim())) {
            throw new IllegalArgumentException("Domain experts can only edit competencies assigned to their own job position.");
        }

        String finalCode = (code != null && !code.isBlank())
                ? code.trim().toUpperCase()
                : (existing.code() != null && !existing.code().isBlank() ? existing.code() : generateDefaultCode());

        if (repository.existsByOrganizationIdAndCodeAndIdNot(organizationId, finalCode, id)) {
            throw new DuplicateCompetencyException(organizationId, finalCode);
        }

        String effectiveDeptId = departmentId != null && !departmentId.isBlank() ? departmentId.trim() : existing.departmentId();
        String effectiveDeptName = departmentName != null && !departmentName.isBlank() ? departmentName.trim() : existing.departmentName();
        String rawJpTitle = jobPositionTitle != null && !jobPositionTitle.isBlank() ? jobPositionTitle : existing.jobPositionTitle();
        String effectiveJpTitle = sanitizeJobPositionTitle(rawJpTitle);
        String effectiveJpCode = jobPositionCode != null && !jobPositionCode.isBlank()
                ? jobPositionCode.trim()
                : (existing.jobPositionCode() != null && !existing.jobPositionCode().isBlank()
                    ? existing.jobPositionCode()
                    : extractJobPositionCode(rawJpTitle));

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
                effectiveDeptId,
                effectiveDeptName,
                effectiveJpCode,
                effectiveJpTitle,
                existing.memberSkills()
        );
        return repository.save(organizationId, updated, skillIds != null ? skillIds : List.of(), existing.levelId());
    }

    @Override
    public void deleteCompetency(String organizationId, String id) {
        repository.deleteById(organizationId, id);
    }

    private String generateDefaultCode() {
        return "COMP-GEN-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }
}
