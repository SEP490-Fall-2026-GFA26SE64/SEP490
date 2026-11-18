package com.adaptlearngraph.services;

import static com.adaptlearngraph.services.OrganizationStructureFixtures.department;
import static com.adaptlearngraph.services.OrganizationStructureFixtures.job;
import static com.adaptlearngraph.services.OrganizationStructureFixtures.level;
import static com.adaptlearngraph.services.OrganizationStructureFixtures.role;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.dtos.RegistrationDto.DepartmentSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.JobPositionSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.LevelSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.OrganizationStructureRequest;
import com.adaptlearngraph.dtos.RegistrationDto.TargetRoleSheetRow;
import com.adaptlearngraph.exception.OrganizationStructureInvalid;
import com.adaptlearngraph.exception.OrganizationStructureInvalid.RowError;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class OrganizationStructureImporterTest {
    private static List<RowError> errors(OrganizationStructureRequest request) {
        try {
            OrganizationStructureImporter.validate(request);
        } catch (OrganizationStructureInvalid invalid) {
            return invalid.errors();
        }
        throw new AssertionError("Expected the workbook to be rejected");
    }

    private static List<String> where(OrganizationStructureRequest request) {
        return errors(request).stream().map(e -> e.sheet() + ":" + e.row() + ":" + e.column()).toList();
    }

    private static OrganizationStructureRequest one(List<LevelSheetRow> levels) {
        return new OrganizationStructureRequest(List.of(department(2, "ENG")), List.of(job(2, "ENG", "DEV")),
                List.of(role(2, "DEV", "BE")), levels);
    }

    @Test
    void linksSheetsByCaseInsensitiveCodeAndOrdersLevelsByRank() {
        var structure = OrganizationStructureImporter.validate(new OrganizationStructureRequest(
                List.of(department(2, "ENG")), List.of(job(2, "eng", "DEV")), List.of(role(2, "dev", "BE")),
                List.of(level(2, "be", "Senior", "2.0"), level(3, "BE", "Junior", "1"))));
        var role = structure.departments().getFirst().jobPositions().getFirst().targetRoles().getFirst();
        assertThat(role.code()).isEqualTo("BE");
        assertThat(role.levels()).extracting(l -> l.code() + ":" + l.name() + ":" + l.rank()).containsExactly("L1:Junior:1", "L2:Senior:2");
        var fixture = OrganizationStructureFixtures.structure();
        assertThat(List.of(fixture.departmentCount(), fixture.jobPositionCount(), fixture.targetRoleCount(), fixture.levelCount()))
                .containsExactly(2, 2, 3, 5);
    }

    @Test
    void everyRequiredCellIsReportedWithItsSheetAndRow() {
        var blank = new OrganizationStructureRequest(List.of(new DepartmentSheetRow(4, " ", null, "")),
                List.of(new JobPositionSheetRow(5, "", null, " ")), List.of(new TargetRoleSheetRow(6, null, "", null, "")),
                List.of(new LevelSheetRow(7, "", " ", null)));
        assertThat(where(blank)).containsExactly(
                "Departments:4:Department code", "Departments:4:Department name", "Departments:4:Department description",
                "Job positions:5:Department code", "Job positions:5:Job position code", "Job positions:5:Job position name",
                "Roles:6:Job position code", "Roles:6:Role code", "Roles:6:Role name",
                "Roles:6:Role scope", "Levels:7:Role code", "Levels:7:Level name", "Levels:7:Level rank");
    }

    @Test
    void rejectsInvalidRankCodeAndLength() {
        var request = new OrganizationStructureRequest(
                List.of(department(2, "ENG"), department(3, "EN G"), new DepartmentSheetRow(4, "OPS", "x".repeat(121), "d")),
                List.of(job(2, "ENG", "DEV")), List.of(role(2, "DEV", "BE")),
                List.of(level(2, "BE", "A", "0"), level(3, "BE", "B", "1.5"), level(4, "BE", "C", "abc"), level(5, "BE", "D", "1")));
        assertThat(where(request)).containsExactly("Departments:3:Department code", "Departments:4:Department name",
                "Levels:2:Level rank", "Levels:3:Level rank", "Levels:4:Level rank");
    }

    @Test
    void rejectsDuplicateCodesUnknownReferencesAndDuplicateLevels() {
        var request = new OrganizationStructureRequest(
                List.of(department(2, "ENG"), department(3, "eng")),
                List.of(job(2, "ENG", "DEV"), job(3, "HR", "REC"), job(4, "ENG", "dev")),
                List.of(role(2, "DEV", "BE"), role(3, "OPS", "SRE"), role(4, "DEV", "be")),
                List.of(level(2, "BE", "Junior", "1"), level(3, "BE", "junior", "2"), level(4, "BE", "Senior", "1"), level(5, "X", "Lead", "3")));
        var errors = errors(request);
        assertThat(errors).extracting(e -> e.sheet() + ":" + e.row() + ":" + e.column()).containsExactly(
                "Departments:3:Department code", "Job positions:3:Department code", "Job positions:4:Job position code",
                "Roles:3:Job position code", "Roles:4:Role code",
                "Levels:3:Level name", "Levels:4:Level rank", "Levels:5:Role code");
        assertThat(errors.get(1).message()).isEqualTo("Department code HR is not defined in the Departments sheet.");
        assertThat(errors.get(6).message()).contains("already used by level \"Junior\" in row 2");
    }

    @Test
    void everyBranchMustReachALevel() {
        var request = new OrganizationStructureRequest(
                List.of(department(2, "ENG"), department(3, "HR")),
                List.of(job(2, "ENG", "DEV"), job(3, "ENG", "OPS")),
                List.of(role(2, "DEV", "BE"), role(3, "DEV", "FE")),
                List.of(level(2, "BE", "Junior", "1")));
        assertThat(where(request)).containsExactly("Departments:3:Department code", "Job positions:3:Job position code",
                "Roles:3:Role code");
        assertThat(where(new OrganizationStructureRequest(List.of(), List.of(job(2, "ENG", "DEV")), null, null)))
                .containsExactly("Job positions:2:Department code");
    }

    @Test
    void wholeWorkbookAndPerSheetLimitsAreEnforced() {
        assertThat(errors(new OrganizationStructureRequest(null, List.of(), null, null)))
                .singleElement().satisfies(e -> assertThat(e.sheet()).isNull());
        var levels = IntStream.range(0, OrganizationStructureImporter.MAX_ROWS + 1)
                .mapToObj(i -> level(i + 2, "BE", "L" + i, "1")).toList();
        assertThat(errors(one(levels))).singleElement().satisfies(e -> {
            assertThat(e.sheet()).isEqualTo("Levels");
            assertThat(e.message()).contains("at most 500");
        });
        var full = IntStream.range(0, 99).mapToObj(i -> level(i + 2, "BE", "L" + i, String.valueOf(i + 1))).toList();
        assertThat(OrganizationStructureImporter.validate(one(full)).levelCount()).isEqualTo(99);
    }

    @Test
    void previewMirrorsTheNormalizedStructure() {
        var view = OrganizationStructureImporter.preview(OrganizationStructureFixtures.request());
        assertThat(view.departments().getFirst().description()).isEqualTo("ENG description");
        assertThat(view.departments().getFirst().jobPositions().getFirst().targetRoles()).extracting(r -> r.code() + ":" + r.scope())
                .containsExactly("TR-BE:TR-BE scope", "TR-FE:TR-FE scope");
        assertThatThrownBy(() -> OrganizationStructureImporter.preview(null)).isInstanceOf(OrganizationStructureInvalid.class);
    }
}
