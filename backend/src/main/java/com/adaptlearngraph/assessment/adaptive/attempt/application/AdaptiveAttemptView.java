package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptContentPort;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptStore.Progress;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** Explicit learner allowlist; internal aggregates/receipts/estimates never reach HTTP serialization. */
public final class AdaptiveAttemptView {
    private final AdaptiveAttemptContentPort content;
    public AdaptiveAttemptView(AdaptiveAttemptContentPort content) { this.content = content; }
    public View project(AdaptiveAttempt attempt, Progress progress, Instant observedAt) {
        var responses = progress.responses().stream().collect(Collectors.toMap(r -> r.position(), r -> r.selectedOptionId()));
        var items = progress.items().stream().map(presented -> {
            var item = content.read(attempt.scope(), presented.itemVersionId());
            if (!Set.copyOf(presented.optionOrder()).equals(item.options().keySet())) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            var options = presented.optionOrder().stream().map(id -> new Option(id, item.options().get(id))).toList();
            return new Presented(presented.position(), item.id(), item.prompt(), options, responses.get(presented.position()));
        }).toList();
        return new View(attempt.id(), attempt.scope().occupationId(), attempt.snapshot().blueprint().occupationNameSnapshot(),
                attempt.snapshot().purpose().name(), attempt.snapshot().roleId().orElse(null), attempt.status().name(),
                attempt.revision(), attempt.startedAt(), attempt.deadlineAt(), observedAt, !observedAt.isBefore(attempt.deadlineAt()),
                attempt.snapshot().bounds().maxQuestions(), progress.responses().size(), items,
                attempt.snapshot().blueprint().configuration().occupationBounds() != null ? AssessmentScope.OCCUPATION
                        : attempt.snapshot().roleId().isPresent() ? AssessmentScope.EARLIER_ROLE : AssessmentScope.EARLIER_OCCUPATION);
    }
}
