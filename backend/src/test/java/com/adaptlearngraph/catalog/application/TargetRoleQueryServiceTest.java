package com.adaptlearngraph.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException.Code;
import com.adaptlearngraph.catalog.application.port.out.EmployeeContextPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.domain.CareerTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleRequirement;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

class TargetRoleQueryServiceTest {
    private static final EmployeeActorContext ACTIVE_EMPLOYEE =
            new EmployeeActorContext("account-1", "org-a", true, Set.of("employee"));

    @Test
    void listUsesTrustedOrganizationNormalizesCriteriaAndSortsByNameThenId() {
        var catalog = new RecordingCatalog();
        catalog.roles = List.of(
                summary("role-z", "Zulu"),
                summary("role-b", " alpha "),
                summary("role-a", "Alpha"));
        var service = service(Optional.of(ACTIVE_EMPLOYEE), catalog);

        var result = service.listTargetRoles("  ＪＡＶＡ  ", Seniority.P3);

        assertThat(catalog.organizationId).isEqualTo("org-a");
        assertThat(catalog.criteria.normalizedSearch()).isEqualTo("java");
        assertThat(catalog.criteria.seniority()).isEqualTo(Seniority.P3);
        assertThat(result).extracting(TargetRoleSummary::id)
                .containsExactly("role-a", "role-b", "role-z");
    }

    @Test
    void blankSearchBecomesNoSearchCriterion() {
        var catalog = new RecordingCatalog();

        service(Optional.of(ACTIVE_EMPLOYEE), catalog).listTargetRoles("   ", null);

        assertThat(catalog.criteria.normalizedSearch()).isNull();
        assertThat(catalog.criteria.seniority()).isNull();
    }

    @Test
    void rejectsSearchLongerThanContractBeforeCallingCatalog() {
        var catalog = new RecordingCatalog();
        var service = service(Optional.of(ACTIVE_EMPLOYEE), catalog);

        assertCode(Code.INVALID_REQUEST, () -> service.listTargetRoles("x".repeat(101), null));
        assertThat(catalog.listCalls).isZero();
    }

    @Test
    void requiresAuthenticatedActiveEmployee() {
        var catalog = new RecordingCatalog();

        assertCode(Code.UNAUTHENTICATED, () -> service(Optional.empty(), catalog).listTargetRoles(null, null));
        assertCode(Code.FORBIDDEN, () -> service(
                Optional.of(new EmployeeActorContext("account-1", "org-a", false, Set.of("EMPLOYEE"))),
                catalog).listTargetRoles(null, null));
        assertCode(Code.FORBIDDEN, () -> service(
                Optional.of(new EmployeeActorContext("account-1", "org-a", true, Set.of("MANAGER"))),
                catalog).listTargetRoles(null, null));
        assertThat(catalog.listCalls).isZero();
    }

    @Test
    void detailUsesTrustedOrganizationAndTrimmedRoleId() {
        var catalog = new RecordingCatalog();
        catalog.detail = Optional.of(detail("role-1"));

        var result = service(Optional.of(ACTIVE_EMPLOYEE), catalog).getTargetRole("  role-1  ");

        assertThat(result.id()).isEqualTo("role-1");
        assertThat(catalog.organizationId).isEqualTo("org-a");
        assertThat(catalog.roleId).isEqualTo("role-1");
    }

    @Test
    void hidesMissingOrCrossTenantDetailBehindRoleNotAvailable() {
        var catalog = new RecordingCatalog();

        assertCode(Code.ROLE_NOT_AVAILABLE,
                () -> service(Optional.of(ACTIVE_EMPLOYEE), catalog).getTargetRole("hidden-role"));
    }

    @Test
    void rejectsBlankRoleIdBeforeCallingCatalog() {
        var catalog = new RecordingCatalog();

        assertCode(Code.INVALID_REQUEST,
                () -> service(Optional.of(ACTIVE_EMPLOYEE), catalog).getTargetRole(" "));
        assertThat(catalog.detailCalls).isZero();
    }

    @Test
    void preservesCatalogDependencyFailure() {
        var catalog = new RecordingCatalog();
        catalog.failure = new TargetRoleQueryException(Code.CATALOG_UNAVAILABLE, "catalog down");

        assertCode(Code.CATALOG_UNAVAILABLE,
                () -> service(Optional.of(ACTIVE_EMPLOYEE), catalog).listTargetRoles(null, null));
    }

    private static TargetRoleQueryService service(
            Optional<EmployeeActorContext> actor,
            TargetRoleCatalogPort catalog) {
        EmployeeContextPort employeeContext = () -> actor;
        return new TargetRoleQueryService(employeeContext, catalog);
    }

    private static TargetRoleSummary summary(String id, String name) {
        return new TargetRoleSummary(
                id, id.toUpperCase(), name, CareerTrack.PROFESSIONAL, Seniority.P3, null, 1);
    }

    private static TargetRoleDetail detail(String id) {
        return new TargetRoleDetail(
                id, "JAVA_P3", "Java Developer", "JAVA", CareerTrack.PROFESSIONAL, Seniority.P3,
                null, List.of(), List.of(new TargetRoleRequirement("skill-1", "JAVA", "Java", 0.7)));
    }

    private static void assertCode(Code expected, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(TargetRoleQueryException.class,
                        exception -> assertThat(exception.code()).isEqualTo(expected));
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private static final class RecordingCatalog implements TargetRoleCatalogPort {
        private List<TargetRoleSummary> roles = List.of();
        private Optional<TargetRoleDetail> detail = Optional.empty();
        private TargetRoleQueryException failure;
        private String organizationId;
        private Criteria criteria;
        private String roleId;
        private int listCalls;
        private int detailCalls;

        @Override
        public List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria) {
            listCalls++;
            this.organizationId = organizationId;
            this.criteria = criteria;
            if (failure != null) {
                throw failure;
            }
            return roles;
        }

        @Override
        public Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId) {
            detailCalls++;
            this.organizationId = organizationId;
            this.roleId = roleId;
            if (failure != null) {
                throw failure;
            }
            return detail;
        }
    }
}
