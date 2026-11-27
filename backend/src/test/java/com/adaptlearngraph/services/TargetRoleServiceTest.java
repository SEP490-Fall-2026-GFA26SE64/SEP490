package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateTargetRoleCommand;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.dtos.UpdateTargetRoleCommand;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.adaptlearngraph.exception.DuplicateTargetRoleException;
import com.adaptlearngraph.repository.TargetRoleRepository;
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
                "First role");
        service.createTargetRole(command1);

        CreateTargetRoleCommand command2 = new CreateTargetRoleCommand(
                "org-1",
                "role_ai_engineer",
                "AI Engineer Duplicate",
                "Second role");

        assertThrows(DuplicateTargetRoleException.class, () -> service.createTargetRole(command2));
    }

    @Test
    @DisplayName("REQ-023-F02: Lists only target roles belonging to requesting organization")
    void listsRolesWithOrgIsolation() {
        service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_1", "Role 1", ""));
        service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_2", "Role 2", ""));
        service.createTargetRole(new CreateTargetRoleCommand("org-2", "ROLE_3", "Role 3", ""));

        List<TargetRole> org1Roles = service.listTargetRoles("org-1", TargetRoleFilter.empty());
        List<TargetRole> org2Roles = service.listTargetRoles("org-2", TargetRoleFilter.empty());

        assertEquals(2, org1Roles.size());
        assertEquals(1, org2Roles.size());
    }

    @Test
    @DisplayName("REQ-023: Allows L&D Manager to delete draft and published target roles")
    void deletesDraftAndPublishedRolesSuccessfully() {
        TargetRole draftRole = service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_DRAFT", "Draft Role", ""));
        boolean draftDeleted = service.deleteTargetRole("org-1", draftRole.getId());
        org.junit.jupiter.api.Assertions.assertTrue(draftDeleted);
        assertEquals(0, service.listTargetRoles("org-1", TargetRoleFilter.empty()).size());

        TargetRole activeRole = new TargetRole(
                TargetRoleId.generate(),
                "org-1",
                "ROLE_ACTIVE",
                "Active Role",
                null,
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
    @DisplayName("REQ-023: Rejects deletion of staged or staffing-enabled target roles")
    void rejectsDeletionOfStagedOrStaffingEnabledRoles() {
        TargetRole stagedRole = new TargetRole(
                TargetRoleId.generate(),
                "org-1",
                "ROLE_STAGED",
                "Staged Role",
                null,
                "Description",
                RoleStatus.STAGED,
                java.time.Instant.now(),
                java.time.Instant.now());
        repository.save(stagedRole);

        IllegalArgumentException exStaged = assertThrows(
                IllegalArgumentException.class,
                () -> service.deleteTargetRole("org-1", stagedRole.getId()));
        org.junit.jupiter.api.Assertions.assertTrue(exStaged.getMessage().contains("preserve workforce staffing integrity"));

        TargetRole staffingEnabledSentRole = new TargetRole(
                TargetRoleId.generate(),
                "org-1",
                "ROLE_SENT_STAGED",
                "Sent Staged Role",
                "expert-1",
                "Description",
                List.of(),
                RoleStatus.SENT,
                "1.0",
                "[]",
                java.time.Instant.now(),
                java.time.Instant.now(),
                null,
                List.of("Senior", "Middle"),
                "{}",
                List.of(),
                java.util.Map.of(),
                true);
        repository.save(staffingEnabledSentRole);

        IllegalArgumentException exStaffing = assertThrows(
                IllegalArgumentException.class,
                () -> service.deleteTargetRole("org-1", staffingEnabledSentRole.getId()));
        org.junit.jupiter.api.Assertions.assertTrue(exStaffing.getMessage().contains("preserve workforce staffing integrity"));
    }

    @Test
    @DisplayName("REQ-023-F03: Updates TargetRole attributes successfully")
    void updatesTargetRoleSuccessfully() {
        TargetRole created = service.createTargetRole(new CreateTargetRoleCommand(
                "org-1", "ROLE_CLOUD", "Cloud Architect", "Initial"));

        UpdateTargetRoleCommand updateCmd =
                new UpdateTargetRoleCommand(
                        "org-1",
                        created.getId(),
                        "Senior Cloud Architect",
                        "expert-42",
                        "Updated scope");

        Optional<TargetRole> updatedOpt = service.updateTargetRole(updateCmd);
        org.junit.jupiter.api.Assertions.assertTrue(updatedOpt.isPresent());
        TargetRole updated = updatedOpt.get();
        assertEquals("Senior Cloud Architect", updated.getName());
        assertEquals("expert-42", updated.getAssignedExpertId());
    }

    @Test
    @DisplayName("REQ-023-F01 & REQ-023-F03: Creates and updates TargetRole with responsibilities")
    void createsAndUpdatesWithResponsibilities() {
        CreateTargetRoleCommand createCmd = new CreateTargetRoleCommand(
                "org-1",
                "ROLE_AI_P4",
                "AI Knowledge Architect",
                "expert-chen",
                "Enterprise knowledge graph role",
                List.of("Model enterprise graphs", "Integrate DL pipelines"),
                "1.0",
                RoleStatus.DRAFT,
                "[]");

        TargetRole created = service.createTargetRole(createCmd);
        assertEquals(2, created.getResponsibilities().size());
        assertEquals("Model enterprise graphs", created.getResponsibilities().get(0));

        UpdateTargetRoleCommand updateCmd =
                new UpdateTargetRoleCommand(
                        "org-1",
                        created.getId(),
                        "AI Principal Architect",
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
        assertEquals(3, updated.getResponsibilities().size());
        assertEquals("Strategic AI governance", updated.getResponsibilities().get(2));
    }

    @Test
    @DisplayName("REQ-023-F02 & REQ-011-F01: Lists target roles filtered by assigned domain expert")
    void listsRolesFilteredByAssignedExpert() {
        TargetRole role1 = TargetRole.createNew("org-1", "ROLE_AI", "AI Spec", "expert-1", "");
        TargetRole role2 = TargetRole.createNew("org-1", "ROLE_DATA", "Data Spec", "expert-2", "");
        repository.save(role1);
        repository.save(role2);

        TargetRoleFilter expert1Filter = new TargetRoleFilter(null, null, "expert-1");
        List<TargetRole> expert1Roles = service.listTargetRoles("org-1", expert1Filter);

        assertEquals(1, expert1Roles.size());
        assertEquals("ROLE_AI", expert1Roles.getFirst().getCode());
    }

    @Test
    @DisplayName("REQ-023-F02: getTargetRole returns empty when role does not exist or organization mismatches")
    void getTargetRoleEnforcesOrgIsolation() {
        TargetRole role = service.createTargetRole(new CreateTargetRoleCommand("org-1", "ROLE_SEC", "Security", ""));

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
                    .filter(r -> filter.status() == null || r.getStatus() == filter.status())
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
