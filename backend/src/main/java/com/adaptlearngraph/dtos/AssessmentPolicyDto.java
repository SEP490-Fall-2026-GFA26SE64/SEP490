package com.adaptlearngraph.dtos;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Wire shapes of the own-organization adaptive baseline policy API. */
public final class AssessmentPolicyDto {
    private AssessmentPolicyDto() {
    }

    public record SaveRequest(UUID commandKey, double stopSe, double highConfidenceSe, double mediumConfidenceSe, double k) {}

    public record ActivateRequest(UUID commandKey, UUID policyVersionId, long expectedActivationRevision) {}

    public record ValuesResponse(double stopSe, double highConfidenceSe, double mediumConfidenceSe, double k) {}

    public record PinResponse(UUID organizationId, UUID versionId, String hash, ValuesResponse values) {}

    public record VersionResponse(PinResponse pin, long version, UUID createdBy, Instant createdAt) {}

    public record StateResponse(VersionResponse active, long activationRevision) {}

    public record PageResponse(List<VersionResponse> items, long total, int page, int size) {}

    public record SavedResponse(VersionResponse version, boolean noOp) {}
}