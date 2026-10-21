package com.adaptlearngraph.assessment.adaptive.attempt.domain;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Server-only immutable starting inputs; never re-resolve current eligibility on resume. */
public record AdaptiveAttemptSnapshot(AdaptiveBlueprint.Version blueprint, Purpose purpose,
        Optional<String> roleId, Optional<Long> selectionRevision, Map<UUID, String> itemSkills) {
    public enum Purpose { ROLE_REQUIREMENT, OCCUPATION_EXPLORATION }

    public AdaptiveAttemptSnapshot {
        Objects.requireNonNull(blueprint);
        Objects.requireNonNull(purpose);
        Objects.requireNonNull(roleId);
        Objects.requireNonNull(selectionRevision);
        itemSkills = Map.copyOf(itemSkills);
        if ((purpose == Purpose.ROLE_REQUIREMENT) != roleId.isPresent()
                || roleId.filter(id -> !blueprint.roles().containsKey(id)).isPresent()
                || selectionRevision.filter(revision -> revision < 1).isPresent()
                || purpose == Purpose.OCCUPATION_EXPLORATION && selectionRevision.isPresent()) {
            throw new IllegalArgumentException("Invalid trusted role/selection provenance");
        }
        Set<String> skills = skills(blueprint, roleId);
        int maximum = roleId.map(id -> blueprint.configuration().roles().get(id))
                .orElse(blueprint.configuration().exploration()).maxQuestions();
        if (itemSkills.size() < maximum || !skills.containsAll(itemSkills.values())
                || itemSkills.keySet().stream().anyMatch(id -> id.equals(new UUID(0, 0)))) {
            throw new IllegalArgumentException("Pinned pool must meet the bound and contain only applicable skills");
        }
    }

    public AdaptiveBlueprint.Bounds bounds() {
        return roleId.map(id -> blueprint.configuration().roles().get(id))
                .orElse(blueprint.configuration().exploration());
    }

    public Set<String> microSkillIds() { return skills(blueprint, roleId); }

    private static Set<String> skills(AdaptiveBlueprint.Version blueprint, Optional<String> roleId) {
        return roleId.map(id -> blueprint.roles().get(id).skills().keySet())
                .orElseGet(() -> blueprint.roles().values().stream()
                        .flatMap(role -> role.skills().keySet().stream()).collect(Collectors.toUnmodifiableSet()));
    }
}
