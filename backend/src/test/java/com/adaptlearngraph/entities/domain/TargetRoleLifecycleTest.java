package com.adaptlearngraph.entities.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("REQ-023-F01: TargetRole Domain Invariants")
class TargetRoleLifecycleTest {

    @Test
    @DisplayName("createNew sets initial status to DRAFT and normalizes code")
    void createNewSetsDraftStatusAndNormalizedCode() {
        TargetRole role = TargetRole.createNew(
                "org-1",
                "java_backend_p3",
                "Java Backend Developer P3",
                "Backend engineering role");

        assertNotNull(role.getId());
        assertEquals("org-1", role.getOrganizationId());
        assertEquals("JAVA_BACKEND_P3", role.getCode());
        assertEquals("Java Backend Developer P3", role.getName());
        assertEquals(RoleStatus.DRAFT, role.getStatus());
        assertNotNull(role.getCreatedAt());
        assertNotNull(role.getUpdatedAt());
    }

    @Test
    @DisplayName("createNew throws exception when required fields are blank")
    void createNewRejectsBlankFields() {
        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("", "CODE", "Name", "Desc"));

        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("org-1", "", "Name", "Desc"));

        assertThrows(IllegalArgumentException.class, () ->
                TargetRole.createNew("org-1", "CODE", "   ", "Desc"));
    }

    @Test
    @DisplayName("updateDetails modifies mutable metadata and refreshes updatedAt")
    void updateDetailsModifiesMetadata() {
        TargetRole role = TargetRole.createNew(
                "org-1",
                "ROLE_AI",
                "Initial AI Role",
                "expert-1",
                "Initial description");

        TargetRole updated = role.updateDetails(
                "Updated AI Role",
                "expert-2",
                "Updated description");

        assertEquals("Updated AI Role", updated.getName());
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
                "expert-1",
                "Desc");

        assertEquals(RoleStatus.DRAFT, role.getStatus());

        TargetRole sent = role.markSent();
        assertEquals(RoleStatus.SENT, sent.getStatus());

        TargetRole rejected = sent.reject();
        assertEquals(RoleStatus.REJECTED, rejected.getStatus());

        TargetRole published = rejected.publish();
        assertEquals(RoleStatus.ACTIVE, published.getStatus());

        TargetRole unpublished = published.unpublish();
        assertEquals(RoleStatus.UNPUBLISHED, unpublished.getStatus());

        TargetRole republished = unpublished.publish();
        assertEquals(RoleStatus.ACTIVE, republished.getStatus());
    }

    @Test
    @DisplayName("createNew sets responsibilities")
    void createNewWithResponsibilities() {
        TargetRole validRole = TargetRole.createNew(
                "org-1",
                "ROLE_LEAD",
                "Engineering Lead",
                "expert-1",
                "Engineering Leadership Role",
                java.util.List.of("Lead backend engineering team", "Manage sprint delivery"),
                "1.0",
                RoleStatus.DRAFT,
                "[]");
        assertEquals(2, validRole.getResponsibilities().size());
        assertEquals("Lead backend engineering team", validRole.getResponsibilities().get(0));
    }
}
