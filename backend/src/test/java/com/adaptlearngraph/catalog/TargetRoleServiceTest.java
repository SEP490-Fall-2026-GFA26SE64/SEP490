package com.adaptlearngraph.catalog;

import com.adaptlearngraph.catalog.application.DuplicateTargetRoleException;
import com.adaptlearngraph.catalog.application.TargetRoleService;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("REQ-023-F01 & REQ-023-F02: TargetRole Application Service Tests")
class TargetRoleServiceTest {

    private InMemoryTargetRoleRepository repository;
    private TargetRoleService service;

    @BeforeEach
    void setUp() {
        repository = new InMemoryTargetRoleRepository();
        service = new TargetRoleService(repository);
    }

    @Test
    @DisplayName("REQ-023-F01: Creates TargetRole successfully with DRAFT status")
    void createsTargetRoleSuccessfully() {
        CreateTargetRoleCommand command = new CreateTargetRoleCommand(
                "org-1",
                "ROLE_AI_ENGINEER",
                "AI Engineer",
                "DATA_AI",
                RoleTrack.PROFESSIONAL,
                "Builds generative AI systems");

        TargetRole created = service.createTargetRole(command);

        assertNotNull(created.getId());
        assertEquals("org-1", created.getOrganizationId());
        assertEquals("ROLE_AI_ENGINEER", created.getCode());
        assertEquals(RoleStatus.DRAFT, created.getStatus());
        assertEquals(1, repository.roles.size());
    }

    @Test
    @DisplayName("REQ-023-F01: Rejects duplicate role code within the same organization with 409 exception")
    void rejectsDuplicateRoleCodeInSameOrg() {
        CreateTargetRoleCommand command1 = new CreateTargetRoleCommand(
                "org-1",
                "ROLE_AI_ENGINEER",
                "AI Engineer",
                "DATA_AI",
                RoleTrack.PROFESSIONAL,
                "First role");
        service.createTargetRole(command1);

        CreateTargetRoleCommand command2 = new CreateTargetRoleCommand(
                "org-1",
                "role_ai_engineer",
                "AI Engineer Duplicate",
                "DATA_AI",
                RoleTrack.PROFESSIONAL,
                "Second role");

        assertThrows(DuplicateTargetRoleException.class, () -> service.createTargetRole(command2));
    }

    @Test
    @DisplayName("REQ-023-F02: Lists only target roles belonging to requesting organization")
    void listsRolesWithOrgIsolation() {
        service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_1", "Role 1", "FAM", RoleTrack.PROFESSIONAL, ""));
        service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_2", "Role 2", "FAM", RoleTrack.MANAGEMENT, ""));
        service.createTargetRole(new CreateTargetRoleCommand("org-2", "ROLE_3", "Role 3", "FAM", RoleTrack.PROFESSIONAL, ""));

        List<TargetRole> org1Roles = service.listTargetRoles("org-1", TargetRoleFilter.empty());
        List<TargetRole> org2Roles = service.listTargetRoles("org-2", TargetRoleFilter.empty());

        assertEquals(2, org1Roles.size());
        assertEquals(1, org2Roles.size());
    }

    @Test
    @DisplayName("REQ-023: Allows L&D Manager to delete draft and published target roles")
    void deletesDraftAndPublishedRolesSuccessfully() {
        TargetRole draftRole = service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_DRAFT", "Draft Role", "FAM", RoleTrack.PROFESSIONAL, ""));
        boolean draftDeleted = service.deleteTargetRole("org-1", draftRole.getId());
        org.junit.jupiter.api.Assertions.assertTrue(draftDeleted);
        assertEquals(0, service.listTargetRoles("org-1", TargetRoleFilter.empty()).size());

        TargetRole activeRole = new TargetRole(
                TargetRoleId.generate(),
                "org-1",
                "ROLE_ACTIVE",
                "Active Role",
                "FAM",
                RoleTrack.PROFESSIONAL,
                "Description",
                RoleStatus.ACTIVE,
                java.time.Instant.now(),
                java.time.Instant.now());
        repository.save(activeRole);
        boolean activeDeleted = service.deleteTargetRole("org-1", activeRole.getId());
        org.junit.jupiter.api.Assertions.assertTrue(activeDeleted);
        assertEquals(0, service.listTargetRoles("org-1", TargetRoleFilter.empty()).size());
    }

    @Test
    @DisplayName("REQ-023-F03: Updates TargetRole attributes successfully")
    void updatesTargetRoleSuccessfully() {
        TargetRole created = service.createTargetRole(new CreateTargetRoleCommand(
                "org-1", "ROLE_CLOUD", "Cloud Architect", "ICT", RoleTrack.PROFESSIONAL, "Initial"));

        com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand updateCmd =
                new com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand(
                        "org-1",
                        created.getId(),
                        "Senior Cloud Architect",
                        "ICT",
                        "CLOUD_DEVOPS",
                        RoleTrack.MANAGEMENT,
                        "expert-42",
                        "Updated scope");

        Optional<TargetRole> updatedOpt = service.updateTargetRole(updateCmd);
        org.junit.jupiter.api.Assertions.assertTrue(updatedOpt.isPresent());
        TargetRole updated = updatedOpt.get();
        assertEquals("Senior Cloud Architect", updated.getName());
        assertEquals("CLOUD_DEVOPS", updated.getFamilyCode());
        assertEquals(RoleTrack.MANAGEMENT, updated.getTrack());
        assertEquals("expert-42", updated.getAssignedExpertId());
    }

    @Test
    @DisplayName("REQ-023-F01 & REQ-023-F03: Creates and updates TargetRole with seniority and responsibilities")
    void createsAndUpdatesWithSeniorityAndResponsibilities() {
        CreateTargetRoleCommand createCmd = new CreateTargetRoleCommand(
                "org-1",
                "ROLE_AI_P4",
                "AI Knowledge Architect",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                com.adaptlearngraph.catalog.domain.Seniority.P4,
                "expert-chen",
                "Enterprise knowledge graph role",
                List.of("Model enterprise graphs", "Integrate DL pipelines"),
                "1.0",
                RoleStatus.DRAFT,
                "[]");

        TargetRole created = service.createTargetRole(createCmd);
        assertEquals(com.adaptlearngraph.catalog.domain.Seniority.P4, created.getSeniority());
        assertEquals(2, created.getResponsibilities().size());
        assertEquals("Model enterprise graphs", created.getResponsibilities().get(0));

        com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand updateCmd =
                new com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand(
                        "org-1",
                        created.getId(),
                        "AI Principal Architect",
                        "AI",
                        "AI_ML",
                        RoleTrack.PROFESSIONAL,
                        com.adaptlearngraph.catalog.domain.Seniority.P5,
                        "expert-chen",
                        "Principal knowledge graph role",
                        List.of("Model enterprise graphs", "Integrate DL pipelines", "Strategic AI governance"),
                        RoleStatus.ACTIVE,
                        "1.0",
                        "[]",
                        null);

        Optional<TargetRole> updatedOpt = service.updateTargetRole(updateCmd);
        org.junit.jupiter.api.Assertions.assertTrue(updatedOpt.isPresent());
        TargetRole updated = updatedOpt.get();
        assertEquals(com.adaptlearngraph.catalog.domain.Seniority.P5, updated.getSeniority());
        assertEquals(3, updated.getResponsibilities().size());
        assertEquals("Strategic AI governance", updated.getResponsibilities().get(2));
    }

    @Test
    @DisplayName("REQ-023-F02 & REQ-011-F01: Lists target roles filtered by assigned domain expert")
    void listsRolesFilteredByAssignedExpert() {
        TargetRole role1 = TargetRole.createNew("org-1", "ROLE_AI", "AI Spec", "AI", "AI_ML", RoleTrack.PROFESSIONAL, "expert-1", "");
        TargetRole role2 = TargetRole.createNew("org-1", "ROLE_DATA", "Data Spec", "DATA", "PYTHON_DATA", RoleTrack.PROFESSIONAL, "expert-2", "");
        repository.save(role1);
        repository.save(role2);

        TargetRoleFilter expert1Filter = new TargetRoleFilter(null, null, null, null, "expert-1");
        List<TargetRole> expert1Roles = service.listTargetRoles("org-1", expert1Filter);

        assertEquals(1, expert1Roles.size());
        assertEquals("ROLE_AI", expert1Roles.getFirst().getCode());
    }

    @Test
    @DisplayName("REQ-023-F02: getTargetRole returns empty when role does not exist or organization mismatches")
    void getTargetRoleEnforcesOrgIsolation() {
        TargetRole role = service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_SEC", "Security", "ICT", RoleTrack.PROFESSIONAL, ""));

        org.junit.jupiter.api.Assertions.assertTrue(service.getTargetRole("org-1", role.getId()).isPresent());
        org.junit.jupiter.api.Assertions.assertTrue(service.getTargetRole("org-other", role.getId()).isEmpty());
    }

    private static class InMemoryTargetRoleRepository implements TargetRoleRepository {
        final List<TargetRole> roles = new ArrayList<>();

        @Override
        public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
            return roles.stream()
                    .anyMatch(r -> r.getOrganizationId().equals(organizationId) && r.getCode().equalsIgnoreCase(code));
        }

        @Override
        public TargetRole save(TargetRole targetRole) {
            roles.removeIf(r -> r.getId().equals(targetRole.getId()));
            roles.add(targetRole);
            return targetRole;
        }

        @Override
        public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
            return roles.stream()
                    .filter(r -> r.getOrganizationId().equals(organizationId))
                    .filter(r -> filter.track() == null || r.getTrack() == filter.track())
                    .filter(r -> filter.status() == null || r.getStatus() == filter.status())
                    .filter(r -> filter.domainCode() == null || r.getDomainCode().equalsIgnoreCase(filter.domainCode()))
                    .filter(r -> filter.assignedExpertId() == null || r.getAssignedExpertId().equalsIgnoreCase(filter.assignedExpertId()))
                    .filter(r -> filter.search() == null || r.getName().toLowerCase().contains(filter.search().toLowerCase()))
                    .toList();
        }

        @Override
        public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
            return roles.stream()
                    .filter(r -> r.getOrganizationId().equals(organizationId) && r.getId().equals(id))
                    .findFirst();
        }

        @Override
        public Optional<TargetRole> findByCode(String organizationId, String code) {
            return roles.stream()
                    .filter(r -> r.getOrganizationId().equals(organizationId) && r.getCode().equalsIgnoreCase(code))
                    .findFirst();
        }

        @Override
        public void deleteById(String organizationId, TargetRoleId id) {
            roles.removeIf(r -> r.getOrganizationId().equals(organizationId) && r.getId().equals(id));
        }
    }
}

