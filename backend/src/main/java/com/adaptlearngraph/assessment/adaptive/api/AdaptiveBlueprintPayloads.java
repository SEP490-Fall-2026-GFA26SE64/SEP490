package com.adaptlearngraph.assessment.adaptive.api;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
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
    public record ConfigurationRequest(@NotBlank String name, @NotNull @Valid BoundsRequest exploration,
            @NotEmpty Map<@NotBlank String, @NotNull @Valid BoundsRequest> roles) {
        Configuration domain() {
            return new Configuration(name, exploration.domain(), roles.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().domain())));
        }
    }
    public record SaveRequest(@NotNull @Min(0) @Max(Long.MAX_VALUE - 1) Long expectedRevision,
                              @NotNull @Valid ConfigurationRequest configuration) {}
    public record TestRequest(@NotNull @Valid ConfigurationRequest configuration) {}
    public record FinalizeRequest(@NotNull UUID workingRevisionId,
            @NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedWorkingRevision,
            @NotNull @Min(0) @Max(Long.MAX_VALUE - 1) Long expectedActivationRevision) {}
    public record DisableRequest(@NotNull @Positive @Max(Long.MAX_VALUE - 1) Long expectedActivationRevision, @NotBlank String reason) {}

    public record WorkingResponse(UUID blueprintId, UUID workingRevisionId, long revision, Configuration configuration, Instant updatedAt) {
        static WorkingResponse from(WorkingRevision working) {
            return new WorkingResponse(working.blueprintId(), working.workingRevisionId(), working.revision(), working.configuration(), working.updatedAt());
        }
    }
    public record VersionResponse(VersionId id, Configuration configuration, String occupationName,
            String catalogFingerprint, VersionPins pins, Map<String, RoleSnapshot> roles, Instant createdAt) {
        static VersionResponse from(Version version) {
            return new VersionResponse(version.id(), version.configuration(), version.occupationNameSnapshot(),
                    version.catalogFingerprint(), version.pins(), version.roles(), version.createdAt());
        }
    }
    public record ActivationResponse(long revision, VersionId current, Instant changedAt) {
        static ActivationResponse from(Activation activation) {
            return new ActivationResponse(activation.revision(), activation.current().orElse(null), activation.changedAt());
        }
    }
    public record WorkspaceResponse(String occupationId, CatalogCapacity capacity, WorkingResponse working,
                                    VersionResponse current, ActivationResponse activation) {
        static WorkspaceResponse from(Workspace workspace) {
            return new WorkspaceResponse(workspace.scope().occupationId(), workspace.capacity(), workspace.working().map(WorkingResponse::from).orElse(null),
                    workspace.current().map(VersionResponse::from).orElse(null), workspace.activation().map(ActivationResponse::from).orElse(null));
        }
    }
    public record ShortageResponse(String roleId, ShortageKind kind, int required, int available) {
        static ShortageResponse from(Shortage shortage) {
            return new ShortageResponse(shortage.roleId().orElse(null), shortage.kind(), shortage.required(), shortage.available());
        }
    }
    public record PreviewResponse(boolean feasible, List<ShortageResponse> shortages, List<SampleItem> sample) {
        static PreviewResponse from(Preview preview) {
            return new PreviewResponse(preview.feasible(), preview.shortages().stream().map(ShortageResponse::from).toList(), preview.sample());
        }
    }
    public record ApiError(String code, String message, List<ShortageResponse> shortages) {}
}
