package com.adaptlearngraph.catalog;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("REQ-023-F01: TargetRole Domain Invariants")
class TargetRoleDomainTest {

    @Test
    @DisplayName("createNew sets initial status to DRAFT and normalizes code")
    void createNewSetsDraftStatusAndNormalizedCode() {
        TargetRole role = TargetRole.createNew(
                "org-1",
                "java_backend_p3",
                "Java Backend Developer P3",
                "JAVA_BACKEND",
                RoleTrack.PROFESSIONAL,
                "Backend engineering role");

        assertNotNull(role.getId());
        assertEquals("org-1", role.getOrganizationId());
        assertEquals("JAVA_BACKEND_P3", role.getCode());
        assertEquals("Java Backend Developer P3", role.getName());
        assertEquals("JAVA_BACKEND", role.getFamilyCode());
        assertEquals(RoleTrack.PROFESSIONAL, role.getTrack());
        assertEquals(RoleStatus.DRAFT, role.getStatus());
        assertNotNull(role.getCreatedAt());
        assertNotNull(role.getUpdatedAt());
    }

    @Test
    @DisplayName("createNew throws exception when required fields are blank")
    void createNewRejectsBlankFields() {
        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("", "CODE", "Name", "FAM", RoleTrack.PROFESSIONAL, "Desc"));

        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("org-1", "", "Name", "FAM", RoleTrack.PROFESSIONAL, "Desc"));

        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("org-1", "CODE", "   ", "FAM", RoleTrack.PROFESSIONAL, "Desc"));
    }

    @Test
    @DisplayName("updateDetails modifies mutable metadata and refreshes updatedAt")
    void updateDetailsModifiesMetadata() {
        TargetRole role = TargetRole.createNew(
                "org-1",
                "ROLE_AI",
                "Initial AI Role",
                "AI",
                "AI_ML",
                RoleTrack.PROFESSIONAL,
                "expert-1",
                "Initial description");

        TargetRole updated = role.updateDetails(
                "Updated AI Role",
                "DATA",
                "PYTHON_DATA",
                RoleTrack.MANAGEMENT,
                "expert-2",
                "Updated description");

        assertEquals("Updated AI Role", updated.getName());
        assertEquals("DATA", updated.getDomainCode());
        assertEquals("PYTHON_DATA", updated.getFamilyCode());
        assertEquals(RoleTrack.MANAGEMENT, updated.getTrack());
        assertEquals("expert-2", updated.getAssignedExpertId());
        assertEquals("Updated description", updated.getDescription());
        assertEquals(role.getCode(), updated.getCode());
        assertEquals(role.getStatus(), updated.getStatus());
    }

    @Test
    @DisplayName("Status lifecycle transitions: markSent -> reject -> publish")
    void statusLifecycleTransitions() {
        TargetRole role = TargetRole.createNew(
                "org-1",
                "ROLE_DEV",
                "Developer",
                "ICT",
                "JAVA_BACKEND",
                RoleTrack.PROFESSIONAL,
                "expert-1",
                "Desc");

        assertEquals(RoleStatus.DRAFT, role.getStatus());

        TargetRole sent = role.markSent();
        assertEquals(RoleStatus.SENT, sent.getStatus());

        TargetRole rejected = sent.reject();
        assertEquals(RoleStatus.REJECTED, rejected.getStatus());

        TargetRole published = rejected.publish();
        assertEquals(RoleStatus.ACTIVE, published.getStatus());
    }

    @Test
    @DisplayName("createNew sets seniority and responsibilities and enforces track matching")
    void createNewWithSeniorityAndResponsibilities() {
        TargetRole validRole = TargetRole.createNew(
                "org-1",
                "ROLE_LEAD",
                "Engineering Lead",
                "ICT",
                "JAVA_BACKEND",
                RoleTrack.MANAGEMENT,
                com.adaptlearngraph.catalog.domain.Seniority.M3,
                "expert-1",
                "Engineering Leadership Role",
                java.util.List.of("Lead backend engineering team", "Manage sprint delivery"),
                "1.0",
                RoleStatus.DRAFT,
                "[]");

        assertEquals(com.adaptlearngraph.catalog.domain.Seniority.M3, validRole.getSeniority());
        assertEquals(2, validRole.getResponsibilities().size());
        assertEquals("Lead backend engineering team", validRole.getResponsibilities().get(0));

        // Mismatched seniority: M3 cannot be assigned to PROFESSIONAL track
        assertThrows(IllegalArgumentException.class, () -> TargetRole.createNew(
                "org-1",
                "ROLE_INVALID",
                "Invalid Role",
                "ICT",
                "JAVA_BACKEND",
                RoleTrack.PROFESSIONAL,
                com.adaptlearngraph.catalog.domain.Seniority.M3,
                "expert-1",
                "Invalid",
                java.util.List.of(),
                "1.0",
                RoleStatus.DRAFT,
                "[]"));
    }
}
