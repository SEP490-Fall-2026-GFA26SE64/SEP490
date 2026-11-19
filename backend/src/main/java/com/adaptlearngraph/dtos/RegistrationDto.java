package com.adaptlearngraph.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request and response bodies of the organization registration API. Passwords, proofs and enrollment secrets are
 * redacted from {@code toString}; the encrypted TOTP secret, password hash and session state never reach a response.
 */
public final class RegistrationDto {
    private RegistrationDto() {}

    public static final int MAX_STRUCTURE_ROWS = 500;

    /** One row of the Departments sheet; {@code row} is the spreadsheet row number. */
    public record DepartmentSheetRow(Integer row, @Size(max = 2000) String code, @Size(max = 2000) String name,
                                     @Size(max = 2000) String description) {}

    /** One row of the Job positions sheet. */
    public record JobPositionSheetRow(Integer row, @Size(max = 2000) String departmentCode, @Size(max = 2000) String code,
                                      @Size(max = 2000) String name, @Size(max = 2000) String interestRealistic, @Size(max = 2000) String interestInvestigative, @Size(max = 2000) String interestArtistic, @Size(max = 2000) String interestSocial, @Size(max = 2000) String interestEnterprising, @Size(max = 2000) String interestConventional) {
        public JobPositionSheetRow(Integer row,String departmentCode,String code,String name){this(row,departmentCode,code,name,null,null,null,null,null,null);}
    }

    /** One row of the Target roles sheet. */
    public record TargetRoleSheetRow(Integer row, @Size(max = 2000) String jobPositionCode, @Size(max = 2000) String code,
                                     @Size(max = 2000) String name, @Size(max = 2000) String scope) {}

    /** One row of the Levels sheet; the rank stays text so non-numeric input is reported against its row. */
    public record LevelSheetRow(Integer row, @Size(max = 2000) String targetRoleCode, @Size(max = 2000) String name,
                                @Size(max = 2000) String rank) {}

    /** The four data sheets of an imported organization structure workbook. Missing lists mean empty sheets. */
    public record OrganizationStructureRequest(
            @Size(max = MAX_STRUCTURE_ROWS) List<@NotNull @Valid DepartmentSheetRow> departments,
            @Size(max = MAX_STRUCTURE_ROWS) List<@NotNull @Valid JobPositionSheetRow> jobPositions,
            @Size(max = MAX_STRUCTURE_ROWS) List<@NotNull @Valid TargetRoleSheetRow> targetRoles,
            @Size(max = MAX_STRUCTURE_ROWS) List<@NotNull @Valid LevelSheetRow> levels) {
        public boolean isEmpty() {
            return (departments == null || departments.isEmpty()) && (jobPositions == null || jobPositions.isEmpty())
                    && (targetRoles == null || targetRoles.isEmpty()) && (levels == null || levels.isEmpty());
        }
    }

    public record StructureLevelView(String code, String name, int rank) {}

    public record StructureTargetRoleView(String code, String name, String scope, List<StructureLevelView> levels) {}

    public record StructureJobPositionView(String code, String name, List<StructureTargetRoleView> targetRoles, java.util.Map<String,Integer> interestProfile) {}

    public record StructureDepartmentView(String code, String name, String description,
                                          List<StructureJobPositionView> jobPositions) {}

    public record OrganizationStructureView(int departmentCount, int jobPositionCount, int targetRoleCount, int levelCount,
                                            List<StructureDepartmentView> departments) {}

    public record SignupRequest(@NotNull @Size(max = 200) String organizationName, @Size(max = 63) String subdomain,
                                @Size(max = 100) String industry, @Size(max = 100) String headcount,
                                @NotNull @Size(max = 120) String adminName, @NotNull @Size(max = 254) String adminEmail,
                                @NotNull @Size(max = 256) String password,
                                @Valid OrganizationStructureRequest organizationStructure,
                                @Size(max = 2) String country, @NotBlank @Size(max = 40) String adminPhone,
                                @NotNull @AssertTrue Boolean policiesAccepted) {
        @Override public String toString() { return "Signup[redacted]"; }
    }

    public record SignInRequest(@NotNull @Size(max = 254) String email, @NotNull @Size(max = 256) String password) {
        @Override public String toString() { return "SignIn[redacted]"; }
    }

    public record ProofRequest(@NotNull @Size(max = 64) String code) {
        @Override public String toString() { return "Proof[redacted]"; }
    }

    public record FieldsResponse(String organizationName, String subdomain, String industry, String headcount,
                                 String adminName, String adminEmail, String country, String adminPhone) {}

    public record ViewResponse(UUID registrationId, String stage, String email, FieldsResponse fields,
                               String deliveryStatus, Instant resendAvailableAt, Instant emailVerifiedAt, Instant completedAt) {}

    /** The manual TOTP secret is intentionally shown once for authenticator setup; the encrypted copy stays server-side. */
    public record EnrollmentResponse(String manualSecret, String email) {
        @Override public String toString() { return "EnrollmentView[redacted]"; }
    }

    public record CompletionResponse(ViewResponse registration, List<String> recoveryCodes) {
        @Override public String toString() { return "CompletionView[redacted]"; }
    }
}