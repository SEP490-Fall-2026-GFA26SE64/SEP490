package com.adaptlearngraph.research;

import com.adaptlearngraph.entities.domain.RequirementPathway.Requirement;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/** Measures missing official evidence against a fixed, versioned target. */
public final class Rq3Distance {
    private final Set<String> targetProofKeys;

    public Rq3Distance(Collection<Requirement> target) {
        targetProofKeys = target.stream().map(Requirement::proofKey).collect(Collectors.toUnmodifiableSet());
        if (targetProofKeys.isEmpty()) {
            throw new IllegalArgumentException("RQ3 requires a nonempty target");
        }
    }

    public double remaining(Set<String> officialProofKeys) {
        long missing = targetProofKeys.stream().filter(key -> !officialProofKeys.contains(key)).count();
        return (double) missing / targetProofKeys.size();
    }
}
