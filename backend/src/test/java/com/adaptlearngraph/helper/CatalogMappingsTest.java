package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.CompetencyDto.CompetencyResponse;
import com.adaptlearngraph.dtos.CompetencyDto.MemberSkillResponse;
import com.adaptlearngraph.dtos.LearningModuleDto.LearningModuleResponse;
import com.adaptlearngraph.dtos.MicroSkillResponse;
import com.adaptlearngraph.dtos.JobPositionResponse;
import com.adaptlearngraph.dtos.PrerequisiteResponse;
import com.adaptlearngraph.dtos.SystemStatusResponse;
import com.adaptlearngraph.dtos.TargetRoleResponse;
import com.adaptlearngraph.entities.domain.CompetencyRecord;
import com.adaptlearngraph.entities.domain.LearningModuleRecord;
import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.MicroSkillId;
import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.SystemStatus;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

/** Catalog TypeMaps copy only the requested organization's values and add no fields beyond the established API. */
class CatalogMappingsTest {
    private static final Instant CREATED = Instant.parse("2026-10-01T08:00:00Z");
    private static final Instant UPDATED = Instant.parse("2026-10-02T09:30:00Z");
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    @Test
    void allCatalogRegistrarsValidateTogether() {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new JobPositionMappings(), new CompetencyMappings(),
                new MicroSkillMappings(), new TargetRoleMappings(),
                new LearningModuleMappings(), new SystemStatusMappings()));

        assertThat(mapper.getTypeMaps()).hasSizeGreaterThanOrEqualTo(8);
        assertThat(mapper.map(new SystemStatus("adapt-learn-graph", "1.2.3", "SCAFFOLD"), SystemStatusResponse.class))
                .isEqualTo(new SystemStatusResponse("adapt-learn-graph", "1.2.3", "SCAFFOLD"));
    }

    @Test
    void mapsJobPositions() {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new JobPositionMappings()));
        var jobPosition = new JobPosition("occ-1", "15-1252.00", "Software Developer", 4, 0.1, 0.9, 0.3, 0.2, 0.4, 0.5,
                "ACTIVE", "1.0.0", 3, 12);

        assertThat(mapper.map(jobPosition, JobPositionResponse.class)).isEqualTo(new JobPositionResponse("occ-1",
                "15-1252.00", "Software Developer", 4, 0.1, 0.9, 0.3, 0.2, 0.4, 0.5, "ACTIVE", "1.0.0", 3, 12));
    }

    @Test
    void mapsCompetenciesWithMemberSkillsAndNullMembers() {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new CompetencyMappings()));
        var record = new CompetencyRecord("cmp-1", "API_DESIGN", "API design", "Designs APIs", "ALL", "ACTIVE", "1.0",
                "lvl-1", "Middle", "Backend Engineer",
                List.of(new CompetencyRecord.MemberSkill("s1", "REST", "REST"), new CompetencyRecord.MemberSkill("s2", "GRPC", "gRPC")));

        assertThat(mapper.map(record, CompetencyResponse.class)).isEqualTo(new CompetencyResponse("cmp-1", "API_DESIGN",
                "API design", "Designs APIs", "ALL", "ACTIVE", "1.0", "lvl-1", "Middle", "Backend Engineer",
                List.of(new MemberSkillResponse("s1", "REST", "REST"), new MemberSkillResponse("s2", "GRPC", "gRPC")), 2));

        var withoutMembers = new CompetencyRecord("cmp-2", "C2", "C2", null, null, null, null, null, null, null, null);
        assertThat(mapper.map(withoutMembers, CompetencyResponse.class)).isEqualTo(new CompetencyResponse("cmp-2", "C2",
                "C2", null, null, null, null, null, null, null, null, 0));
    }

    @Test
    void mapsMicroSkillsAndPrerequisitesOfTheirOwnOrganization() throws Exception {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new MicroSkillMappings()));
        UUID skillId = UUID.randomUUID();
        var skill = new MicroSkill(new MicroSkillId(skillId), "org-a", "java_core", "Java Core", "Basics",
                SkillStatus.DRAFT, CREATED, UPDATED);

        MicroSkillResponse response = mapper.map(skill, MicroSkillResponse.class);

        assertThat(response).isEqualTo(new MicroSkillResponse(new MicroSkillId(skillId).toString(), "org-a", "JAVA_CORE",
                "Java Core", "Basics", "DRAFT", CREATED, UPDATED));
        assertThat(json.writeValueAsString(response)).contains("\"organizationId\":\"org-a\"").doesNotContain("org-b");

        var edge = new PrerequisiteEdge("s1", "JAVA_CORE", "Java Core", "s2", "SPRING", "Spring", 0.6,
                SkillStatus.ACTIVE, CREATED, UPDATED);
        assertThat(mapper.map(edge, PrerequisiteResponse.class)).isEqualTo(new PrerequisiteResponse("s1", "JAVA_CORE",
                "Java Core", "s2", "SPRING", "Spring", 0.6, "ACTIVE", CREATED.toString(), UPDATED.toString()));
    }

    @Test
    void mapsTargetRolesIncludingParsedJsonAndDefaults() throws Exception {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new TargetRoleMappings()));
        UUID roleId = UUID.randomUUID();
        var role = new TargetRole(new TargetRoleId(roleId), "org-a", "ROLE_BACKEND", "Backend Engineer", "backend",
                RoleTrack.MANAGEMENT, "expert-1", "Builds services", List.of("Own APIs"), RoleStatus.SENT, "2.0",
                "[{\"skillId\":\"s1\",\"targetMastery\":0.8}]", CREATED, UPDATED, "Needs work", List.of("Senior"),
                "{\"Senior\":[\"cmp-1\"]}", List.of("cmp-1"));

        TargetRoleResponse response = mapper.map(role, TargetRoleResponse.class);

        assertThat(response).isEqualTo(new TargetRoleResponse(roleId.toString(), "org-a", "ROLE_BACKEND",
                "Backend Engineer", "BACKEND", "MANAGEMENT", "expert-1", "Builds services", List.of("Own APIs"), "SENT",
                "2.0", List.of(Map.of("skillId", "s1", "targetMastery", 0.8)), CREATED, UPDATED, "Needs work",
                List.of("Senior"), Map.of("Senior", List.of("cmp-1")), List.of("cmp-1")));
        assertThat(Arrays.stream(TargetRoleResponse.class.getRecordComponents()).map(c -> c.getName()).toList())
                .containsExactly("id", "organizationId", "code", "name", "familyCode", "track", "assignedExpertId",
                        "description", "responsibilities", "status", "version", "skillTargets", "createdAt", "updatedAt",
                        "rejectionReason", "levels", "levelCompetencies", "competencyIds", "levelDurations");
        assertThat(json.writeValueAsString(response)).contains("\"organizationId\":\"org-a\"");

        var minimal = new TargetRole(new TargetRoleId(roleId), "org-a", "R2", "Role two", null, null, null, null, null,
                null, null, "not json", CREATED, UPDATED, null, null, null, null);
        TargetRoleResponse defaults = mapper.map(minimal, TargetRoleResponse.class);
        assertThat(defaults.skillTargets()).isEmpty();
        assertThat(defaults.levels()).containsExactly("Senior", "Middle", "Junior");
        assertThat(defaults.levelCompetencies()).isEmpty();
        assertThat(defaults.status()).isEqualTo("DRAFT");
        assertThat(defaults.track()).isEqualTo("PROFESSIONAL");
    }

    @Test
    void mapsLearningModules() {
        ModelMapper mapper = ModelMapperFactory.create(List.of(new LearningModuleMappings()));
        var module = new LearningModuleRecord("m1", "M1", "Intro", "LESSON", "uri://m1", "text/markdown", "1.0", "0.9.0",
                "ACTIVE", "APPROVED", 30, List.of("s1"), List.of("Java"));

        assertThat(mapper.map(module, LearningModuleResponse.class)).isEqualTo(new LearningModuleResponse("m1", "M1",
                "Intro", "LESSON", "uri://m1", "text/markdown", "1.0", "0.9.0", "ACTIVE", "APPROVED", 30, List.of("s1"),
                List.of("Java")));
    }
}
