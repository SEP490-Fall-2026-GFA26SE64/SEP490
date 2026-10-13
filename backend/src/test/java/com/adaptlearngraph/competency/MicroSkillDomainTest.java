package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.SkillStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("REQ-012-F01: MicroSkill Domain Invariants")
class MicroSkillDomainTest {

    @Test
    @DisplayName("createNew normalizes code and sets ACTIVE status")
    void createNewSetsActiveStatusAndNormalizedCode() {
        MicroSkill skill = MicroSkill.createNew(
                "org-1",
                "spring_security",
                "Spring Security",
                "Authentication and authorization in Spring",
                "KNOWLEDGE");

        assertNotNull(skill.getId());
        assertEquals("org-1", skill.getOrganizationId());
        assertEquals("SPRING_SECURITY", skill.getCode());
        assertEquals("Spring Security", skill.getName());
        assertEquals("Authentication and authorization in Spring", skill.getDescription());
        assertEquals("KNOWLEDGE", skill.getMacroCompetencyCode());
        assertEquals(SkillStatus.ACTIVE, skill.getStatus());
        assertNotNull(skill.getCreatedAt());
        assertNotNull(skill.getUpdatedAt());
    }

    @Test
    @DisplayName("createNew rejects blank required fields")
    void createNewRejectsBlankFields() {
        assertThrows(IllegalArgumentException.class, () ->
                MicroSkill.createNew("", "CODE", "Name", "Desc", "KNOWLEDGE"));

        assertThrows(IllegalArgumentException.class, () ->
                MicroSkill.createNew("org-1", "", "Name", "Desc", "KNOWLEDGE"));

        assertThrows(IllegalArgumentException.class, () ->
                MicroSkill.createNew("org-1", "CODE", "   ", "Desc", "KNOWLEDGE"));
    }
}
