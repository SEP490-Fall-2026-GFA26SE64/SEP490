package com.adaptlearngraph.dtos;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Wire shapes of the L&amp;D baseline blueprint and baseline assessment management APIs. Blueprint audit identity
 * (creator, idempotency key, request hash) and the assessment generation request hash and creator are never returned;
 * protected answer keys are not part of any assessment item response.
 */
public final class BaselineAuthoringDto {
    private BaselineAuthoringDto() {
    }

    public record SkillRequest(
            @NotBlank String microSkillId,
            @NotBlank String microSkillNameSnapshot,
            @Min(0) int easyQuestionCount,
            @Min(0) int mediumQuestionCount,
            @Min(0) int hardQuestionCount) {}

    public record RoleRequest(
            @NotBlank String roleId,
            @NotBlank String roleNameSnapshot,
            boolean enabled,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal easyScoreWeight,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal mediumScoreWeight,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal hardScoreWeight,
            @NotEmpty List<@Valid SkillRequest> skills) {}

    public record SaveWorkingRequest(
            @Min(1) long expectedRevision,
            @NotBlank String name,
            @NotBlank String jobPositionId,
            @NotBlank String jobPositionNameSnapshot,
            @NotEmpty List<@Valid RoleRequest> roles) {}

    public record CreateRequest(
            @NotBlank String name,
            String jobPositionId,
            String jobPositionNameSnapshot,
            @NotEmpty List<@Valid RoleRequest> roles) {}

    public record ReviseRequest(
            @Min(1) int expectedLatestVersion,
            @NotBlank String name,
            String jobPositionId,
            String jobPositionNameSnapshot,
            @NotEmpty List<@Valid RoleRequest> roles) {}

    public record ExpectedRevisionRequest(@Min(1) long expectedRevision) {}

    public record EditManifestRequest(
            @Min(1) long expectedRevision,
            @NotBlank String title,
            @NotEmpty List<@NotNull UUID> orderedItemVersionIds) {}

    public record ContentHashRequest(@NotBlank String contentHash) {}

    public record ReasonRequest(@NotBlank String reason) {}

    public record SkillConfigResponse(
            String microSkillId,
            String microSkillNameSnapshot,
            int easyQuestionCount,
            int mediumQuestionCount,
            int hardQuestionCount) {}

    /** Management projection of a role configuration (no derived totals). */
    public record RoleConfigResponse(
            String roleId,
            String roleNameSnapshot,
            boolean enabled,
            BigDecimal easyScoreWeight,
            BigDecimal mediumScoreWeight,
            BigDecimal hardScoreWeight,
            List<SkillConfigResponse> skills) {}

    /** Legacy blueprint API projection of a role configuration, including its total question count. */
    public record RoleResponse(
            String roleId,
            String roleNameSnapshot,
            boolean enabled,
            int totalQuestionCount,
            BigDecimal easyScoreWeight,
            BigDecimal mediumScoreWeight,
            BigDecimal hardScoreWeight,
            List<SkillConfigResponse> skills) {}

    /** Legacy blueprint API response. */
    public record BlueprintResponse(
            UUID blueprintId,
            int version,
            String name,
            String jobPositionId,
            String jobPositionNameSnapshot,
            Instant createdAt,
            List<RoleResponse> roles) {}

    /** Management API response for a finalized blueprint version. */
    public record ManagedBlueprintResponse(
            UUID blueprintId,
            int version,
            String name,
            String jobPositionId,
            String jobPositionNameSnapshot,
            Instant createdAt,
            List<RoleConfigResponse> roles) {}

    public record AssessmentItemResponse(
            int position,
            UUID itemVersionId,
            String roleId,
            String roleNameSnapshot,
            String microSkillId,
            String microSkillNameSnapshot,
            String difficulty,
            BigDecimal scoringWeight,
            String prompt,
            JsonNode responseSchema) {}

    /** Legacy blueprint API assessment draft, including generation seed and review metadata. */
    public record AssessmentDraftResponse(
            UUID assessmentVersionId,
            UUID assessmentId,
            int version,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            long generationSeed,
            Instant createdAt,
            String contentHash,
            long draftRevision,
            String publicationState,
            UUID reviewedBy,
            Instant reviewedAt,
            String reviewedContentHash,
            List<AssessmentItemResponse> items) {}

    /** Management API assessment version; generation seed and actor metadata are not returned. */
    public record ManagedAssessmentResponse(
            UUID assessmentVersionId,
            UUID assessmentId,
            int version,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            Instant createdAt,
            String contentHash,
            long draftRevision,
            String publicationState,
            Instant reviewedAt,
            List<AssessmentItemResponse> items) {}

    public record BlueprintDraftResponse(
            String name,
            String jobPositionId,
            String jobPositionNameSnapshot,
            List<RoleConfigResponse> roles) {}

    public record WorkingRevisionResponse(
            UUID workingRevisionId,
            UUID blueprintId,
            Integer baseVersion,
            long revision,
            BlueprintDraftResponse draft,
            Instant updatedAt) {}

    public record SeriesScopeResponse(UUID organizationId, String jobPositionId) {}

    public record BlueprintVersionRefResponse(UUID blueprintId, int version) {}

    public record AssessmentVersionRefResponse(
            UUID assessmentVersionId, int version, BlueprintVersionRefResponse blueprint) {}

    public record OpenCandidateResponse(
            AssessmentVersionRefResponse assessment, String state, long draftRevision, String contentHash) {}

    public record ActiveReleaseResponse(AssessmentVersionRefResponse assessment) {}

    public record SeriesSnapshotResponse(
            SeriesScopeResponse scope,
            UUID blueprintId,
            long seriesRevision,
            UUID workingRevisionId,
            BlueprintVersionRefResponse pendingBlueprint,
            OpenCandidateResponse openCandidate,
            ActiveReleaseResponse activeRelease) {}

    public record BlueprintVersionSummaryResponse(
            UUID blueprintId, int version, String name, String projection, Instant createdAt) {}

    public record AssessmentVersionSummaryResponse(
            UUID assessmentVersionId,
            int version,
            int blueprintVersion,
            String effectiveState,
            String contentHash,
            Instant createdAt) {}

    public record WorkspaceResponse(
            String jobPositionId,
            String jobPositionName,
            SeriesSnapshotResponse lifecycle,
            WorkingRevisionResponse workingRevision,
            List<BlueprintVersionSummaryResponse> blueprintVersions,
            List<AssessmentVersionSummaryResponse> assessmentVersions) {}
}