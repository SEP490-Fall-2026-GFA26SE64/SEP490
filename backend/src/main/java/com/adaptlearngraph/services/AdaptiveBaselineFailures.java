package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Code;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure;
import java.util.function.Supplier;

/**
 * Translates adaptive-baseline store and port failures into the use-case failures the HTTP adapters map, so
 * controllers never handle repository types. Each method translates exactly the failures its adapter handled.
 */
public final class AdaptiveBaselineFailures {
    private AdaptiveBaselineFailures() {
    }

    /** Attempt start/read: store failures, policy port failures and eligibility outages. */
    public static <T> T attemptStart(Supplier<T> call) {
        try {
            return call.get();
        } catch (AdaptiveAttemptStore.Failure failure) {
            throw store(failure);
        } catch (AdaptiveAttemptPolicyPort.Failure failure) {
            throw new Failure(failure.code() == AdaptiveAttemptPolicyPort.Code.DEPENDENCY_UNAVAILABLE
                    ? Code.DEPENDENCY_UNAVAILABLE : Code.POLICY_UNAVAILABLE);
        } catch (AdaptiveBlueprintEligibilityPort.DependencyUnavailable failure) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }

    /** Attempt answer/submit: store failures only. */
    public static <T> T attemptStore(Supplier<T> call) {
        try {
            return call.get();
        } catch (AdaptiveAttemptStore.Failure failure) {
            throw store(failure);
        }
    }

    /** Workspace baseline resources: eligibility outages become the resource API's 503 failure. */
    public static <T> T resources(Supplier<T> call) {
        try {
            return call.get();
        } catch (AdaptiveBlueprintEligibilityPort.DependencyUnavailable failure) {
            throw new WorkspaceBaselineResourceUseCase.Failure(503, "DEPENDENCY_UNAVAILABLE");
        }
    }

    private static Failure store(AdaptiveAttemptStore.Failure failure) {
        return new Failure(Code.valueOf(failure.code().name()));
    }
}
