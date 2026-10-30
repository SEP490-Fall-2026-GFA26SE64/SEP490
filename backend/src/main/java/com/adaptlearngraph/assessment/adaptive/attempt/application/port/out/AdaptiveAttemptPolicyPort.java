package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.Versions;
import com.adaptlearngraph.assessment.adaptive.psychometrics.Irt3pl.Item;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Server-only exact technical reads, after the caller authorizes tenant/Employee/catalog scope.
 * New starts supply an authorized pool; resume supplies the persisted pool, never current eligibility.
 * No latest-version lookup, fallback policy, protected answers or Employee DTOs cross this port.
 */
public interface AdaptiveAttemptPolicyPort {
    Policy load(VersionPins pins, Map<UUID, String> authorizedItemSkills);

    /** Items cover exactly the supplied identities/skills, in deterministic item UUID order. */
    record Policy(Versions versions, List<Item> items) {
        public Policy { items = List.copyOf(items); }
    }
    enum Code { PINNED_VERSION_UNAVAILABLE, INVALID_POLICY, INVALID_PARAMETERS, DEPENDENCY_UNAVAILABLE }
    final class Failure extends RuntimeException {
        private final Code code;
        public Failure(Code code) { super("Adaptive attempt policy: " + code); this.code = code; }
        public Code code() { return code; }
    }
}
