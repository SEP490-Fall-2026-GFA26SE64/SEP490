package com.adaptlearngraph.assessment.adaptive.calibration.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Immutable calibration values. Protected content is confined to Item, never a public run projection. */
public final class Calibration {
    private Calibration() {}
    public enum Origin { SYNTHETIC, ACTUAL_PILOT }
    public enum Status { PENDING, RUNNING, SUCCEEDED, FAILED }
    public enum Code { INVALID_INPUT, FORBIDDEN, UNAUTHENTICATED, NOT_FOUND, CONFLICT, DEPENDENCY_UNAVAILABLE,
        TIMEOUT, CANCELLED, RESOURCE_LIMIT, NON_CONVERGENCE, DEGENERATE_ITEM, BOUNDARY, NUMERICAL_FAILURE, NOT_READY }
    public static final class Failure extends RuntimeException {
        private final Code code;
        private final Map<String,Object> details;
        public Failure(Code code) { this(code,Map.of()); }
        public Failure(Code code,Map<String,Object> details) { super("Calibration: " + code); this.code = code; this.details=Map.copyOf(details); }
        public Code code() { return code; }
        public Map<String,Object> details() { return details; }
    }
    public record Scope(UUID organizationId, UUID bankId, UUID modelId) {
        public Scope { id(organizationId); id(bankId); id(modelId); }
    }
    public record Source(UUID bankId, String manifestVersion, String manifestHash, String scopeHash, String ontologyHash) {
        public Source { id(bankId); text(manifestVersion); hash(manifestHash); hash(scopeHash); hash(ontologyHash); }
    }
    public record ModelPin(UUID modelId,String algorithm,String version,String parameterHash,String configurationHash,
                           String artifactRef,UUID approvedBy,Instant approvedAt) {
        public ModelPin {
            id(modelId); text(algorithm); text(version); hash(parameterHash); hash(configurationHash); text(artifactRef);
            require((approvedBy==null)==(approvedAt==null));
        }
    }
    public record ItemPin(UUID itemVersionId, UUID itemId, int version, String skillId, String contentHash) {
        public ItemPin { id(itemVersionId); id(itemId); require(version > 0); text(skillId); hash(contentHash); }
    }
    public record Item(ItemPin pin, List<String> optionIds, String answer) {
        public Item {
            Objects.requireNonNull(pin); optionIds = List.copyOf(optionIds);
            require(optionIds.size() == 4 && optionIds.stream().distinct().count() == 4 && optionIds.contains(answer));
        }
    }
    public record Bank(Source source, List<Item> items) {
        public Bank {
            Objects.requireNonNull(source); items = List.copyOf(items);
            require(items.size() == 135 && items.stream().map(i -> i.pin().itemVersionId()).distinct().count() == 135);
            var counts = items.stream().collect(java.util.stream.Collectors.groupingBy(i -> i.pin().skillId(), java.util.stream.Collectors.counting()));
            require(counts.size() == 15 && counts.values().stream().allMatch(n -> n == 9));
        }
        public List<ItemPin> pins() { return items.stream().map(Item::pin).toList(); }
    }
    public record Subject(String token, List<String> options) {
        public Subject { text(token); require(token.length() <= 100); options = List.copyOf(options); }
    }
    public record SkillResponses(String skillId, List<UUID> itemVersions, List<Subject> subjects) {
        public SkillResponses { text(skillId); itemVersions = List.copyOf(itemVersions); subjects = List.copyOf(subjects); }
    }
    public record Dataset(Origin origin, String generator, Long seed, String generatingHash, List<SkillResponses> skills) {
        public Dataset {
            Objects.requireNonNull(origin); text(generator); hash(generatingHash); skills = List.copyOf(skills);
            require(origin != Origin.SYNTHETIC || seed != null);
        }
    }
    public record ItemFit(ItemPin pin, double a, double b, double c, int observations, int correct,
                          double empiricalProportion, double predictedProportion, double residual,
                          String uncertainty, boolean cEstimated) {
        public ItemFit {
            Objects.requireNonNull(pin); finite(a,b,c,empiricalProportion,predictedProportion,residual);
            require(a > 0 && c >= 0 && c < 1 && observations > 0 && correct >= 0 && correct <= observations);
            text(uncertainty);
        }
    }
    public record SkillFit(String skillId, int subjects, int iterations, double initialLogLikelihood,
                           double logLikelihood, double relativeChange, double parameterChange, boolean converged) {
        public SkillFit { text(skillId); finite(initialLogLikelihood,logLikelihood,relativeChange,parameterChange); }
    }
    public record Result(Origin origin, String algorithm, String algorithmHash, String datasetHash,
                         String generatingHash, Long seed, List<ItemFit> items, List<SkillFit> skills,
                         long objectiveEvaluations) {
        public Result {
            Objects.requireNonNull(origin); text(algorithm); hash(algorithmHash); hash(datasetHash); hash(generatingHash);
            items = List.copyOf(items); skills = List.copyOf(skills);
        }
    }
    public record Request(UUID runId, Scope scope, Source source, String datasetRef, String datasetHash,
                          String modelConfigurationHash, String modelParameterHash, String algorithmHash) {
        public Request {
            id(runId); Objects.requireNonNull(scope); Objects.requireNonNull(source);
            require(scope.bankId().equals(source.bankId())); text(datasetRef); require(datasetRef.length() <= 200);
            hash(datasetHash); hash(modelConfigurationHash); hash(modelParameterHash); hash(algorithmHash);
        }
    }
    public record Input(Bank bank, Dataset dataset, String datasetHash, String modelConfigurationHash, String modelParameterHash,ModelPin modelPin) {
        public Input { Objects.requireNonNull(bank); Objects.requireNonNull(dataset); hash(datasetHash); hash(modelConfigurationHash); hash(modelParameterHash); Objects.requireNonNull(modelPin); }
    }
    public record Envelope(int formatVersion, UUID actorId, Request request, List<ItemPin> itemPins,
                           Origin origin, String generatingHash, Long seed,ModelPin modelPin) {
        public Envelope {
            require(formatVersion == 1); id(actorId); Objects.requireNonNull(request); itemPins = List.copyOf(itemPins);
            Objects.requireNonNull(origin); hash(generatingHash); require(origin != Origin.SYNTHETIC || seed != null);
            Objects.requireNonNull(modelPin);
            require(modelPin.modelId().equals(request.scope().modelId()) && modelPin.configurationHash().equals(request.modelConfigurationHash())
                    && modelPin.parameterHash().equals(request.modelParameterHash()));
        }
    }
    public record Run(UUID id, Envelope envelope, Status status, UUID outputId, Map<String,Object> diagnostics,
                      Instant createdAt, Instant startedAt, Instant completedAt) {
        public Run { Calibration.id(id); Objects.requireNonNull(envelope); Objects.requireNonNull(status); diagnostics = Map.copyOf(diagnostics); }
    }
    public record Candidate(UUID id, UUID modelId, String source, String status, String parameterHash, Result result, Envelope envelope,
                            Instant createdAt, UUID activatedBy, Instant activatedAt) {
        public Candidate { Calibration.id(id); Calibration.id(modelId); text(source); text(status); hash(parameterHash); Objects.requireNonNull(result); }
    }
    public static void require(boolean valid) { if (!valid) throw new Failure(Code.INVALID_INPUT); }
    public static void text(String value) { require(value != null && !value.isBlank() && value.equals(value.strip())); }
    public static void hash(String value) { require(value != null && value.matches("[0-9a-f]{64}")); }
    public static void id(UUID value) { require(value != null && !value.equals(new UUID(0,0))); }
    public static void finite(double... values) { for (double v : values) if (!Double.isFinite(v)) throw new Failure(Code.NUMERICAL_FAILURE); }
}
