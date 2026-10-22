package com.adaptlearngraph.assessment.adaptive.application;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.Snapshot;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintPreviewPort.Item;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Configuration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Deterministic skill-balanced exploration sample, not simulated Employee responses or an IRT information trace. */
public final class AdaptiveBlueprintPreview {
    private final AdaptiveBlueprintPreviewPort items;

    public AdaptiveBlueprintPreview(AdaptiveBlueprintPreviewPort items) { this.items = Objects.requireNonNull(items); }

    public List<SampleItem> sample(Snapshot eligible, Configuration configuration) {
        var ids = eligible.explorationItemVersionIds();
        List<Item> candidates = items.read(eligible.scope(), ids);
        if (candidates.size() != ids.size() || !candidates.stream().map(Item::itemVersionId).collect(Collectors.toSet()).equals(ids)) {
            throw new Failure(Code.BLUEPRINT_STALE, "Preview item availability changed; retry", List.of());
        }
        var skills = new TreeMap<String, ArrayDeque<Item>>();
        candidates.stream().sorted(Comparator.comparing(item -> item.itemVersionId().toString())).forEach(item -> {
            if (eligible.roles().values().stream().filter(role -> role.itemVersionIds().contains(item.itemVersionId()))
                    .anyMatch(role -> !role.role().skills().containsKey(item.microSkillId()))) {
                throw new Failure(Code.BLUEPRINT_STALE, "Preview item mapping changed; retry", List.of());
            }
            skills.computeIfAbsent(item.microSkillId(), ignored -> new ArrayDeque<>()).add(item);
        });
        var sample = new ArrayList<SampleItem>();
        int maximum = configuration.bounds(java.util.Optional.empty()).maxQuestions();
        while (sample.size() < maximum) {
            boolean added = false;
            for (var pool : skills.values()) {
                if (!pool.isEmpty() && sample.size() < maximum) {
                    Item item = pool.removeFirst();
                    sample.add(new SampleItem(item.itemVersionId(), item.microSkillId(), item.prompt(), item.options(), SelectionReason.SKILL_COVERAGE));
                    added = true;
                }
            }
            if (!added) throw new Failure(Code.BLUEPRINT_STALE, "Preview capacity changed; retry", List.of());
        }
        return List.copyOf(sample);
    }
}
