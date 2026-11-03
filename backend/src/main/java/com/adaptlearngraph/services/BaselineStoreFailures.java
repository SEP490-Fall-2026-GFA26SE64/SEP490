package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.BaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort;
import java.util.function.Supplier;

/**
 * Translates baseline store/catalog write conflicts and outages into business-layer failures with the same message,
 * so the baseline HTTP adapters never handle repository types. Each method translates exactly the failures its
 * adapter handled.
 */
public final class BaselineStoreFailures {
    private BaselineStoreFailures() {
    }

    /** A concurrent write invalidated the expected stored version. */
    public static final class WriteConflict extends RuntimeException {
        public WriteConflict(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /** A baseline store or catalog dependency is temporarily unavailable. */
    public static final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /** Baseline assessment management: management, draft and blueprint stores plus the Occupation catalog. */
    public static <T> T management(Supplier<T> work) {
        try {
            return work.get();
        } catch (BaselineAssessmentManagementStore.WriteConflict | BaselineAssessmentDraftStore.WriteConflict
                 | BaselineBlueprintStore.WriteConflict conflict) {
            throw new WriteConflict(conflict.getMessage(), conflict);
        } catch (BaselineAssessmentManagementStore.DependencyUnavailable | BaselineAssessmentDraftStore.DependencyUnavailable
                 | BaselineOccupationCatalogPort.DependencyUnavailable unavailable) {
            throw new DependencyUnavailable(unavailable.getMessage(), unavailable);
        }
    }

    /** Legacy baseline blueprint API: only the management store participates when management is enabled. */
    public static <T> T legacy(Supplier<T> work) {
        try {
            return work.get();
        } catch (BaselineAssessmentManagementStore.WriteConflict conflict) {
            throw new WriteConflict(conflict.getMessage(), conflict);
        } catch (BaselineAssessmentManagementStore.DependencyUnavailable unavailable) {
            throw new DependencyUnavailable(unavailable.getMessage(), unavailable);
        }
    }
}