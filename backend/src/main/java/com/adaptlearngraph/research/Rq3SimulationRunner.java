package com.adaptlearngraph.research;

import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RequirementPathway;
import com.adaptlearngraph.entities.domain.RequirementPathway.Dependency;
import com.adaptlearngraph.entities.domain.RequirementPathway.Kind;
import com.adaptlearngraph.entities.domain.RequirementPathway.Plan;
import com.adaptlearngraph.entities.domain.RequirementPathway.Provision;
import com.adaptlearngraph.entities.domain.RequirementPathway.State;
import com.adaptlearngraph.entities.domain.RequirementPathway.Step;
import com.adaptlearngraph.entities.domain.RuleAssessment;
import com.adaptlearngraph.entities.domain.RuleAssessment.Candidate;
import com.adaptlearngraph.entities.domain.RuleAssessment.Group;
import com.adaptlearngraph.entities.domain.RuleAssessment.GroupResult;
import com.adaptlearngraph.entities.domain.RuleAssessment.GroupRole;
import com.adaptlearngraph.entities.domain.RuleAssessment.GroupRule;
import com.adaptlearngraph.entities.domain.RuleAssessment.Paper;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.entities.domain.RuleAssessmentDecision;
import com.adaptlearngraph.repository.RulePathwayCatalog;
import com.adaptlearngraph.services.RequirementPathwayGenerationService;
import com.adaptlearngraph.services.RequirementPathwayPlanningService;
import com.adaptlearngraph.services.RequirementPathwayRecalculationService;
import com.adaptlearngraph.services.RequirementPathwayRecalculationService.FailedPrerequisite;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

/**
 * Deterministic RQ3 simulation comparing S0 (static), A0 (adaptive recalculation) and S1 (upfront prerequisite static).
 *
 * <p>All three policies walk the same {@link RequirementPathway.Plan} value with the same shared selection rule and the
 * same evidence evaluator ({@link RuleAssessment#score} and {@link RuleAssessmentDecision#decide}). Every policy's plan is
 * refreshed through the runtime per-step transition ({@link RequirementPathwayGenerationService#step} and
 * {@link RequirementPathwayPlanningService#refreshedStep}); only A0 additionally applies the runtime supplementation
 * transition {@link RequirementPathwayRecalculationService#supplement} after each skill assessment. The research adapter
 * supplies isolated catalog/evidence snapshots in place of the JPA and graph stores; it does not reimplement the
 * transitions. Hidden learner state is visible to the simulator only and is written to a separate evaluator artifact.
 */
public final class Rq3SimulationRunner {
    public static final long BASE_SEED = 20261125L;
    public static final int DEFAULT_REPLICATES = 30;
    public static final int DEFAULT_BUDGET = 40;
    public static final String RUN_ID = "20261125-r2-runtime-parity";
    public static final String EXPERIMENT_ID = "rq3-pilot100-" + RUN_ID;
    public static final List<String> POLICIES = List.of("S0", "A0", "S1");
    private static final String DEFAULT_VERSION = "research-ad-0.1";
    private static final Instant FIXED_START = Instant.parse("2026-11-25T00:00:00Z");
    private static final double EPS = 1e-9;

    /** Engine and simulator sources whose SHA-256 hashes are stored with every report. */
    public static final List<String> ENGINE_SOURCES = List.of(
            "backend/src/main/java/com/adaptlearngraph/research/Rq3SimulationRunner.java",
            "backend/src/main/java/com/adaptlearngraph/research/Rq3Distance.java",
            "backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayRecalculationService.java",
            "backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayPlanningService.java",
            "backend/src/main/java/com/adaptlearngraph/services/RequirementPathwayGenerationService.java",
            "backend/src/main/java/com/adaptlearngraph/entities/domain/RequirementPathway.java",
            "backend/src/main/java/com/adaptlearngraph/entities/domain/RuleAssessment.java",
            "backend/src/main/java/com/adaptlearngraph/entities/domain/RuleAssessmentDecision.java");
    public static final List<String> INPUT_FILES = List.of(
            "documents/research/data/rq3/pilot-v0.1/profiles.jsonl",
            "documents/research/data/rq3/pilot-v0.1/manifest.json",
            "documents/research/data/rq1/application-developer-v0.1/prerequisites.json",
            "documents/research/data/rq1/application-developer-v0.1/teaching-bindings.json",
            "documents/research/data/rq1/application-developer-v0.1/modules.json");

    /**
     * Frozen simulator parameters. Costs are standardized activity units. {@code equalKnowledge} gives every
     * requirement without official evidence the same initial hidden knowledge (control condition).
     */
    public record SimParams(double eta, double guess, double slip, double lambda, int budget,
                            double learningCost, double assessmentCost, boolean equalKnowledge) {
        public SimParams {
            if (budget <= 0 || budget % 4 != 0) throw new IllegalArgumentException("Budget must be a positive multiple of 4");
            if (learningCost <= 0 || assessmentCost <= 0) throw new IllegalArgumentException("No zero-cost actions");
        }
        public static SimParams defaults() {
            return new SimParams(0.20, 0.20, 0.10, 0.50, DEFAULT_BUDGET, 1.0, 1.0, false);
        }
        public SimParams with(double eta, double lambda, int budget, double assessmentCost, boolean equalKnowledge) {
            return new SimParams(eta, guess, slip, lambda, budget, learningCost, assessmentCost, equalKnowledge);
        }
        public List<Integer> checkpoints() {
            return List.of(0, budget / 4, budget / 2, 3 * budget / 4, budget);
        }
    }

    public record ReqSpec(String skillId, KnowledgeLevel level, String version) implements Comparable<ReqSpec> {
        public String key() {
            return skillId + "|" + level.name();
        }
        public RequirementPathway.Requirement toPathwayReq() {
            return new RequirementPathway.Requirement(skillId, skillId, level, version, List.of(), Provision.MODULE_ONLY);
        }
        public RuleAssessment.Requirement toAssessmentReq() {
            return new RuleAssessment.Requirement(skillId, level, List.of("OUT-1"));
        }
        @Override
        public int compareTo(ReqSpec o) {
            return this.key().compareTo(o.key());
        }
    }

    public record ProfileInput(
            String profileId,
            String roleLevel,
            String gapBand,
            String evidenceHistoryStratum,
            List<ReqSpec> targetRequirements,
            List<ReqSpec> officialEvidence,
            List<ReqSpec> learningNeeds,
            Set<String> baselineExemptKeys
    ) {}

    /** Receives policy-facing events and, separately, evaluator-only hidden-state events. */
    public interface EventSink {
        void policyEvent(Map<String, Object> event);
        void hiddenEvent(Map<String, Object> event);
        EventSink NONE = new EventSink() {
            @Override public void policyEvent(Map<String, Object> event) {}
            @Override public void hiddenEvent(Map<String, Object> event) {}
        };
    }

    public record PolicySingleRun(
            Map<Integer, Double> targetDistanceByCheckpoint,
            Map<Integer, Double> gapDistanceByCheckpoint,
            double finalTargetDistance,
            double finalGapDistance,
            boolean pathwayReleased,
            Double releasedAtCost,
            Double targetAchievedAtCost,
            Double gapClosedAtCost,
            double budgetUsed,
            int learningActions,
            int assessmentAttempts,
            int retakes,
            int failedAttempts,
            int distinctRemedialRequirements,
            int distinctAssignedModules,
            int reviewEvents,
            String stopReason
    ) {}

    public record ProfileSummary(
            String profileId,
            String roleLevel,
            String gapBand,
            String evidenceHistoryStratum,
            int targetRequirementCount,
            int initialOfficialCount,
            int baselineExemptCount,
            int initialGapCount,
            int unachievedPrerequisiteCount,
            double baselineTargetDistance,
            Map<Integer, Double> s0TargetTrajectory,
            Map<Integer, Double> a0TargetTrajectory,
            Map<Integer, Double> s1TargetTrajectory,
            Map<Integer, Double> s0GapTrajectory,
            Map<Integer, Double> a0GapTrajectory,
            Map<Integer, Double> s1GapTrajectory,
            double s0FinalTargetDistance,
            double a0FinalTargetDistance,
            double s1FinalTargetDistance,
            double deltaTargetDistanceA0vsS0,
            double deltaTargetDistanceA0vsS1,
            double s0FinalGapDistance,
            double a0FinalGapDistance,
            double s1FinalGapDistance,
            double deltaGapDistanceA0vsS0,
            double s0ReleaseRate,
            double a0ReleaseRate,
            double s1ReleaseRate,
            double s0MeanBudgetUsed,
            double a0MeanBudgetUsed,
            double s1MeanBudgetUsed,
            double s0MeanLearningActions,
            double a0MeanLearningActions,
            double s1MeanLearningActions,
            double s0MeanAssessments,
            double a0MeanAssessments,
            double s1MeanAssessments,
            double a0MeanSupplements,
            Map<String, Integer> s0StopReasons,
            Map<String, Integer> a0StopReasons,
            Map<String, Integer> s1StopReasons
    ) {}

    public record BootstrapInterval(double mean, double ci95Low, double ci95High, double stdErr) {}

    public record StratumSummary(
            String stratumKey,
            int profileCount,
            double baselineTargetDistance,
            double s0FinalTargetDistance,
            double a0FinalTargetDistance,
            double s1FinalTargetDistance,
            double deltaTargetDistance,
            double s0FinalGapDistance,
            double a0FinalGapDistance,
            double s1FinalGapDistance,
            double deltaGapDistance,
            double s0ReleaseRate,
            double a0ReleaseRate,
            double s1ReleaseRate
    ) {}

    /**
     * Secondary outcomes for one policy over all learner-replicate runs. Cost-to-attainment is right-censored at the
     * budget: {@code restrictedMeanCost*} charges the budget to runs that never attained, while
     * {@code meanCostAmongAttainers*} is a descriptive, selected subset only.
     */
    public record PolicyOutcomes(
            String policy,
            int runs,
            double proportionTargetDistanceZero,
            double proportionInitialGapClosed,
            double releaseRate,
            int gapClosedCount,
            int gapCensoredCount,
            double restrictedMeanCostToGapClosure,
            Double meanCostAmongGapAttainers,
            int releasedCount,
            int releaseCensoredCount,
            double restrictedMeanCostToRelease,
            double meanBudgetUsed,
            double meanLearningActions,
            double meanAssessmentAttempts,
            double meanRetakes,
            double meanFailedAttempts,
            double meanDistinctRemedialRequirements,
            double meanDistinctAssignedModules,
            double meanReviewEvents,
            Map<String, Integer> stopReasons
    ) {}

    /** Paired cost among learner-replicate runs where both policies closed the initial gap within budget. */
    public record PairedCompleteCase(String comparison, int pairs, int totalPairs, double meanCostFirst, double meanCostSecond) {}

    public record SensitivityRow(
            String label,
            double eta,
            double lambda,
            double assessmentCost,
            int budget,
            boolean equalKnowledge,
            double s0FinalTargetDistance,
            double a0FinalTargetDistance,
            double s1FinalTargetDistance,
            double deltaTargetDistanceA0vsS0,
            double deltaTargetCi95Low,
            double deltaTargetCi95High,
            double deltaTargetDistanceA0vsS1,
            double s0FinalGapDistance,
            double a0FinalGapDistance,
            double deltaGapDistanceA0vsS0,
            double s0ReleaseRate,
            double a0ReleaseRate,
            double s1ReleaseRate
    ) {}

    public record ExperimentReport(
            String experimentId,
            long baseSeed,
            int replicates,
            int profileCount,
            int budget,
            List<Integer> checkpoints,
            SimParams primaryParameters,
            String engineBoundary,
            Map<String, String> engineSourceSha256,
            Map<String, String> inputSha256,
            Map<Integer, Double> s0MeanTargetTrajectory,
            Map<Integer, Double> a0MeanTargetTrajectory,
            Map<Integer, Double> s1MeanTargetTrajectory,
            Map<Integer, Double> s0MeanGapTrajectory,
            Map<Integer, Double> a0MeanGapTrajectory,
            Map<Integer, Double> s1MeanGapTrajectory,
            BootstrapInterval deltaTargetDistanceA0vsS0,
            BootstrapInterval deltaTargetDistanceA0vsS1,
            BootstrapInterval deltaGapDistanceA0vsS0,
            int a0WinsOverS0,
            int a0TiesWithS0,
            int a0LossesToS0,
            double s0ReleaseRate,
            double a0ReleaseRate,
            double s1ReleaseRate,
            double s0MeanBudgetUsed,
            double a0MeanBudgetUsed,
            double s1MeanBudgetUsed,
            double s0MeanLearningActions,
            double a0MeanLearningActions,
            double s1MeanLearningActions,
            double s0MeanAssessments,
            double a0MeanAssessments,
            double s1MeanAssessments,
            double a0MeanSupplementedPrerequisites,
            List<PolicyOutcomes> secondaryOutcomes,
            List<PairedCompleteCase> pairedCompleteCaseCost,
            List<StratumSummary> byRoleLevel,
            List<StratumSummary> byGapBand,
            List<StratumSummary> byEvidenceHistory,
            List<StratumSummary> byPrerequisiteExposure,
            List<SensitivityRow> sensitivityGrid,
            List<ProfileSummary> profiles
    ) {}

    private final List<ProfileInput> profiles;
    private final Map<String, List<ReqSpec>> prerequisiteMap;
    private final Set<ReqSpec> allCatalogRequirements;
    private final RulePathwayCatalog.Snapshot catalog;
    private final Map<String, String> engineSourceSha256;
    private final Map<String, String> inputSha256;

    public Rq3SimulationRunner(List<ProfileInput> profiles, Map<String, List<ReqSpec>> prerequisiteMap,
                               Map<String, List<RequirementPathway.Option>> moduleOptions,
                               Map<String, String> engineSourceSha256, Map<String, String> inputSha256) {
        this.profiles = List.copyOf(profiles);
        var copy = new LinkedHashMap<String, List<ReqSpec>>();
        prerequisiteMap.forEach((k, v) -> copy.put(k, List.copyOf(v)));
        this.prerequisiteMap = Collections.unmodifiableMap(copy);
        var all = new TreeSet<ReqSpec>();
        for (var p : profiles) {
            all.addAll(p.targetRequirements());
            all.addAll(p.officialEvidence());
            all.addAll(p.learningNeeds());
        }
        prerequisiteMap.values().forEach(all::addAll);
        for (String k : prerequisiteMap.keySet()) {
            String[] parts = k.split("\\|");
            all.add(new ReqSpec(parts[0], KnowledgeLevel.valueOf(parts[1]), DEFAULT_VERSION));
        }
        this.allCatalogRequirements = Collections.unmodifiableSet(all);
        this.catalog = new RulePathwayCatalog.Snapshot("rq3-research-snapshot",
                all.stream().map(ReqSpec::toPathwayReq).toList(), moduleOptions, Map.of());
        this.engineSourceSha256 = Collections.unmodifiableMap(new TreeMap<>(engineSourceSha256));
        this.inputSha256 = Collections.unmodifiableMap(new TreeMap<>(inputSha256));
    }

    public List<ProfileInput> profiles() {
        return profiles;
    }

    public Rq3SimulationRunner subset(int count) {
        return new Rq3SimulationRunner(profiles.subList(0, Math.min(count, profiles.size())), prerequisiteMap,
                catalog.options(), engineSourceSha256, inputSha256);
    }

    public static Rq3SimulationRunner fromWorkspace(Path repoRoot) throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        Path profilesPath = repoRoot.resolve(INPUT_FILES.get(0));
        Path prereqsPath = repoRoot.resolve(INPUT_FILES.get(2));
        Path bindingsPath = repoRoot.resolve(INPUT_FILES.get(3));
        Path modulesPath = repoRoot.resolve(INPUT_FILES.get(4));

        Map<String, List<ReqSpec>> prereqMap = new LinkedHashMap<>();
        for (JsonNode node : mapper.readTree(Files.readString(prereqsPath))) {
            String depKey = node.get("dependentSkillId").asText() + "|" + node.get("dependentKnowledgeLevel").asText();
            ReqSpec pre = new ReqSpec(
                    node.get("prerequisiteSkillId").asText(),
                    KnowledgeLevel.valueOf(node.get("prerequisiteKnowledgeLevel").asText()),
                    node.path("skillVersion").asText(DEFAULT_VERSION));
            prereqMap.computeIfAbsent(depKey, k -> new ArrayList<>()).add(pre);
        }
        prereqMap.replaceAll((k, list) -> list.stream().distinct().sorted().toList());

        Map<String, JsonNode> modulesById = new HashMap<>();
        for (JsonNode module : mapper.readTree(Files.readString(modulesPath))) modulesById.put(module.get("id").asText(), module);
        Map<String, List<RequirementPathway.Option>> options = new TreeMap<>();
        for (JsonNode binding : mapper.readTree(Files.readString(bindingsPath))) {
            JsonNode module = modulesById.get(binding.get("moduleId").asText());
            if (module == null) continue;
            String key = binding.get("skillId").asText() + "\n" + binding.get("knowledgeLevel").asText();
            List<String> outcomes = new ArrayList<>();
            binding.path("outcomeCodes").forEach(code -> outcomes.add(code.asText()));
            options.computeIfAbsent(key, k -> new ArrayList<>()).add(new RequirementPathway.Option(
                    module.get("id").asText(), module.path("revision").asInt(1), module.path("contentVersion").asText(DEFAULT_VERSION),
                    module.path("title").asText(), outcomes, binding.path("skillVersion").asText(DEFAULT_VERSION)));
        }
        options.replaceAll((k, list) -> list.stream().sorted(Comparator.comparing(RequirementPathway.Option::moduleId)).toList());

        List<ProfileInput> loadedProfiles = new ArrayList<>();
        for (String line : Files.readAllLines(profilesPath)) {
            if (line.isBlank()) continue;
            JsonNode node = mapper.readTree(line);
            Set<String> exempt = new TreeSet<>();
            for (JsonNode st : node.get("requirementStates")) {
                if ("BASELINE_EXEMPT".equals(st.path("state").asText())) {
                    exempt.add(st.get("skillId").asText() + "|" + st.get("knowledgeLevel").asText());
                }
            }
            loadedProfiles.add(new ProfileInput(
                    node.get("profileId").asText(),
                    node.get("roleLevel").asText(),
                    node.get("gapBand").asText(),
                    node.get("evidenceHistoryStratum").asText(),
                    parseReqs(node.get("targetRequirements")),
                    parseReqs(node.get("officialEvidence")),
                    parseReqs(node.get("learningNeeds")),
                    Collections.unmodifiableSet(exempt)));
        }
        Map<String, String> engine = new TreeMap<>();
        for (String source : ENGINE_SOURCES) engine.put(source, sha256File(repoRoot.resolve(source)));
        Map<String, String> inputs = new TreeMap<>();
        for (String input : INPUT_FILES) inputs.put(input, sha256File(repoRoot.resolve(input)));
        return new Rq3SimulationRunner(loadedProfiles, prereqMap, options, engine, inputs);
    }

    private static List<ReqSpec> parseReqs(JsonNode arr) {
        List<ReqSpec> list = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode n : arr) {
                list.add(new ReqSpec(
                        n.get("skillId").asText(),
                        KnowledgeLevel.valueOf(n.get("knowledgeLevel").asText()),
                        n.path("skillVersion").asText(DEFAULT_VERSION)));
            }
        }
        return list.stream().sorted().toList();
    }

    static String sha256File(Path path) throws IOException {
        return hex(sha256(Files.readAllBytes(path)));
    }

    private static byte[] sha256(byte[] bytes) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(bytes);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    /**
     * Deterministic uniform draw in [0, 1) keyed by a structured string. Keys name the stream (init_z, q), seed, learner,
     * requirement, attempt number and item, so corresponding opportunities across policies share the same draw.
     */
    public static double uniform01(String key) {
        byte[] digest = sha256(key.getBytes(StandardCharsets.UTF_8));
        long bits = ByteBuffer.wrap(digest, 0, 8).getLong();
        long mantissa = (bits >>> 11) & ((1L << 53) - 1);
        return mantissa / (double) (1L << 53);
    }

    private static UUID uuid(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    private static String reqKey(RequirementPathway.Requirement requirement) {
        return requirement.skillId() + "|" + requirement.knowledgeLevel().name();
    }

    private ReqSpec spec(RequirementPathway.Requirement requirement) {
        return new ReqSpec(requirement.skillId(), requirement.knowledgeLevel(), requirement.skillVersion());
    }

    /** Short hash of the plan's step states and dependency edges; identifies a pathway revision in the event log. */
    static String planRevision(Plan plan) {
        StringBuilder sb = new StringBuilder();
        plan.steps().forEach(step -> sb.append(step.id()).append(':').append(step.state()).append(';'));
        plan.dependencies().forEach(edge -> sb.append(edge.prerequisiteStepId()).append('>').append(edge.dependentStepId()).append(';'));
        return hex(sha256(sb.toString().getBytes(StandardCharsets.UTF_8))).substring(0, 16);
    }

    /**
     * Research adapter for {@link RequirementPathwayPlanningService#refresh}: with no carried bypasses, no provision
     * change and no module exclusions, refresh reduces to regenerating each unfulfilled step from the catalog snapshot and
     * official evidence and merging it through the same runtime per-step transition.
     */
    Plan refresh(UUID request, Plan plan, Map<String, UUID> officialByProofKey) {
        List<Step> steps = new ArrayList<>(plan.steps().size());
        for (Step previous : plan.steps()) {
            if (previous.state() == State.FULFILLED || previous.state() == State.BYPASSED) {
                steps.add(previous);
                continue;
            }
            var requirement = previous.requirement();
            var next = RequirementPathwayGenerationService.step(request, requirement, previous.kind(), previous.sourceBypassId(),
                    catalog, officialByProofKey.get(requirement.proofKey()));
            steps.add(RequirementPathwayPlanningService.refreshedStep(previous, requirement, next, Set.of()));
        }
        return new Plan(steps, plan.dependencies());
    }

    /** Initial plan shared by S0/A0 (baseline-derived learning needs) or S1 (needs plus all unachieved prerequisites). */
    Plan initialPlan(UUID request, ProfileInput profile, String policy, Set<String> officialKeys) {
        List<ReqSpec> ordered = new ArrayList<>();
        Map<String, Set<String>> blockers = new LinkedHashMap<>();
        if ("S1".equals(policy)) {
            Set<String> visited = new LinkedHashSet<>();
            for (ReqSpec need : profile.learningNeeds()) addWithPrerequisitesTopological(need, officialKeys, visited, ordered, blockers);
        } else {
            ordered.addAll(profile.learningNeeds());
        }
        Map<String, Step> stepByKey = new LinkedHashMap<>();
        for (ReqSpec spec : ordered) {
            stepByKey.put(spec.key(), RequirementPathwayGenerationService.step(request, spec.toPathwayReq(), Kind.REQUIRED, null, catalog, null));
        }
        List<Dependency> dependencies = new ArrayList<>();
        // S1's frozen upfront prerequisite order: synthetic, research-only provenance for the static dependency edges.
        blockers.forEach((dependent, prerequisites) -> {
            for (String prerequisite : prerequisites) {
                dependencies.add(new Dependency(stepByKey.get(prerequisite).id(), stepByKey.get(dependent).id(),
                        uuid("S1-static-order|" + profile.profileId()), uuid("S1-static-order|" + prerequisite + ">" + dependent)));
            }
        });
        return new Plan(List.copyOf(stepByKey.values()), dependencies);
    }

    public PolicySingleRun simulateOne(ProfileInput profile, String policy, long replicateSeed, SimParams params) {
        return simulateOne(profile, policy, 0, replicateSeed, params, EventSink.NONE);
    }

    /** Simulates one learner under policy ("S0", "A0" or "S1") for one replicate seed. */
    public PolicySingleRun simulateOne(ProfileInput profile, String policy, int replicate, long replicateSeed, SimParams params, EventSink sink) {
        if (!POLICIES.contains(policy)) throw new IllegalArgumentException("Unknown policy " + policy);
        Rq3Distance targetDistanceCalc = new Rq3Distance(profile.targetRequirements().stream().map(ReqSpec::toPathwayReq).toList());
        Rq3Distance gapDistanceCalc = new Rq3Distance(profile.learningNeeds().stream().map(ReqSpec::toPathwayReq).toList());
        UUID request = uuid("rq3-request|" + profile.profileId());

        Set<String> officialKeys = profile.officialEvidence().stream().map(ReqSpec::key).collect(Collectors.toCollection(TreeSet::new));
        Map<String, UUID> officialByProofKey = new LinkedHashMap<>();
        for (ReqSpec r : profile.officialEvidence()) officialByProofKey.put(r.toPathwayReq().proofKey(), uuid("initial-evidence|" + profile.profileId() + "|" + r.key()));

        // Hidden learner state z(u, r) in [0, 1], isolated to the simulator. Never passed to the policy or the plan.
        Map<String, Double> z = new TreeMap<>();
        Set<String> needKeys = profile.learningNeeds().stream().map(ReqSpec::key).collect(Collectors.toSet());
        for (ReqSpec r : allCatalogRequirements) {
            double u = uniform01(replicateSeed + "|init_z|" + profile.profileId() + "|" + r.key());
            double z0;
            if (officialKeys.contains(r.key())) z0 = 0.80 + 0.15 * u;
            else if (params.equalKnowledge()) z0 = 0.20 + 0.18 * u;
            else if (needKeys.contains(r.key())) z0 = 0.16 + 0.18 * u;
            else if (profile.baselineExemptKeys().contains(r.key())) z0 = 0.34 + 0.24 * u;
            else z0 = 0.20 + 0.18 * u;
            z.put(r.key(), z0);
        }

        Plan plan = refresh(request, initialPlan(request, profile, policy, officialKeys), officialByProofKey);
        Set<String> needsStudyBeforeAttempt = new HashSet<>();
        plan.steps().forEach(step -> needsStudyBeforeAttempt.add(reqKey(step.requirement())));
        Map<String, Integer> attemptsByStep = new HashMap<>();
        Set<String> remedial = new TreeSet<>();
        Set<String> assignedModules = new TreeSet<>();

        // (cumulative cost, target distance, gap distance) after each completed action.
        List<double[]> timeline = new ArrayList<>();
        Set<String> proofKeys = officialByProofKey.keySet();
        timeline.add(new double[]{0.0, targetDistanceCalc.remaining(proofKeys), gapDistanceCalc.remaining(proofKeys)});

        double budgetUsed = 0;
        int learningActions = 0, assessmentAttempts = 0, retakes = 0, failedAttempts = 0, reviewEvents = 0, seq = 0;
        Double releasedAt = plan.targetReleased() ? 0.0 : null;
        Double targetAt = timeline.get(0)[1] < EPS ? 0.0 : null;
        Double gapAt = timeline.get(0)[2] < EPS ? 0.0 : null;
        int cursor = 0;
        String stopReason;

        while (true) {
            if (plan.targetReleased()) {
                stopReason = "PATHWAY_RELEASED";
                break;
            }
            // Shared deterministic selection rule: round-robin over the current plan order from the cursor; the
            // step must be unresolved, have provision and have no unresolved prerequisite dependency.
            Step selected = null;
            int n = plan.steps().size();
            for (int offset = 0; offset < n; offset++) {
                Step candidate = plan.steps().get((cursor + offset) % n);
                if (candidate.resolved() || candidate.state() == State.NEEDS_EXPERT_ACTION) continue;
                if (!plan.unmetPrerequisites(candidate.id()).isEmpty()) continue;
                selected = candidate;
                cursor = (cursor + offset) % n;
                break;
            }
            if (selected == null) {
                stopReason = plan.steps().stream().anyMatch(s -> !s.resolved() && s.state() == State.NEEDS_EXPERT_ACTION)
                        ? "BLOCKED_PROVISION_REQUIRES_EXPERT_ACTION" : "BLOCKED_NO_ELIGIBLE_STEP";
                break;
            }
            final Step chosen = selected;
            String selKey = reqKey(chosen.requirement());
            double targetBefore = targetDistanceCalc.remaining(proofKeys);

            if (needsStudyBeforeAttempt.contains(selKey)) {
                if (budgetUsed + params.learningCost() > params.budget() + EPS) {
                    stopReason = "BUDGET_EXHAUSTED";
                    break;
                }
                budgetUsed += params.learningCost();
                learningActions++;
                String module = selected.options().isEmpty() ? null : selected.options().getFirst().moduleId();
                if (module != null) assignedModules.add(module);
                double before = z.get(selKey);
                double after = before + params.eta() * (1.0 - before);
                z.put(selKey, after);
                needsStudyBeforeAttempt.remove(selKey);
                timeline.add(new double[]{budgetUsed, targetBefore, gapDistanceCalc.remaining(proofKeys)});
                seq++;
                Map<String, Object> event = baseEvent(profile, policy, replicate, replicateSeed, seq);
                event.put("action", "LEARN");
                event.put("requirement", selKey);
                event.put("stepId", selected.id().toString());
                event.put("moduleId", module);
                event.put("cost", params.learningCost());
                event.put("budgetUsed", budgetUsed);
                event.put("remainingBudget", params.budget() - budgetUsed);
                event.put("planRevision", planRevision(plan));
                event.put("targetDistanceBefore", targetBefore);
                event.put("targetDistanceAfter", targetBefore);
                sink.policyEvent(event);
                Map<String, Object> hidden = baseEvent(profile, policy, replicate, replicateSeed, seq);
                hidden.put("requirement", selKey);
                hidden.put("zBefore", before);
                hidden.put("zAfter", after);
                sink.hiddenEvent(hidden);
                continue;
            }

            if (budgetUsed + params.assessmentCost() > params.budget() + EPS) {
                stopReason = "BUDGET_EXHAUSTED";
                break;
            }
            budgetUsed += params.assessmentCost();
            assessmentAttempts++;
            int attemptNum = attemptsByStep.merge(selKey, 1, Integer::sum);
            if (attemptNum > 1) retakes++;
            seq++;

            ReqSpec selSpec = spec(selected.requirement());
            List<ReqSpec> prereqs = prerequisiteMap.getOrDefault(selKey, List.of());
            List<Group> paperGroups = new ArrayList<>();
            Map<UUID, String> answers = new LinkedHashMap<>();
            List<Map<String, Object>> hiddenGroups = new ArrayList<>();
            paperGroups.add(buildAndAnswerGroup(selSpec, GroupRole.MAIN, attemptNum, selSpec, replicateSeed, profile.profileId(), z, params, answers, hiddenGroups));
            for (ReqSpec pre : prereqs) {
                paperGroups.add(buildAndAnswerGroup(pre, GroupRole.PREREQUISITE, attemptNum, selSpec, replicateSeed, profile.profileId(), z, params, answers, hiddenGroups));
            }
            Paper paper = new Paper(Purpose.SKILL_ASSESSMENT, paperGroups, FIXED_START, FIXED_START.plusSeconds(1200));
            List<GroupResult> scored = RuleAssessment.score(paper, answers);

            Set<String> officialDomainKeys = officialKeys.stream().map(k -> k.replace('|', '\n')).collect(Collectors.toSet());
            boolean assignedLearningPending = !plan.unmetPrerequisites(selected.id()).isEmpty();
            RuleAssessmentDecision.Decision decision = RuleAssessmentDecision.decide(
                    Purpose.SKILL_ASSESSMENT, scored, officialDomainKeys, officialDomainKeys, assignedLearningPending);
            reviewEvents += decision.reviews().size();

            List<String> evidenceAdded = new ArrayList<>();
            if (decision.state() == RuleAssessmentDecision.State.READY) {
                if (officialKeys.add(selKey)) {
                    officialByProofKey.put(selected.requirement().proofKey(), uuid("evidence|" + profile.profileId() + "|" + policy + "|" + replicateSeed + "|" + selKey));
                    evidenceAdded.add(selKey);
                }
            } else {
                failedAttempts++;
                // A retake requires a review learning action first (same rule for every policy).
                needsStudyBeforeAttempt.add(selKey);
            }

            UUID attemptId = uuid("attempt|" + profile.profileId() + "|" + policy + "|" + replicateSeed + "|" + seq);
            int stepsBefore = plan.steps().size();
            List<String> supplementsAdded = new ArrayList<>();
            if ("A0".equals(policy)) {
                List<FailedPrerequisite> failed = decision.supplements().stream()
                        .map(group -> new FailedPrerequisite(group.groupId(), new ReqSpec(group.requirement().skillId(),
                                group.requirement().knowledgeLevel(), chosen.requirement().skillVersion()).toPathwayReq()))
                        .toList();
                plan = RequirementPathwayRecalculationService.supplement(request, plan, selected, attemptId, failed);
                for (int i = stepsBefore; i < plan.steps().size(); i++) {
                    String key = reqKey(plan.steps().get(i).requirement());
                    supplementsAdded.add(key);
                    remedial.add(key);
                    needsStudyBeforeAttempt.add(key);
                }
            }
            plan = refresh(request, plan, officialByProofKey);
            cursor = (plan.steps().indexOf(plan.steps().stream().filter(s -> s.id().equals(chosen.id())).findFirst().orElseThrow()) + 1)
                    % plan.steps().size();

            double targetAfter = targetDistanceCalc.remaining(proofKeys);
            double gapAfter = gapDistanceCalc.remaining(proofKeys);
            timeline.add(new double[]{budgetUsed, targetAfter, gapAfter});
            if (targetAt == null && targetAfter < EPS) targetAt = budgetUsed;
            if (gapAt == null && gapAfter < EPS) gapAt = budgetUsed;
            if (releasedAt == null && plan.targetReleased()) releasedAt = budgetUsed;

            Map<String, Object> event = baseEvent(profile, policy, replicate, replicateSeed, seq);
            event.put("action", attemptNum > 1 ? "RETAKE" : "ASSESS");
            event.put("requirement", selKey);
            event.put("stepId", selected.id().toString());
            event.put("attempt", attemptNum);
            event.put("cost", params.assessmentCost());
            event.put("budgetUsed", budgetUsed);
            event.put("remainingBudget", params.budget() - budgetUsed);
            List<Map<String, Object>> observed = new ArrayList<>();
            for (GroupResult result : scored) {
                Map<String, Object> group = new LinkedHashMap<>();
                group.put("requirement", result.requirement().skillId() + "|" + result.requirement().knowledgeLevel().name());
                group.put("role", result.role().name());
                group.put("passed", result.passed());
                group.put("vetoTriggered", result.vetoTriggered());
                observed.add(group);
            }
            event.put("observedGroups", observed);
            event.put("decision", decision.state().name());
            event.put("reviews", decision.reviews().stream().map(r -> r.requirement().skillId() + "|" + r.requirement().knowledgeLevel().name()).toList());
            event.put("evidenceAdded", evidenceAdded);
            event.put("supplementsAdded", supplementsAdded);
            event.put("planRevision", planRevision(plan));
            event.put("planSteps", plan.steps().size());
            event.put("planDependencies", plan.dependencies().size());
            event.put("targetDistanceBefore", targetBefore);
            event.put("targetDistanceAfter", targetAfter);
            event.put("gapDistanceAfter", gapAfter);
            sink.policyEvent(event);
            Map<String, Object> hidden = baseEvent(profile, policy, replicate, replicateSeed, seq);
            hidden.put("requirement", selKey);
            hidden.put("groups", hiddenGroups);
            sink.hiddenEvent(hidden);
        }

        Map<String, Object> stop = baseEvent(profile, policy, replicate, replicateSeed, ++seq);
        stop.put("action", "STOP");
        stop.put("stopReason", stopReason);
        stop.put("budgetUsed", budgetUsed);
        stop.put("remainingBudget", params.budget() - budgetUsed);
        stop.put("planRevision", planRevision(plan));
        stop.put("pathwayReleased", plan.targetReleased());
        sink.policyEvent(stop);

        // D(b) is the state after the last action whose cumulative cost does not exceed b; carried forward after stop.
        Map<Integer, Double> targetTrajectory = new LinkedHashMap<>();
        Map<Integer, Double> gapTrajectory = new LinkedHashMap<>();
        for (int cp : params.checkpoints()) {
            double[] last = timeline.getFirst();
            for (double[] point : timeline) if (point[0] <= cp + EPS) last = point;
            targetTrajectory.put(cp, last[1]);
            gapTrajectory.put(cp, last[2]);
        }
        double finalTargetD = targetDistanceCalc.remaining(proofKeys);
        double finalGapD = gapDistanceCalc.remaining(proofKeys);
        return new PolicySingleRun(targetTrajectory, gapTrajectory, finalTargetD, finalGapD, plan.targetReleased(),
                releasedAt, targetAt, gapAt, budgetUsed, learningActions, assessmentAttempts, retakes, failedAttempts,
                remedial.size(), assignedModules.size(), reviewEvents, stopReason);
    }

    private static Map<String, Object> baseEvent(ProfileInput profile, String policy, int replicate, long seed, int seq) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("profileId", profile.profileId());
        event.put("policy", policy);
        event.put("replicate", replicate);
        event.put("seed", seed);
        event.put("seq", seq);
        return event;
    }

    private void addWithPrerequisitesTopological(ReqSpec current, Set<String> officialKeys, Set<String> visited,
                                                 List<ReqSpec> steps, Map<String, Set<String>> blockingPrereqsByStep) {
        if (!visited.add(current.key())) return;
        Set<String> blockers = new LinkedHashSet<>();
        for (ReqSpec pre : prerequisiteMap.getOrDefault(current.key(), List.of())) {
            if (!officialKeys.contains(pre.key())) {
                addWithPrerequisitesTopological(pre, officialKeys, visited, steps, blockingPrereqsByStep);
                blockers.add(pre.key());
            }
        }
        if (steps.stream().noneMatch(s -> s.key().equals(current.key()))) {
            steps.add(current);
            blockingPrereqsByStep.put(current.key(), blockers);
        }
    }

    private Group buildAndAnswerGroup(ReqSpec groupReq, GroupRole role, int attemptNumOnMain, ReqSpec mainReq, long replicateSeed,
                                      String profileId, Map<String, Double> z, SimParams params, Map<UUID, String> answersOut,
                                      List<Map<String, Object>> hiddenOut) {
        List<ReqSpec> groupPrereqs = prerequisiteMap.getOrDefault(groupReq.key(), List.of());
        double q = groupPrereqs.isEmpty() ? 1.0
                : groupPrereqs.stream().mapToDouble(p -> z.getOrDefault(p.key(), 0.25)).average().orElse(1.0);
        double zGroup = z.getOrDefault(groupReq.key(), 0.25);
        double effectiveMastery = zGroup * ((1.0 - params.lambda()) + params.lambda() * q);
        double rawProb = params.guess() + (1.0 - params.guess() - params.slip()) * effectiveMastery;
        double prob = Math.max(0.01, Math.min(0.99, rawProb));

        RuleAssessment.Requirement domainReq = groupReq.toAssessmentReq();
        GroupRule rule = new GroupRule(groupReq.skillId(), groupReq.level(), 2, 2, false, false);
        List<Candidate> items = new ArrayList<>(2);
        List<Double> draws = new ArrayList<>(2);
        for (int i = 0; i < 2; i++) {
            UUID itemId = uuid(profileId + "|" + mainReq.key() + "|" + groupReq.key() + "|" + attemptNumOnMain + "|" + i);
            items.add(new Candidate(itemId, domainReq, "OUT-1", false, "Assessment question " + (i + 1) + " for " + groupReq.key(),
                    List.of(new RuleAssessment.Option("A", "Correct"), new RuleAssessment.Option("B", "Incorrect")), "A",
                    "c".repeat(64), "m".repeat(64)));
            double draw = uniform01(replicateSeed + "|q|" + profileId + "|" + mainReq.key() + "|" + groupReq.key() + "|" + attemptNumOnMain + "|" + i);
            draws.add(draw);
            answersOut.put(itemId, draw < prob ? "A" : "B");
        }
        Map<String, Object> hidden = new LinkedHashMap<>();
        hidden.put("requirement", groupReq.key());
        hidden.put("role", role.name());
        hidden.put("z", zGroup);
        hidden.put("prerequisiteMeanZ", q);
        hidden.put("correctProbability", prob);
        hidden.put("draws", draws);
        hiddenOut.add(hidden);
        UUID groupId = uuid(profileId + "|grp|" + mainReq.key() + "|" + groupReq.key() + "|" + attemptNumOnMain);
        return new Group(groupId, domainReq, role, rule, items);
    }

    /** Executes the full experiment: primary configuration, bootstrap intervals, secondary outcomes and sensitivity grid. */
    public ExperimentReport runFullExperiment(long baseSeed, int replicates, SimParams primaryParams) {
        return runFullExperiment(baseSeed, replicates, primaryParams, EventSink.NONE, true);
    }

    public ExperimentReport runFullExperiment(long baseSeed, int replicates, SimParams primaryParams, EventSink sink, boolean sensitivity) {
        Map<String, List<List<PolicySingleRun>>> runs = new LinkedHashMap<>();
        List<ProfileSummary> profileSummaries = evaluateProfiles(baseSeed, replicates, primaryParams, sink, runs);
        List<Integer> checkpoints = primaryParams.checkpoints();

        var s0TargetTraj = averageTrajectory(profileSummaries, ProfileSummary::s0TargetTrajectory, checkpoints);
        var a0TargetTraj = averageTrajectory(profileSummaries, ProfileSummary::a0TargetTrajectory, checkpoints);
        var s1TargetTraj = averageTrajectory(profileSummaries, ProfileSummary::s1TargetTrajectory, checkpoints);
        var s0GapTraj = averageTrajectory(profileSummaries, ProfileSummary::s0GapTrajectory, checkpoints);
        var a0GapTraj = averageTrajectory(profileSummaries, ProfileSummary::a0GapTrajectory, checkpoints);
        var s1GapTraj = averageTrajectory(profileSummaries, ProfileSummary::s1GapTrajectory, checkpoints);

        BootstrapInterval deltaTargetA0vsS0 = bootstrap(profileSummaries.stream().mapToDouble(ProfileSummary::deltaTargetDistanceA0vsS0).toArray(), baseSeed, 10000);
        BootstrapInterval deltaTargetA0vsS1 = bootstrap(profileSummaries.stream().mapToDouble(ProfileSummary::deltaTargetDistanceA0vsS1).toArray(), baseSeed + 7, 10000);
        BootstrapInterval deltaGapA0vsS0 = bootstrap(profileSummaries.stream().mapToDouble(ProfileSummary::deltaGapDistanceA0vsS0).toArray(), baseSeed + 13, 10000);

        int wins = 0, ties = 0, losses = 0;
        for (ProfileSummary ps : profileSummaries) {
            if (ps.deltaTargetDistanceA0vsS0() > EPS) wins++;
            else if (ps.deltaTargetDistanceA0vsS0() < -EPS) losses++;
            else ties++;
        }

        List<PolicyOutcomes> secondary = POLICIES.stream().map(policy -> policyOutcomes(policy, runs.get(policy), primaryParams)).toList();
        List<PairedCompleteCase> paired = List.of(
                pairedCompleteCase("S0 vs A0", runs.get("S0"), runs.get("A0")),
                pairedCompleteCase("S1 vs A0", runs.get("S1"), runs.get("A0")));

        List<StratumSummary> byRole = summarizeStrata(profileSummaries, List.of("Junior", "Middle", "Senior"), ProfileSummary::roleLevel);
        List<StratumSummary> byGap = summarizeStrata(profileSummaries, List.of("LOW", "MEDIUM", "HIGH"), ProfileSummary::gapBand);
        List<StratumSummary> byHistory = summarizeStrata(profileSummaries, List.of("BASELINE_ONLY", "MIXED", "OFFICIAL_RICH"), ProfileSummary::evidenceHistoryStratum);
        List<StratumSummary> byPrereqExposure = summarizeStrata(profileSummaries,
                List.of("HAS_UNACHIEVED_PREREQUISITES", "ALL_PREREQUISITES_ALREADY_ACHIEVED"),
                p -> p.unachievedPrerequisiteCount() > 0 ? "HAS_UNACHIEVED_PREREQUISITES" : "ALL_PREREQUISITES_ALREADY_ACHIEVED");

        List<SensitivityRow> sensitivityGrid = new ArrayList<>();
        sensitivityGrid.add(sensitivityRow("Primary (η=0.20, λ=0.50, assessment cost 1, budget 40)", primaryParams, profileSummaries, baseSeed));
        if (sensitivity) {
            Object[][] grid = {
                    {"Slower learning (η=0.10)", primaryParams.with(0.10, primaryParams.lambda(), primaryParams.budget(), primaryParams.assessmentCost(), false)},
                    {"Faster learning (η=0.30)", primaryParams.with(0.30, primaryParams.lambda(), primaryParams.budget(), primaryParams.assessmentCost(), false)},
                    {"No item-level prerequisite coupling (λ=0.00)", primaryParams.with(primaryParams.eta(), 0.00, primaryParams.budget(), primaryParams.assessmentCost(), false)},
                    {"Full item-level prerequisite coupling (λ=1.00)", primaryParams.with(primaryParams.eta(), 1.00, primaryParams.budget(), primaryParams.assessmentCost(), false)},
                    {"Cheaper assessment (cost 0.5)", primaryParams.with(primaryParams.eta(), primaryParams.lambda(), primaryParams.budget(), 0.5, false)},
                    {"Costlier assessment (cost 2)", primaryParams.with(primaryParams.eta(), primaryParams.lambda(), primaryParams.budget(), 2.0, false)},
                    {"Short horizon (budget 20)", primaryParams.with(primaryParams.eta(), primaryParams.lambda(), 20, primaryParams.assessmentCost(), false)},
                    {"Long horizon (budget 80)", primaryParams.with(primaryParams.eta(), primaryParams.lambda(), 80, primaryParams.assessmentCost(), false)},
                    {"Equal initial knowledge control", primaryParams.with(primaryParams.eta(), primaryParams.lambda(), primaryParams.budget(), primaryParams.assessmentCost(), true)},
            };
            for (Object[] row : grid) {
                SimParams sp = (SimParams) row[1];
                sensitivityGrid.add(sensitivityRow((String) row[0], sp, evaluateProfiles(baseSeed, replicates, sp, EventSink.NONE, new LinkedHashMap<>()), baseSeed));
            }
        }

        return new ExperimentReport(
                EXPERIMENT_ID, baseSeed, replicates, profiles.size(), primaryParams.budget(), checkpoints, primaryParams,
                "A0 applies RequirementPathwayRecalculationService.supplement; all policies refresh through "
                        + "RequirementPathwayGenerationService.step + RequirementPathwayPlanningService.refreshedStep and are scored by "
                        + "RuleAssessment.score + RuleAssessmentDecision.decide. Isolated snapshots replace the JPA/graph stores.",
                engineSourceSha256, inputSha256,
                s0TargetTraj, a0TargetTraj, s1TargetTraj, s0GapTraj, a0GapTraj, s1GapTraj,
                deltaTargetA0vsS0, deltaTargetA0vsS1, deltaGapA0vsS0, wins, ties, losses,
                mean(profileSummaries, ProfileSummary::s0ReleaseRate), mean(profileSummaries, ProfileSummary::a0ReleaseRate), mean(profileSummaries, ProfileSummary::s1ReleaseRate),
                mean(profileSummaries, ProfileSummary::s0MeanBudgetUsed), mean(profileSummaries, ProfileSummary::a0MeanBudgetUsed), mean(profileSummaries, ProfileSummary::s1MeanBudgetUsed),
                mean(profileSummaries, ProfileSummary::s0MeanLearningActions), mean(profileSummaries, ProfileSummary::a0MeanLearningActions), mean(profileSummaries, ProfileSummary::s1MeanLearningActions),
                mean(profileSummaries, ProfileSummary::s0MeanAssessments), mean(profileSummaries, ProfileSummary::a0MeanAssessments), mean(profileSummaries, ProfileSummary::s1MeanAssessments),
                mean(profileSummaries, ProfileSummary::a0MeanSupplements),
                secondary, paired, byRole, byGap, byHistory, byPrereqExposure, sensitivityGrid, profileSummaries);
    }

    private static double mean(List<ProfileSummary> rows, java.util.function.ToDoubleFunction<ProfileSummary> f) {
        return round4(rows.stream().mapToDouble(f).average().orElse(0));
    }

    private SensitivityRow sensitivityRow(String label, SimParams sp, List<ProfileSummary> sub, long baseSeed) {
        BootstrapInterval ci = bootstrap(sub.stream().mapToDouble(ProfileSummary::deltaTargetDistanceA0vsS0).toArray(), baseSeed, 10000);
        return new SensitivityRow(label, sp.eta(), sp.lambda(), sp.assessmentCost(), sp.budget(), sp.equalKnowledge(),
                mean(sub, ProfileSummary::s0FinalTargetDistance), mean(sub, ProfileSummary::a0FinalTargetDistance), mean(sub, ProfileSummary::s1FinalTargetDistance),
                ci.mean(), ci.ci95Low(), ci.ci95High(), mean(sub, ProfileSummary::deltaTargetDistanceA0vsS1),
                mean(sub, ProfileSummary::s0FinalGapDistance), mean(sub, ProfileSummary::a0FinalGapDistance), mean(sub, ProfileSummary::deltaGapDistanceA0vsS0),
                mean(sub, ProfileSummary::s0ReleaseRate), mean(sub, ProfileSummary::a0ReleaseRate), mean(sub, ProfileSummary::s1ReleaseRate));
    }

    private static PolicyOutcomes policyOutcomes(String policy, List<List<PolicySingleRun>> byProfile, SimParams params) {
        List<PolicySingleRun> all = byProfile.stream().flatMap(List::stream).toList();
        int n = all.size();
        long gapClosed = all.stream().filter(r -> r.gapClosedAtCost() != null).count();
        long released = all.stream().filter(r -> r.releasedAtCost() != null).count();
        Map<String, Integer> reasons = new TreeMap<>();
        all.forEach(r -> reasons.merge(r.stopReason(), 1, Integer::sum));
        return new PolicyOutcomes(policy, n,
                round4(all.stream().filter(r -> r.targetAchievedAtCost() != null).count() / (double) n),
                round4(gapClosed / (double) n),
                round4(released / (double) n),
                (int) gapClosed, (int) (n - gapClosed),
                round4(all.stream().mapToDouble(r -> r.gapClosedAtCost() == null ? params.budget() : r.gapClosedAtCost()).average().orElse(0)),
                gapClosed == 0 ? null : round4(all.stream().filter(r -> r.gapClosedAtCost() != null).mapToDouble(PolicySingleRun::gapClosedAtCost).average().orElse(0)),
                (int) released, (int) (n - released),
                round4(all.stream().mapToDouble(r -> r.releasedAtCost() == null ? params.budget() : r.releasedAtCost()).average().orElse(0)),
                round4(all.stream().mapToDouble(PolicySingleRun::budgetUsed).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::learningActions).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::assessmentAttempts).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::retakes).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::failedAttempts).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::distinctRemedialRequirements).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::distinctAssignedModules).average().orElse(0)),
                round4(all.stream().mapToInt(PolicySingleRun::reviewEvents).average().orElse(0)),
                reasons);
    }

    private static PairedCompleteCase pairedCompleteCase(String label, List<List<PolicySingleRun>> first, List<List<PolicySingleRun>> second) {
        int pairs = 0, total = 0;
        double sumFirst = 0, sumSecond = 0;
        for (int p = 0; p < first.size(); p++) {
            for (int r = 0; r < first.get(p).size(); r++) {
                total++;
                Double a = first.get(p).get(r).gapClosedAtCost(), b = second.get(p).get(r).gapClosedAtCost();
                if (a != null && b != null) {
                    pairs++;
                    sumFirst += a;
                    sumSecond += b;
                }
            }
        }
        return new PairedCompleteCase(label, pairs, total, pairs == 0 ? 0 : round4(sumFirst / pairs), pairs == 0 ? 0 : round4(sumSecond / pairs));
    }

    private List<ProfileSummary> evaluateProfiles(long baseSeed, int replicates, SimParams params, EventSink sink,
                                                  Map<String, List<List<PolicySingleRun>>> runsOut) {
        POLICIES.forEach(policy -> runsOut.put(policy, new ArrayList<>()));
        List<ProfileSummary> summaries = new ArrayList<>(profiles.size());
        List<Integer> checkpoints = params.checkpoints();
        for (ProfileInput profile : profiles) {
            Set<String> offKeys = profile.officialEvidence().stream().map(ReqSpec::key).collect(Collectors.toSet());
            Set<String> unachievedPrereqs = new TreeSet<>();
            for (ReqSpec need : profile.learningNeeds()) {
                for (ReqSpec pre : prerequisiteMap.getOrDefault(need.key(), List.of())) {
                    if (!offKeys.contains(pre.key())) unachievedPrereqs.add(pre.key());
                }
            }
            Map<String, List<PolicySingleRun>> byPolicy = new LinkedHashMap<>();
            POLICIES.forEach(policy -> byPolicy.put(policy, new ArrayList<>(replicates)));
            for (int rep = 1; rep <= replicates; rep++) {
                long seed = baseSeed + rep * 1009L;
                for (String policy : POLICIES) byPolicy.get(policy).add(simulateOne(profile, policy, rep, seed, params, sink));
            }
            POLICIES.forEach(policy -> runsOut.get(policy).add(byPolicy.get(policy)));
            var s0 = byPolicy.get("S0");
            var a0 = byPolicy.get("A0");
            var s1 = byPolicy.get("S1");

            var s0TargetTraj = avgRunTrajectory(s0, true, checkpoints);
            double s0FinalT = s0.stream().mapToDouble(PolicySingleRun::finalTargetDistance).average().orElse(0);
            double a0FinalT = a0.stream().mapToDouble(PolicySingleRun::finalTargetDistance).average().orElse(0);
            double s1FinalT = s1.stream().mapToDouble(PolicySingleRun::finalTargetDistance).average().orElse(0);
            double s0FinalG = s0.stream().mapToDouble(PolicySingleRun::finalGapDistance).average().orElse(0);
            double a0FinalG = a0.stream().mapToDouble(PolicySingleRun::finalGapDistance).average().orElse(0);
            double s1FinalG = s1.stream().mapToDouble(PolicySingleRun::finalGapDistance).average().orElse(0);

            summaries.add(new ProfileSummary(
                    profile.profileId(), profile.roleLevel(), profile.gapBand(), profile.evidenceHistoryStratum(),
                    profile.targetRequirements().size(), profile.officialEvidence().size(), profile.baselineExemptKeys().size(),
                    profile.learningNeeds().size(), unachievedPrereqs.size(),
                    round4(s0TargetTraj.getOrDefault(0, 0.0)),
                    s0TargetTraj, avgRunTrajectory(a0, true, checkpoints), avgRunTrajectory(s1, true, checkpoints),
                    avgRunTrajectory(s0, false, checkpoints), avgRunTrajectory(a0, false, checkpoints), avgRunTrajectory(s1, false, checkpoints),
                    round4(s0FinalT), round4(a0FinalT), round4(s1FinalT),
                    round4(s0FinalT - a0FinalT), round4(s1FinalT - a0FinalT),
                    round4(s0FinalG), round4(a0FinalG), round4(s1FinalG), round4(s0FinalG - a0FinalG),
                    rate(s0), rate(a0), rate(s1),
                    round4(s0.stream().mapToDouble(PolicySingleRun::budgetUsed).average().orElse(0)),
                    round4(a0.stream().mapToDouble(PolicySingleRun::budgetUsed).average().orElse(0)),
                    round4(s1.stream().mapToDouble(PolicySingleRun::budgetUsed).average().orElse(0)),
                    round4(s0.stream().mapToInt(PolicySingleRun::learningActions).average().orElse(0)),
                    round4(a0.stream().mapToInt(PolicySingleRun::learningActions).average().orElse(0)),
                    round4(s1.stream().mapToInt(PolicySingleRun::learningActions).average().orElse(0)),
                    round4(s0.stream().mapToInt(PolicySingleRun::assessmentAttempts).average().orElse(0)),
                    round4(a0.stream().mapToInt(PolicySingleRun::assessmentAttempts).average().orElse(0)),
                    round4(s1.stream().mapToInt(PolicySingleRun::assessmentAttempts).average().orElse(0)),
                    round4(a0.stream().mapToInt(PolicySingleRun::distinctRemedialRequirements).average().orElse(0)),
                    stopReasons(s0), stopReasons(a0), stopReasons(s1)));
        }
        return summaries;
    }

    private static double rate(List<PolicySingleRun> runs) {
        return round4(runs.stream().mapToDouble(r -> r.pathwayReleased() ? 1.0 : 0.0).average().orElse(0));
    }

    private static Map<String, Integer> stopReasons(List<PolicySingleRun> runs) {
        Map<String, Integer> reasons = new TreeMap<>();
        runs.forEach(r -> reasons.merge(r.stopReason(), 1, Integer::sum));
        return reasons;
    }

    private static Map<Integer, Double> avgRunTrajectory(List<PolicySingleRun> runs, boolean target, List<Integer> checkpoints) {
        Map<Integer, Double> out = new LinkedHashMap<>();
        for (int cp : checkpoints) {
            out.put(cp, round4(runs.stream()
                    .mapToDouble(r -> (target ? r.targetDistanceByCheckpoint() : r.gapDistanceByCheckpoint()).get(cp))
                    .average().orElse(0.0)));
        }
        return out;
    }

    private static Map<Integer, Double> averageTrajectory(List<ProfileSummary> summaries,
                                                          java.util.function.Function<ProfileSummary, Map<Integer, Double>> extractor,
                                                          List<Integer> checkpoints) {
        Map<Integer, Double> out = new LinkedHashMap<>();
        for (int cp : checkpoints) {
            out.put(cp, round4(summaries.stream().mapToDouble(s -> extractor.apply(s).get(cp)).average().orElse(0.0)));
        }
        return out;
    }

    private static List<StratumSummary> summarizeStrata(List<ProfileSummary> summaries, List<String> keys,
                                                        java.util.function.Function<ProfileSummary, String> classifier) {
        List<StratumSummary> result = new ArrayList<>();
        for (String key : keys) {
            List<ProfileSummary> sub = summaries.stream().filter(s -> key.equals(classifier.apply(s))).toList();
            if (sub.isEmpty()) continue;
            double s0T = sub.stream().mapToDouble(ProfileSummary::s0FinalTargetDistance).average().orElse(0);
            double a0T = sub.stream().mapToDouble(ProfileSummary::a0FinalTargetDistance).average().orElse(0);
            double s0G = sub.stream().mapToDouble(ProfileSummary::s0FinalGapDistance).average().orElse(0);
            double a0G = sub.stream().mapToDouble(ProfileSummary::a0FinalGapDistance).average().orElse(0);
            result.add(new StratumSummary(key, sub.size(),
                    mean(sub, ProfileSummary::baselineTargetDistance),
                    round4(s0T), round4(a0T), mean(sub, ProfileSummary::s1FinalTargetDistance), round4(s0T - a0T),
                    round4(s0G), round4(a0G), mean(sub, ProfileSummary::s1FinalGapDistance), round4(s0G - a0G),
                    mean(sub, ProfileSummary::s0ReleaseRate), mean(sub, ProfileSummary::a0ReleaseRate), mean(sub, ProfileSummary::s1ReleaseRate)));
        }
        return result;
    }

    public static BootstrapInterval bootstrap(double[] values, long seed, int resamples) {
        if (values.length == 0) return new BootstrapInterval(0, 0, 0, 0);
        double mean = Arrays.stream(values).average().orElse(0.0);
        Random rng = new Random(seed);
        double[] sampleMeans = new double[resamples];
        int n = values.length;
        for (int b = 0; b < resamples; b++) {
            double sum = 0.0;
            for (int i = 0; i < n; i++) sum += values[rng.nextInt(n)];
            sampleMeans[b] = sum / n;
        }
        Arrays.sort(sampleMeans);
        double low = sampleMeans[(int) Math.floor(0.025 * (resamples - 1))];
        double high = sampleMeans[(int) Math.ceil(0.975 * (resamples - 1))];
        double meanBoot = Arrays.stream(sampleMeans).average().orElse(mean);
        double var = Arrays.stream(sampleMeans).map(x -> (x - meanBoot) * (x - meanBoot)).average().orElse(0.0);
        return new BootstrapInterval(round4(mean), round4(low), round4(high), round4(Math.sqrt(var)));
    }

    private static double round4(double v) {
        return Math.round(v * 10000.0) / 10000.0;
    }

    /** Streams JSON lines into two gzip files: the policy-facing event log and the evaluator-only hidden state. */
    static final class GzipJsonlSink implements EventSink, AutoCloseable {
        private final ObjectMapper mapper = new ObjectMapper();
        private final Writer policy;
        private final Writer hidden;
        long policyEvents;
        long hiddenEvents;

        GzipJsonlSink(Path policyPath, Path hiddenPath) throws IOException {
            policy = writer(policyPath);
            hidden = writer(hiddenPath);
        }

        private static Writer writer(Path path) throws IOException {
            OutputStream out = new GZIPOutputStream(Files.newOutputStream(path), 1 << 16);
            return new OutputStreamWriter(out, StandardCharsets.UTF_8);
        }

        private void write(Writer writer, Map<String, Object> event) {
            try {
                writer.write(mapper.writeValueAsString(event));
                writer.write('\n');
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
        }

        @Override public void policyEvent(Map<String, Object> event) { write(policy, event); policyEvents++; }
        @Override public void hiddenEvent(Map<String, Object> event) { write(hidden, event); hiddenEvents++; }
        @Override public void close() throws IOException { policy.close(); hidden.close(); }
    }

    /**
     * Writes {@code documents/research/results/rq3/<RUN_ID>/}: report.json, events.jsonl.gz (policy-facing),
     * hidden-state.jsonl.gz (evaluator only), run-manifest.json and SHA256SUMS.txt; then copies the report to the
     * frontend fixture. Usage: {@code Rq3SimulationRunner [repoRoot] [gitCommit]}.
     */
    public static void main(String[] args) throws Exception {
        Path repoRoot = args.length > 0 ? Path.of(args[0]).toAbsolutePath().normalize() : Path.of(".").toAbsolutePath().normalize();
        if (repoRoot.endsWith("backend")) repoRoot = repoRoot.getParent();
        String commit = args.length > 1 ? args[1] : "unknown";
        Rq3SimulationRunner runner = fromWorkspace(repoRoot);
        Path outDir = repoRoot.resolve("documents/research/results/rq3/" + RUN_ID);
        Files.createDirectories(outDir);
        ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        long started = System.nanoTime();
        ExperimentReport report;
        long policyEvents, hiddenEvents;
        try (GzipJsonlSink sink = new GzipJsonlSink(outDir.resolve("events.jsonl.gz"), outDir.resolve("hidden-state.jsonl.gz"))) {
            report = runner.runFullExperiment(BASE_SEED, DEFAULT_REPLICATES, SimParams.defaults(), sink, true);
            policyEvents = sink.policyEvents;
            hiddenEvents = sink.hiddenEvents;
        }
        String json = mapper.writeValueAsString(report) + "\n";
        Files.writeString(outDir.resolve("report.json"), json);
        Map<String, Object> manifest = new LinkedHashMap<>();
        manifest.put("runId", RUN_ID);
        manifest.put("experimentId", EXPERIMENT_ID);
        manifest.put("generatedAt", Instant.now().toString());
        manifest.put("gitCommit", commit);
        manifest.put("gitWorkingTree", "uncommitted changes may be present; engineSourceSha256 identifies the exact sources");
        manifest.put("runtimeSeconds", Math.round((System.nanoTime() - started) / 1e9));
        manifest.put("baseSeed", BASE_SEED);
        manifest.put("replicates", DEFAULT_REPLICATES);
        manifest.put("profiles", runner.profiles().size());
        manifest.put("primaryParameters", SimParams.defaults());
        manifest.put("policyEvents", policyEvents);
        manifest.put("hiddenStateEvents", hiddenEvents);
        manifest.put("eventLogScope", "primary configuration only; sensitivity rows are summarized in report.json");
        manifest.put("hiddenStateSeparation", "hidden-state.jsonl.gz is evaluator-only; events.jsonl.gz contains observed outcomes only");
        manifest.put("engineSourceSha256", report.engineSourceSha256());
        manifest.put("inputSha256", report.inputSha256());
        manifest.put("reviewStatus", "SIMULATOR_AND_RUBRIC_PENDING_EXPERT_REVIEW");
        Files.writeString(outDir.resolve("run-manifest.json"), mapper.writeValueAsString(manifest) + "\n");
        StringBuilder sums = new StringBuilder();
        for (String file : List.of("report.json", "events.jsonl.gz", "hidden-state.jsonl.gz", "run-manifest.json")) {
            sums.append(sha256File(outDir.resolve(file))).append("  ").append(file).append('\n');
        }
        Files.writeString(outDir.resolve("SHA256SUMS.txt"), sums.toString());
        Path fixture = repoRoot.resolve("frontend/public/fixtures/rq3-samples/" + EXPERIMENT_ID + ".json");
        Files.createDirectories(fixture.getParent());
        Files.writeString(fixture, json);
        System.out.println("Wrote RQ3 run " + RUN_ID + " to " + outDir + " (" + policyEvents + " policy events, " + hiddenEvents + " hidden events)");
    }
}
