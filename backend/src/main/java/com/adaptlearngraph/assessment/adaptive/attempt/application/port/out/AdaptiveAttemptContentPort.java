package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.util.*;

/** Caller authorizes scope and supplies only items from an owned/authorized immutable pool. */
public interface AdaptiveAttemptContentPort {
    Item read(Scope scope, UUID itemVersionId);
    /** No protected key, correctness, technical parameters or arbitrary response-schema metadata. */
    record Item(UUID id, String prompt, Map<String, String> options) {
        public Item { options = Collections.unmodifiableMap(new TreeMap<>(options)); }
    }
}
