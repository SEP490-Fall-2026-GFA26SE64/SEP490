package com.adaptlearngraph.assessment.adaptive.api;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Explicit wire allowlists, independent of actor/tenant, protected data and legacy weight DTOs. */
public final class AdaptiveBlueprintPayloads {
    private AdaptiveBlueprintPayloads() {}

    public record BoundsRequest(@NotNull @Positive Integer maxQuestions, @NotNull @Positive Integer timeLimitSeconds) {
        Bounds domain() { return new Bounds(maxQuestions, timeLimitSeconds); }
    }
    /** Legacy fields are decode-only for exact receipt replay, never a new write contract. */
    public record ConfigurationRequest(@NotBlank String name, @Valid BoundsRequest exploration,
            Map<@NotBlank String, @NotNull @Valid BoundsRequest> roles, @Valid BoundsRequest occupationBounds) {
        Configuration domain() {
            if (occupationBounds != null) {
                if (exploration != null || roles != null) throw new IllegalArgumentException("Mixed configuration scopes");
                return Configuration.occupation(name, occupationBounds.domain());
            }
            if (exploration == null || roles == null) throw new IllegalArgumentException("Configuration bounds required");
            return new Configuration(name, exploration.domain(), roles.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().domain())));
        }
    }
    public record SaveRequest(@NotNull @Min(0) @Max(Long.MAX_VALUE - 1) Long expectedRevision,
                              @NotNull @Valid ConfigurationRequest configuration, UUID expectedWorkingRevisionId) {}
    public record TestRequest(@NotNull UUID workingRevisionId,
            @NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedWorkingRevision) {}
    public record ConvertRequest(@NotNull UUID workingRevisionId,
            @NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedWorkingRevision,
            @NotNull @Valid ConfigurationRequest configuration) {}
    public record FinalizeRequest(@NotNull UUID workingRevisionId,
            @NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedWorkingRevision,
            @NotNull @Min(0) @Max(Long.MAX_VALUE - 1) Long expectedActivationRevision, VersionId expectedCurrent) {}
    public record DisableRequest(@NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedActivationRevision,
                                 @NotBlank String reason, VersionId expectedCurrent) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ConfigurationResponse(String name, Bounds occupationBounds, Bounds exploration, Map<String, Bounds> roles) {
        static ConfigurationResponse from(Configuration configuration) {
            return configuration.occupationBounds() != null
                    ? new ConfigurationResponse(configuration.name(), configuration.occupationBounds(), null, null)
                    : new ConfigurationResponse(configuration.name(), null, configuration.exploration(), configuration.roles());
        }
    }
    public record WorkingResponse(UUID blueprintId, UUID workingRevisionId, long revision, ConfigurationResponse configuration, Instant updatedAt, boolean noOp) {
        static WorkingResponse from(WorkingRevision working) {
            return new WorkingResponse(working.blueprintId(), working.workingRevisionId(), working.revision(), ConfigurationResponse.from(working.configuration()), working.updatedAt(), false);
        }
        static WorkingResponse from(SaveResult saved) {
            var working = saved.working();
            return new WorkingResponse(working.blueprintId(), working.workingRevisionId(), working.revision(),
                    ConfigurationResponse.from(working.configuration()), working.updatedAt(), saved.noOp());
        }
    }
    public record VersionResponse(VersionId id, ConfigurationResponse configuration, String occupationName,
            String catalogFingerprint, VersionPins pins, Map<String, RoleSnapshot> roles, Instant createdAt) {
        static VersionResponse from(Version version) {
            return new VersionResponse(version.id(), ConfigurationResponse.from(version.configuration()), version.occupationNameSnapshot(),
                    version.catalogFingerprint(), version.pins(), version.roles(), version.createdAt());
        }
    }
    public record ActivationResponse(long revision, VersionId current, Instant changedAt) {
        static ActivationResponse from(Activation activation) {
            return new ActivationResponse(activation.revision(), activation.current().orElse(null), activation.changedAt());
        }
    }
    public record WorkspaceResponse(String occupationId, CatalogCapacity capacity, WorkingResponse working,
                                    VersionResponse current, ActivationResponse activation, AdmissionReadiness admissionReadiness) {
        static WorkspaceResponse from(Workspace workspace) {
            return new WorkspaceResponse(workspace.scope().occupationId(), workspace.capacity(), workspace.working().map(WorkingResponse::from).orElse(null),
                    workspace.current().map(VersionResponse::from).orElse(null), workspace.activation().map(ActivationResponse::from).orElse(null), workspace.admissionReadiness());
        }
    }
    public record ShortageResponse(String roleId, ShortageKind kind, int required, int available, String microSkillId) {
        static ShortageResponse from(Shortage shortage) {
            return new ShortageResponse(shortage.roleId().orElse(null), shortage.kind(), shortage.required(), shortage.available(),
                    shortage.microSkillId().orElse(null));
        }
    }
    public record PreviewResponse(boolean feasible, List<ShortageResponse> shortages, List<SampleItem> sample) {
        static PreviewResponse from(Preview preview) {
            return new PreviewResponse(preview.feasible(), preview.shortages().stream().map(ShortageResponse::from).toList(), preview.sample());
        }
    }
    public record ApiError(String code, String message, List<ShortageResponse> shortages) {}
}
