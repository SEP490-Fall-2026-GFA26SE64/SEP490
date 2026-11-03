package com.adaptlearngraph.dtos;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Wire shapes of the System Administrator IRT calibration API. No actor, organization or role is accepted from the
 * wire; worker lease details, run envelopes and protected item content are never returned.
 */
public final class IrtAdministrationDto {
    private IrtAdministrationDto() {
    }

    public record SourceRequest(UUID bankId, String manifestVersion, String manifestHash, String scopeHash, String ontologyHash) {}

    public record RunRequest(UUID runId, SourceRequest source, String datasetRef, String datasetHash,
                             String modelConfigurationHash, String modelParameterHash, String algorithmHash) {
        public RunRequest {
            if (source == null) throw new IllegalArgumentException("source is required");
        }
    }

    public record PromoteRequest(UUID candidateId, String parameterHash, String modelConfigurationHash, String modelParameterHash,
                                 long expectedRevision, UUID expectedParameterSetId, String reason) {}

    public record RunView(UUID runId, String status, UUID outputParameterSetId, String origin, Map<String, Object> diagnostics,
                          Instant createdAt, Instant startedAt, Instant completedAt) {}

    public record ItemPinResponse(UUID itemVersionId, UUID itemId, int version, String skillId, String contentHash) {}

    public record ItemFitResponse(ItemPinResponse pin, double a, double b, double c, int observations, int correct,
                                  double empiricalProportion, double predictedProportion, double residual, String uncertainty,
                                  boolean cEstimated) {}

    public record SkillFitResponse(String skillId, int subjects, int iterations, double initialLogLikelihood,
                                   double logLikelihood, double relativeChange, double parameterChange, boolean converged) {}

    public record ResultResponse(String origin, String algorithm, String algorithmHash, String datasetHash,
                                 String generatingHash, Long seed, List<ItemFitResponse> items, List<SkillFitResponse> skills,
                                 long objectiveEvaluations) {}

    public record CandidateView(UUID parameterSetId, UUID modelVersionId, String source, String status, String parameterHash,
                                ResultResponse diagnostics, Instant createdAt, UUID activatedBy, Instant activatedAt) {}

    public record ScopeResponse(UUID organizationId, UUID bankId, UUID modelId) {}

    public record SelectionResponse(ScopeResponse scope, long revision, UUID parameterSetId, String parameterHash, UUID actorId,
                                    Instant selectedAt) {}
}