package com.adaptlearngraph.research;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.research.Rq3SimulationRunner.EventSink;
import com.adaptlearngraph.research.Rq3SimulationRunner.ExperimentReport;
import com.adaptlearngraph.research.Rq3SimulationRunner.PolicySingleRun;
import com.adaptlearngraph.research.Rq3SimulationRunner.ProfileSummary;
import com.adaptlearngraph.research.Rq3SimulationRunner.SimParams;
import java.nio.file.Path;
import java.util.*;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Simulator invariants. These tests never write the research artifacts and never assert which policy wins;
 * the artifacts are produced only by {@link Rq3SimulationRunner#main}.
 */
class Rq3SimulationRunnerTest {
    private static Rq3SimulationRunner runner;

    @BeforeAll
    static void load() throws Exception {
        Path cwd = Path.of(".").toAbsolutePath().normalize();
        runner = Rq3SimulationRunner.fromWorkspace(cwd.endsWith("backend") ? cwd.getParent() : cwd);
    }

    @Test
    void cohortInputsAndHashesAreLoaded() {
        assertThat(runner.profiles()).hasSize(100);
        ExperimentReport report = runner.subset(2).runFullExperiment(Rq3SimulationRunner.BASE_SEED, 1, SimParams.defaults(), EventSink.NONE, false);
        assertThat(report.engineSourceSha256()).containsOnlyKeys(Rq3SimulationRunner.ENGINE_SOURCES)
                .allSatisfy((file, hash) -> assertThat(hash).hasSize(64));
        assertThat(report.inputSha256()).containsOnlyKeys(Rq3SimulationRunner.INPUT_FILES);
    }

    @Test
    void reportIsDeterministicForFixedSeeds() {
        Rq3SimulationRunner small = runner.subset(12);
        ExperimentReport first = small.runFullExperiment(Rq3SimulationRunner.BASE_SEED, 3, SimParams.defaults(), EventSink.NONE, false);
        ExperimentReport second = small.runFullExperiment(Rq3SimulationRunner.BASE_SEED, 3, SimParams.defaults(), EventSink.NONE, false);
        assertThat(first).isEqualTo(second);
        assertThat(first.checkpoints()).containsExactly(0, 10, 20, 30, 40);
        assertThat(first.a0MeanTargetTrajectory().get(0))
                .isEqualTo(first.s0MeanTargetTrajectory().get(0))
                .isEqualTo(first.s1MeanTargetTrajectory().get(0));
    }

    @Test
    void everyPolicyChargesEqualCostsWithinBudgetAndNeverLosesEvidence() {
        for (double assessmentCost : new double[]{0.5, 1.0, 2.0}) {
            SimParams params = SimParams.defaults().with(0.2, 0.5, 40, assessmentCost, false);
            for (var profile : runner.profiles().subList(0, 20)) {
                for (String policy : Rq3SimulationRunner.POLICIES) {
                    PolicySingleRun run = runner.simulateOne(profile, policy, 1, 77L, params, EventSink.NONE);
                    assertThat(run.budgetUsed()).isLessThanOrEqualTo(params.budget() + 1e-9)
                            .isCloseTo(run.learningActions() * params.learningCost() + run.assessmentAttempts() * assessmentCost,
                                    org.assertj.core.data.Offset.offset(1e-9));
                    double previous = Double.MAX_VALUE;
                    for (int checkpoint : params.checkpoints()) {
                        double distance = run.targetDistanceByCheckpoint().get(checkpoint);
                        assertThat(distance).isBetween(0.0, 1.0).isLessThanOrEqualTo(previous);
                        previous = distance;
                    }
                    if (!"A0".equals(policy)) assertThat(run.distinctRemedialRequirements()).isZero();
                }
            }
        }
    }

    @Test
    void policyEventsNeverExposeHiddenLearnerStateAndEvidenceIsNeverDoubleCounted() {
        List<Map<String, Object>> policyEvents = new ArrayList<>();
        List<Map<String, Object>> hiddenEvents = new ArrayList<>();
        EventSink sink = new EventSink() {
            @Override public void policyEvent(Map<String, Object> event) { policyEvents.add(event); }
            @Override public void hiddenEvent(Map<String, Object> event) { hiddenEvents.add(event); }
        };
        var profile = runner.profiles().getFirst();
        for (String policy : Rq3SimulationRunner.POLICIES) runner.simulateOne(profile, policy, 1, 99L, SimParams.defaults(), sink);

        Set<String> hiddenKeys = Set.of("z", "zBefore", "zAfter", "correctProbability", "prerequisiteMeanZ", "draws", "groups");
        assertThat(policyEvents).isNotEmpty().allSatisfy(event -> assertThat(event.keySet()).doesNotContainAnyElementsOf(hiddenKeys));
        assertThat(policyEvents.toString()).doesNotContain("correctProbability", "zBefore");
        assertThat(hiddenEvents).isNotEmpty();
        assertThat(policyEvents.stream().filter(e -> "STOP".equals(e.get("action")))).hasSize(3);

        Map<String, Set<Object>> evidenceByPolicy = new HashMap<>();
        for (var event : policyEvents) {
            Object added = event.get("evidenceAdded");
            if (added instanceof List<?> list) {
                for (Object key : list) assertThat(evidenceByPolicy.computeIfAbsent((String) event.get("policy"), p -> new HashSet<>()).add(key)).isTrue();
            }
        }
    }

    @Test
    void adaptiveEqualsStaticWhenEveryDeclaredPrerequisiteIsAlreadyOfficial() {
        ExperimentReport report = runner.runFullExperiment(Rq3SimulationRunner.BASE_SEED, 1, SimParams.defaults(), EventSink.NONE, false);
        List<String> control = report.profiles().stream().filter(p -> p.unachievedPrerequisiteCount() == 0).map(ProfileSummary::profileId).toList();
        assertThat(control).isNotEmpty();
        for (var profile : runner.profiles()) {
            if (!control.contains(profile.profileId())) continue;
            for (long seed : new long[]{11L, 12L, 13L}) {
                PolicySingleRun s0 = runner.simulateOne(profile, "S0", seed, SimParams.defaults());
                PolicySingleRun a0 = runner.simulateOne(profile, "A0", seed, SimParams.defaults());
                assertThat(a0.targetDistanceByCheckpoint()).isEqualTo(s0.targetDistanceByCheckpoint());
                assertThat(a0.budgetUsed()).isEqualTo(s0.budgetUsed());
                assertThat(a0.distinctRemedialRequirements()).isZero();
            }
        }
    }

    @Test
    void sensitivityCheckpointsFollowTheHorizon() {
        assertThat(SimParams.defaults().with(0.2, 0.5, 20, 1.0, false).checkpoints()).containsExactly(0, 5, 10, 15, 20);
        assertThat(SimParams.defaults().with(0.2, 0.5, 80, 1.0, false).checkpoints()).containsExactly(0, 20, 40, 60, 80);
    }
}
