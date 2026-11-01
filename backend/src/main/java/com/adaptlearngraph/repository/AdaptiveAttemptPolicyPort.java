package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy.Versions;
import com.adaptlearngraph.utility.Irt3pl.Item;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Server-only exact technical reads, after the caller authorizes tenant/Employee/catalog scope.
 * New starts supply an authorized pool; resume supplies the persisted pool, never current eligibility.
 * No latest-version lookup, fallback policy, protected answers or Employee DTOs cross this port.
 */
public interface AdaptiveAttemptPolicyPort {
    Policy load(VersionPins pins, Map<UUID, String> authorizedItemSkills);

    default Policy load(com.adaptlearngraph.entities.AdaptiveAttemptSnapshot snapshot) {
        var base=load(snapshot.blueprint().pins(),snapshot.itemSkills());
        if(snapshot.assessmentPolicy().isEmpty())return base;
        var pin=snapshot.assessmentPolicy().orElseThrow();var v=base.versions();
        var effective=new Versions(v.modelVersionId(),v.masteryMappingVersionId(),v.parameterSetId(),pin.values().apply(v.model()),
                new com.adaptlearngraph.utility.AdaptiveIrtPolicy.Mapping(v.mapping().algorithm(),pin.values().k()));
        return new Policy(effective,base.items());
    }

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
